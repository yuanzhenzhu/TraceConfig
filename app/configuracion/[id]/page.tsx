"use client";

// Asistente de alta inicial de una configuración (épica A, pasos 1 a 8).

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Breadcrumb, Button, Dialog, EmptyState, Icon, Loading, Tag, useSnackbar } from "@/components/ds";
import { Paso1, Paso2, Paso3, paso1Valido } from "@/components/pasos-1-3";
import { Paso4, Paso5, Paso6 } from "@/components/pasos-4-6";
import { Paso7, Paso8 } from "@/components/pasos-7-8";
import { PASOS, driversPorDefecto, plantillasIniciales, primerNivelCargado, type Configuracion } from "@/lib/model";
import { useStore } from "@/lib/store";

export default function AsistentePage() {
  const { id } = useParams<{ id: string }>();
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const c = store.configs.find((x) => x.id === id);
  const flota = c && store.flotas.find((f) => f.id === c.flotaId);

  const [paso, setPaso] = useState<number | null>(null);
  const [intentado, setIntentado] = useState(false);
  const [salir, setSalir] = useState(false);

  useEffect(() => {
    if (!c || paso !== null) return;
    const q = Number(new URLSearchParams(window.location.search).get("paso"));
    setPaso(q >= 1 && q <= 8 ? q : c.pasoActual);
  }, [c, paso]);

  if (!store.listo || (c && paso === null)) return <main className="lm-page"><Loading text="Cargando configuración" /></main>;
  if (!c || !flota) {
    return (
      <main className="lm-page">
        <EmptyState icon="search_off" title="No se ha encontrado la configuración" text="Puede que se haya descartado o que el enlace no sea correcto"
          action={<Button onClick={() => router.push("/configuracion")}>Volver al listado</Button>} />
      </main>
    );
  }

  const p = paso!;
  const set = (cambios: Partial<Configuracion>) => store.actualizarConfig(c.id, cambios);
  const visibles = PASOS.filter((x) => x.n !== 6 || flota.usaSms);
  const idx = visibles.findIndex((x) => x.n === p);
  const actual = visibles[idx] ?? visibles[0];
  const siguiente = visibles[idx + 1];
  const anterior = visibles[idx - 1];
  const soloLectura = c.estado === "activa";

  const v1 = paso1Valido(c);
  const v2 = !!c.unidades && c.guardada;
  const alcanzable = (n: number) => n === 1 || (n === 2 ? v1 : v1 && v2);
  const valido = (n: number) => (n === 1 ? v1 : n === 2 ? !!c.unidades : n === 7 || n === 8 ? primerNivelCargado(c) : true);

  const irA = (n: number, forzar = false) => {
    if (!forzar && !alcanzable(n)) return;
    const cambios: Partial<Configuracion> = { pasoActual: n, pasoMax: Math.max(c.pasoMax, n) };
    if (n === 3 && !Object.keys(c.drivers).length && c.estructura) cambios.drivers = driversPorDefecto(c.estructura.raiz);
    if (n === 7 && c.estructura && !Object.keys(c.plantillas).length) cambios.plantillas = plantillasIniciales(c.estructura.raiz);
    set(cambios);
    setPaso(n);
    setIntentado(false);
    window.history.replaceState(null, "", `/configuracion/${c.id}?paso=${n}`);
    window.scrollTo({ top: 0 });
  };

  const avanzar = () => {
    setIntentado(true);
    if (!valido(p)) return;
    if (p === 1 && c.estructura) {
      // Si la estructura cambia, las plantillas se recalculan para sus categorías.
      const nuevas = plantillasIniciales(c.estructura.raiz);
      Object.keys(nuevas).forEach((k) => { if (c.plantillas[k]) nuevas[k] = c.plantillas[k]; });
      set({ plantillas: nuevas });
    }
    if (p === 2 && !c.guardada) {
      store.actualizarConfig(c.id, { guardada: true });
      snack(`Configuración "${c.nombre}" guardada como En configuración`);
    }
    if (p === 6 && !c.sms) set({ sms: { ambito: "flota", driver: "km", calculo: "real" } }); // los valores por defecto que muestra el paso
    if (c.pasosOmitidos.includes(p)) set({ pasosOmitidos: c.pasosOmitidos.filter((x) => x !== p) });
    // Tras validar el paso actual, el siguiente es alcanzable aunque el estado aún no se haya refrescado.
    if (siguiente) irA(siguiente.n, true);
  };
  const omitir = () => {
    if (!c.pasosOmitidos.includes(p)) set({ pasosOmitidos: [...c.pasosOmitidos, p] });
    if (siguiente) irA(siguiente.n);
  };
  const finalizar = () => {
    set({ estado: "activa", pasoActual: 8 });
    snack(`Configuración "${c.nombre}" finalizada: sus ${c.unidades} unidades ya están activas`);
    router.push("/configuracion");
  };
  const guardarYSalir = () => {
    if (!c.guardada) { setSalir(true); return; }
    snack(`Configuración "${c.nombre}" guardada`);
    router.push("/configuracion");
  };

  return (
    <main className="lm-page" style={{ paddingBottom: 120 }}>
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion" }, { label: `${flota.codigo} · ${flota.nombre}`, href: "/configuracion" }, { label: c.nombre || "Nueva configuración" }]} />
          <span className="row gap-15">
            <h1 className="lm-headline-small" style={{ margin: 0 }}>{c.nombre || "Nueva configuración"}</h1>
            {c.guardada && (soloLectura ? <Tag tone="success">Activa</Tag> : <Tag tone="attention">En configuración</Tag>)}
          </span>
        </div>
        <div className="lm-header__actions">
          {soloLectura && <Button variant="outlined" icon="arrow_back_ios_new" onClick={() => router.push("/configuracion")}>Volver al listado</Button>}
        </div>
      </div>

      {soloLectura ? (
        <Paso8 c={c} flota={flota} irA={irA} soloLectura />
      ) : (
        <>
          <nav aria-label="Pasos de la configuración" className="lm-surface" style={{ marginBottom: "var(--lm-space-20)" }}>
            <ol className="lm-stepper" style={{ listStyle: "none", margin: 0 }}>
              {visibles.map((x, i) => {
                const omit = c.pasosOmitidos.includes(x.n);
                const hecho = !omit && x.n !== p && x.n < c.pasoMax && valido(x.n);
                const cls = x.n === p ? "is-current" : omit ? "is-skipped" : hecho ? "is-done" : "";
                return (
                  <li key={x.n} className="row gap-10" style={{ flex: i < visibles.length - 1 ? 1 : undefined }}>
                    <button className={`lm-step ${cls}`} disabled={!alcanzable(x.n)} aria-current={x.n === p ? "step" : undefined} onClick={() => irA(x.n)}>
                      <span className="lm-step__dot">{hecho ? <Icon name="check" /> : omit ? <Icon name="remove" /> : i + 1}</span>
                      <span className="lm-step__label">
                        <span>{x.titulo}</span>
                        <small>{omit ? "Omitido" : x.obligatorio ? "Obligatorio" : "Opcional"}</small>
                      </span>
                    </button>
                    {i < visibles.length - 1 && <span className="lm-stepper__line" />}
                  </li>
                );
              })}
            </ol>
          </nav>

          {p === 1 && <Paso1 c={c} set={set} intentado={intentado} />}
          {p === 2 && <Paso2 c={c} set={set} intentado={intentado} />}
          {p === 3 && <Paso3 c={c} set={set} intentado={intentado} />}
          {p === 4 && <Paso4 c={c} set={set} intentado={intentado} />}
          {p === 5 && <Paso5 c={c} set={set} intentado={intentado} />}
          {p === 6 && <Paso6 c={c} set={set} intentado={intentado} flota={flota} />}
          {p === 7 && <Paso7 c={c} set={set} intentado={intentado} />}
          {p === 8 && <Paso8 c={c} flota={flota} irA={irA} />}

          <footer style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 15, background: "var(--lm-sys-surface-container-lowest)", boxShadow: "var(--lm-elevation-2)" }}>
            <div className="row gap-10" style={{ maxWidth: 1360, margin: "0 auto", padding: "var(--lm-space-15) var(--lm-space-30)" }}>
              <Button variant="text" icon={c.guardada ? undefined : "close"} onClick={guardarYSalir}>{c.guardada ? "Guardar y salir" : "Cancelar"}</Button>
              <span className="grow lm-body-small muted">
                Paso {idx + 1} de {visibles.length} · {actual.titulo}
                {intentado && !valido(p) && <span style={{ color: "var(--lm-sys-error)" }}> · Revisa los campos marcados</span>}
              </span>
              {anterior && <Button variant="outlined" onClick={() => irA(anterior.n)}>Anterior</Button>}
              {!actual.obligatorio && siguiente && <Button variant="text" onClick={omitir}>Omitir paso</Button>}
              {p === 8
                ? <Button icon="check" disabled={!primerNivelCargado(c)} onClick={finalizar}>Finalizar configuración</Button>
                : <Button onClick={avanzar}>Siguiente</Button>}
            </div>
          </footer>
        </>
      )}

      {salir && (
        <Dialog title="¿Salir sin guardar?" onClose={() => setSalir(false)}
          message="La configuración se guarda al completar el paso Unidades. Si sales ahora, se perderá lo que has hecho."
          footer={<>
            <Button variant="outlined" onClick={() => setSalir(false)}>Seguir configurando</Button>
            <Button variant="danger" onClick={() => { store.descartarConfig(c.id); router.push("/configuracion"); }}>Salir sin guardar</Button>
          </>} />
      )}
    </main>
  );
}
