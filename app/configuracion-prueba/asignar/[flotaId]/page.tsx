"use client";

// (Prueba, 24-11-2026) Paso 1 del asistente, Estructura y unidades, para una configuración nueva de la flota.
// Se entra desde Continuar (flota en 1/3) o desde «Añadir configuración» del menú de la flota.
// Solo se añade una configuración cada vez: una tarjeta «Configuración N» con Nº de unidades, Estructura y Guardar.
// Al guardar se confirma la estructura (no se podrá cambiar), la configuración queda en 2/3 y se pasa a Drivers.
// Si no hay estructuras disponibles, se avisa y se ofrece crear una (en Estructuras, volviendo aquí con ella elegida).

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Banner, Breadcrumb, Button, Dialog, EmptyState, Field, InfoTooltip, Loading, useSnackbar } from "@/components/ds";
import { driversIniciales, plantillasIniciales } from "@/lib/model";
import { useStore } from "@/lib/store";
import { StepperPrueba } from "@/components/configuracion-prueba/stepper";

export default function AsignarEstructuraPage() {
  const { flotaId } = useParams<{ flotaId: string }>();
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const flota = store.flotas.find((f) => f.id === flotaId);

  const [unidades, setUnidades] = useState("");
  const [estructuraId, setEstructuraId] = useState("");
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
    if (e) { setCreada(e); setEstructuraId(e); }
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
  const suyas = store.configs.filter((c) => c.flotaId === flota.id && c.guardada && c.estructuraId);
  const usadas = new Set(suyas.map((c) => c.estructuraId!));
  const catalogo = sinEstructuras ? store.estructuras.filter((e) => e.id === creada) : store.estructuras;
  const disponibles = catalogo.filter((e) => !usadas.has(e.id) && e.raiz.hijos.length > 0);
  const hayDisponibles = disponibles.length > 0;
  const elegida = store.estructura(estructuraId);

  const n = Number(unidades);
  const errUnidades = !intentado ? "" : !unidades.trim() ? "Indica el número de unidades" : !Number.isInteger(n) || n < 1 || n > 999 ? "Indica un número entero entre 1 y 999" : "";
  const errEstructura = intentado && !estructuraId ? "Elige una estructura" : "";
  const valido = hayDisponibles && !!unidades.trim() && Number.isInteger(n) && n >= 1 && n <= 999 && !!estructuraId;
  const crearEstructura = () => router.push(`/configuracion-prueba/estructuras/nueva?asignar=${flota.id}${sinEstructuras ? "&demo=sin-estructuras" : ""}`);

  const guardar = () => {
    setIntentado(true);
    if (!valido) return;
    setConfirmar(true);
  };
  const aceptar = () => {
    const est = elegida!;
    const id = store.iniciarConfig(flota.id);
    store.actualizarConfig(id, {
      estructuraId: est.id, nombre: est.nombre, descripcion: "", unidades: n,
      plantillas: plantillasIniciales(est.raiz), drivers: { ...driversIniciales(est.raiz), estructuraId: est.id },
      guardada: true, pasoActual: 3, pasoMax: 3, // se sigue en Drivers
    });
    setConfirmar(false);
    snack(`Configuración ${flota.nombre} · ${est.nombre} guardada en 2/3`);
    router.push(`/configuracion-prueba/${id}?paso=3`);
  };

  return (
    <main className="lm-page" style={{ paddingBottom: 120 }}>
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion-prueba" }, { label: flota.nombre, href: "/configuracion-prueba" }, { label: "Nueva configuración" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Nueva configuración de {flota.nombre}</h1>
        </div>
      </div>

      {/* Hasta guardar la estructura y las unidades, el resto de pasos está bloqueado */}
      <StepperPrueba actual={1} hecho={() => false} bloqueado={(x) => x !== 1} />

      <section className="lm-surface lm-surface--p24 stack gap-20">
        <h2 className="lm-title-small" style={{ margin: 0 }}>Configuración {suyas.length + 1}</h2>
        {!hayDisponibles && (
          <Banner type="attention" title="No hay estructuras disponibles"
            actions={<Button variant="text" small onClick={crearEstructura}>Crear estructura</Button>}>
            {usadas.size > 0
              ? `${flota.nombre} ya usa todas las estructuras del catálogo. Crea una nueva para esta configuración.`
              : "Crea la estructura de esta configuración. Se añadirá al catálogo y volverás aquí con ella elegida."}
          </Banner>
        )}
        <div className="row gap-20 wrap" style={{ alignItems: "flex-start" }}>
          <Field label="Nº de unidades" required htmlFor="a-unid" error={errUnidades} style={{ width: 300 }}>
            <input id="a-unid" className="lm-input" inputMode="numeric" value={unidades} placeholder="Por ejemplo: 12"
              aria-invalid={!!errUnidades} onChange={(e) => setUnidades(e.target.value.replace(/[^\d]/g, ""))} />
          </Field>
          <Field label="Estructura" required htmlFor="a-est" error={errEstructura} style={{ width: 300 }}>
            <select id="a-est" className="lm-select" value={estructuraId} disabled={!hayDisponibles}
              aria-invalid={!!errEstructura} onChange={(e) => setEstructuraId(e.target.value)}>
              <option value="">{hayDisponibles ? "Elige una estructura" : "No hay estructuras disponibles"}</option>
              {disponibles.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </Field>
          <span className="row gap-20" style={{ marginTop: "var(--lm-space-30)" }}>
            <InfoTooltip label="Información de la estructura"
              text={elegida ? `${elegida.nombre}: ${elegida.descripcion || "sin descripción"}` : "Elige la estructura de esta configuración. Una vez guardada no se podrá cambiar."} />
            <Button disabled={!hayDisponibles} onClick={guardar}>Guardar</Button>
          </span>
        </div>
      </section>

      <footer className="lm-footer-bar">
        <div className="row gap-10" style={{ maxWidth: 1360, margin: "0 auto", padding: "var(--lm-space-15) var(--lm-space-30)" }}>
          <Button variant="text" icon="close" onClick={() => router.push("/configuracion-prueba")}>Cancelar</Button>
          <span className="grow lm-body-small muted">Paso 1 de 5 · Estructura y unidades</span>
        </div>
      </footer>

      <footer className="row gap-10 wrap" style={{ marginTop: "var(--lm-space-40)", color: "var(--lm-sys-on-surface-variant)" }}>
        <span className="lm-label-medium">PROTOTIPO · Ver caso:</span>
        <button className="lm-chip" aria-pressed={!sinEstructuras} onClick={() => setSinEstructuras(false)}>Con estructuras</button>
        <button className="lm-chip" aria-pressed={sinEstructuras} onClick={() => { setSinEstructuras(true); setEstructuraId(""); setIntentado(false); }}>Sin estructuras disponibles</button>
      </footer>

      {confirmar && elegida && (
        <Dialog
          title={`¿Usar ${elegida.nombre} en esta configuración?`}
          message="Una vez confirmada, no se podrá cambiar. Si después necesitas otra estructura, tendrás que crear de nuevo la configuración."
          onClose={() => setConfirmar(false)}
          footer={<>
            <Button variant="outlined" onClick={() => setConfirmar(false)}>Cancelar</Button>
            <Button onClick={aceptar}>Aceptar</Button>
          </>} />
      )}
    </main>
  );
}
