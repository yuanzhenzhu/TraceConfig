"use client";

// (Prueba, 18-11-2026) Asignar estructura a una flota: se entra desde «Asignar estructura» (flota sin estructura)
// o desde «Añadir configuración» del menú de la flota. Cada configuración es una estructura y su nº de unidades.
// Al guardar se confirma la estructura (no se podrá cambiar). Con una sola configuración se entra en su asistente;
// con varias se vuelve al listado, donde cada una se continúa por separado.
// Si no hay estructuras disponibles, se avisa y se ofrece crear una (en Estructuras, volviendo aquí con ella elegida).

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Banner, Breadcrumb, Button, Dialog, EmptyState, Field, IconButton, Loading, useSnackbar } from "@/components/ds";
import { driversIniciales, plantillasIniciales } from "@/lib/model";
import { useStore } from "@/lib/store";

type Fila = { unidades: string; estructuraId: string };
const filaVacia = (): Fila => ({ unidades: "", estructuraId: "" });
const ORDINALES = ["Primera", "Segunda", "Tercera", "Cuarta", "Quinta", "Sexta", "Séptima", "Octava", "Novena", "Décima"];
const ordinal = (i: number) => (ORDINALES[i] ? `${ORDINALES[i]} configuración` : `Configuración ${i + 1}`);

export default function AsignarEstructuraPage() {
  const { flotaId } = useParams<{ flotaId: string }>();
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const flota = store.flotas.find((f) => f.id === flotaId);

  const [filas, setFilas] = useState<Fila[]>([filaVacia()]);
  const [intentado, setIntentado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  // Prototipo: ver el caso «no hay estructuras disponibles» sin vaciar el catálogo (?demo=sin-estructuras)
  const [sinEstructuras, setSinEstructuras] = useState(false);
  // Estructura recién creada desde aquí (vuelve de Estructuras con ?estructura=<id>)
  const [creada, setCreada] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("demo") === "sin-estructuras") setSinEstructuras(true);
    const e = q.get("estructura");
    if (e) { setCreada(e); setFilas([{ ...filaVacia(), estructuraId: e }]); }
  }, []);

  if (!store.listo) return <main className="lm-page"><Loading text="Cargando flota" /></main>;
  if (!flota) {
    return (
      <main className="lm-page">
        <EmptyState icon="search_off" title="No se ha encontrado la flota" text="Puede que se haya eliminado o que el enlace no sea correcto"
          action={<Button onClick={() => router.push("/configuracion-prueba")}>Volver al listado</Button>} />
      </main>
    );
  }

  // Una flota no repite estructura: fuera las que ya usan sus configuraciones.
  const usadas = new Set(store.configs.filter((c) => c.flotaId === flota.id && c.guardada && c.estructuraId).map((c) => c.estructuraId!));
  const catalogo = sinEstructuras ? store.estructuras.filter((e) => e.id === creada) : store.estructuras;
  const disponibles = catalogo.filter((e) => !usadas.has(e.id) && e.raiz.hijos.length > 0);
  const hayDisponibles = disponibles.length > 0;
  const primera = usadas.size === 0;

  const errores = filas.map((f) => {
    const n = Number(f.unidades);
    return {
      unidades: !f.unidades.trim() ? "Indica el número de unidades" : !Number.isInteger(n) || n < 1 || n > 999 ? "Indica un número entero entre 1 y 999" : "",
      estructura: !f.estructuraId ? "Elige una estructura" : "",
    };
  });
  const valido = hayDisponibles && errores.every((e) => !e.unidades && !e.estructura);
  const upd = (i: number, x: Partial<Fila>) => setFilas(filas.map((f, j) => (j === i ? { ...f, ...x } : f)));
  const elegidas = filas.map((f) => store.estructura(f.estructuraId)).filter((e) => !!e);
  const crearEstructura = () => router.push(`/configuracion-prueba/estructuras/nueva?asignar=${flota.id}${sinEstructuras ? "&demo=sin-estructuras" : ""}`);

  const guardar = () => {
    setIntentado(true);
    if (!valido) return;
    setConfirmar(true);
  };
  const aceptar = () => {
    const ids = filas.map((f) => {
      const est = store.estructura(f.estructuraId)!;
      const id = store.iniciarConfig(flota.id);
      store.actualizarConfig(id, {
        estructuraId: est.id, nombre: est.nombre, descripcion: "", unidades: Number(f.unidades),
        plantillas: plantillasIniciales(est.raiz), drivers: { ...driversIniciales(est.raiz), estructuraId: est.id },
        guardada: true, pasoActual: 4, pasoMax: 4, // el asistente empieza en Propiedades de categoría
      });
      return id;
    });
    setConfirmar(false);
    snack(ids.length === 1
      ? `Configuración ${flota.nombre} · ${elegidas[0]!.nombre} guardada con el estado Sin plantillas`
      : `${ids.length} configuraciones de ${flota.nombre} guardadas con el estado Sin plantillas. Continúa cada una desde el listado`);
    // Una sola: se sigue en su asistente. Varias: se vuelve al listado y cada una se continúa desde allí.
    router.push(ids.length === 1 ? `/configuracion-prueba/${ids[0]}` : "/configuracion-prueba");
  };

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion-prueba" }, { label: flota.nombre }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Asignar estructura a {flota.nombre}</h1>
        </div>
        <div className="lm-header__actions">
          <Button variant="outlined" onClick={() => router.push("/configuracion-prueba")}>Cancelar</Button>
          <Button disabled={!hayDisponibles} onClick={guardar}>Guardar</Button>
        </div>
      </div>

      <div className="stack gap-15">
        {filas.map((f, i) => {
          const err = intentado ? errores[i] : { unidades: "", estructura: "" };
          // En cada fila, fuera las estructuras elegidas en las otras
          const enOtras = new Set(filas.filter((_, j) => j !== i).map((x) => x.estructuraId));
          return (
            <section key={i} className="lm-surface lm-surface--p16 stack gap-15">
              <div className="row gap-10">
                <h2 className="lm-title-small grow" style={{ margin: 0 }}>
                  {filas.length === 1 && !primera ? "Nueva configuración" : ordinal(i)}
                </h2>
                {i > 0 && <IconButton icon="delete" label={`Quitar la ${ordinal(i).toLowerCase()}`} onClick={() => setFilas(filas.filter((_, j) => j !== i))} />}
              </div>
              {i === 0 && !hayDisponibles && (
                <Banner type="attention" title="No hay estructuras disponibles"
                  actions={<Button variant="text" small onClick={crearEstructura}>Crear estructura</Button>}>
                  {usadas.size > 0
                    ? `${flota.nombre} ya usa todas las estructuras del catálogo. Crea una nueva para esta configuración.`
                    : "Crea la estructura de esta configuración. Se añadirá al catálogo y volverás aquí con ella elegida."}
                </Banner>
              )}
              <div className="row gap-20 wrap" style={{ alignItems: "flex-start" }}>
                <Field label="Número de unidades" required htmlFor={`a-unid-${i}`} error={err.unidades} style={{ width: 280 }}>
                  <input id={`a-unid-${i}`} className="lm-input" inputMode="numeric" value={f.unidades} placeholder="Por ejemplo: 12"
                    aria-invalid={!!err.unidades} onChange={(e) => upd(i, { unidades: e.target.value.replace(/[^\d]/g, "") })} />
                </Field>
                <Field label="Estructura" required htmlFor={`a-est-${i}`} error={err.estructura} style={{ width: 280 }}>
                  <select id={`a-est-${i}`} className="lm-select" value={f.estructuraId} disabled={!hayDisponibles}
                    aria-invalid={!!err.estructura} onChange={(e) => upd(i, { estructuraId: e.target.value })}>
                    <option value="">{hayDisponibles ? "Elige una estructura" : "No hay estructuras disponibles"}</option>
                    {disponibles.map((e) => (
                      <option key={e.id} value={e.id} disabled={enOtras.has(e.id)}>
                        {e.nombre} · {e.descripcion}{enOtras.has(e.id) ? " (elegida en otra configuración)" : ""}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </section>
          );
        })}

        <section className="lm-surface lm-surface--p16">
          <Button variant="text" icon="add" disabled={!hayDisponibles || filas.length >= disponibles.length}
            onClick={() => setFilas([...filas, filaVacia()])}>Añadir configuración</Button>
        </section>
      </div>

      <footer className="row gap-10 wrap" style={{ marginTop: "var(--lm-space-40)", color: "var(--lm-sys-on-surface-variant)" }}>
        <span className="lm-label-medium">PROTOTIPO · Ver caso:</span>
        <button className="lm-chip" aria-pressed={!sinEstructuras} onClick={() => setSinEstructuras(false)}>Con estructuras</button>
        <button className="lm-chip" aria-pressed={sinEstructuras} onClick={() => { setSinEstructuras(true); setFilas([filaVacia()]); setIntentado(false); }}>Sin estructuras disponibles</button>
      </footer>

      {confirmar && (
        <Dialog
          title={elegidas.length === 1 ? `¿Usar ${elegidas[0]!.nombre} en esta configuración?` : `¿Usar estas ${elegidas.length} estructuras?`}
          message={elegidas.length === 1
            ? "Una vez confirmada, no se podrá cambiar. Si después necesitas otra estructura, tendrás que crear de nuevo la configuración."
            : `${elegidas.map((e) => e!.nombre).join(", ")}. Una vez confirmadas, no se podrán cambiar. Si después necesitas otra estructura, tendrás que crear de nuevo la configuración.`}
          onClose={() => setConfirmar(false)}
          footer={<>
            <Button variant="outlined" onClick={() => setConfirmar(false)}>Cancelar</Button>
            <Button onClick={aceptar}>Aceptar</Button>
          </>} />
      )}
    </main>
  );
}
