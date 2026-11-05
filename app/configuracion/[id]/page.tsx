"use client";

// Asistente de alta inicial de una configuración (épica A, pasos 1 a 8).

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Breadcrumb, Button, Dialog, EmptyState, Icon, Loading, Tag, useSnackbar } from "@/components/ds";
import { Paso1, Paso2, Paso3, paso1Valido, type PasoProps } from "@/components/pasos-1-3";
import { Paso4 } from "@/components/pasos-4-6";
import { Paso7, Paso8 } from "@/components/pasos-7-8";
import { PASOS, smsCompleto, categoriasDe, driversIniciales, plantillasIniciales, primerNivelCargado, type Configuracion, type Flota } from "@/lib/model";
import { useStore } from "@/lib/store";

export default function AsistentePage() {
  const { id } = useParams<{ id: string }>();
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const c = store.configs.find((x) => x.id === id);
  const flota = c && store.flotas.find((f) => f.id === c.flotaId);
  const est = c ? store.estructura(c.estructuraId) : undefined;

  const [paso, setPaso] = useState<number | null>(null);
  const [intentado, setIntentado] = useState(false);
  const [salir, setSalir] = useState(false);
  const [confirmarEst, setConfirmarEst] = useState(false); // aviso al fijar la estructura (paso 1 → siguiente)

  useEffect(() => {
    if (!c || paso !== null) return;
    const q = Number(new URLSearchParams(window.location.search).get("paso"));
    const n = q >= 1 && q <= 8 ? q : c.pasoActual;
    setPaso(n === 5 ? 4 : n === 6 ? 3 : n); // los antiguos pasos 5 (Propiedades de hueco) y 6 (SMS) ya no existen
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
  const setFlota = (cambios: Partial<Flota>) => store.actualizarFlota(flota.id, cambios);
  const props: PasoProps = { c, set, intentado, est, flota, setFlota };
  const visibles = PASOS;
  const idx = visibles.findIndex((x) => x.n === p);
  const actual = visibles[idx] ?? visibles[0];
  const siguiente = visibles[idx + 1];
  const anterior = visibles[idx - 1];
  const soloLectura = c.estado === "activa";
  const hermanas = c.guardada ? store.configs.filter((x) => x.flotaId === c.flotaId && x.id !== c.id && x.guardada && x.estado !== "activa") : [];
  const raiz = est?.raiz;

  const v1 = paso1Valido(c, est);
  // Los pasos siguientes dependen de la estructura: solo se puede ir a ellos una vez confirmada (al pasar del paso 1).
  const estructuraFijada = c.pasoMax > 1;
  const alcanzable = (n: number) => n === 1 || (v1 && c.guardada && estructuraFijada);
  const valido = (n: number) => (n === 1 ? v1 : n === 3 ? !!c.drivers && smsCompleto(c) : n === 7 || n === 8 ? primerNivelCargado(c, raiz) : true);

  const irA = (n: number, forzar = false) => {
    if (!forzar && !alcanzable(n)) return;
    const cambios: Partial<Configuracion> = { pasoActual: n, pasoMax: Math.max(c.pasoMax, n) };
    if (n === 7 && raiz && !Object.keys(c.plantillas).length) cambios.plantillas = plantillasIniciales(raiz);
    set(cambios);
    setPaso(n);
    setIntentado(false);
    window.history.replaceState(null, "", `/configuracion/${c.id}?paso=${n}`);
    window.scrollTo({ top: 0 });
  };

  const avanzar = (confirmado = false) => {
    setIntentado(true);
    if (!valido(p)) return;
    if (p === 1 && !estructuraFijada && !confirmado) { setConfirmarEst(true); return; }
    setConfirmarEst(false);
    if (p === 1 && raiz) {
      // Si se cambia de estructura, las plantillas se recalculan para sus categorías.
      const nuevas = plantillasIniciales(raiz);
      Object.keys(nuevas).forEach((k) => { if (c.plantillas[k]) nuevas[k] = c.plantillas[k]; });
      // Los drivers son de esta configuración y de su estructura: si cambia la estructura, se parte de los de por defecto.
      set({
        plantillas: nuevas,
        ...(!c.drivers || c.drivers.estructuraId !== est?.id ? { drivers: { ...driversIniciales(raiz), estructuraId: est!.id } } : {}),
      });
    }
    if (p === 1 && c.guardada && est?.borradorDe) store.actualizarConfig(c.id, { guardada: true }); // la estructura nueva pasa al catálogo
    if (p === 1 && !c.guardada) {
      store.actualizarConfig(c.id, { guardada: true });
      snack(`Configuración "${c.nombre}" guardada como En configuración`);
    }
    if (c.pasosOmitidos.includes(p)) set({ pasosOmitidos: c.pasosOmitidos.filter((x) => x !== p) });
    // Tras validar el paso actual, el siguiente es alcanzable aunque el estado aún no se haya refrescado.
    if (siguiente) irA(siguiente.n, true);
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
  const pendientesActiva = soloLectura && raiz ? categoriasDe(raiz).some((x) => c.plantillas[x.categoria] !== "cargada") : false;

  return (
    <main className="lm-page" style={{ paddingBottom: 120 }}>
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion" }, { label: flota.nombre, href: "/configuracion" }, { label: c.nombre || "Nueva configuración" }]} />
          <span className="row gap-15">
            <h1 className="lm-headline-small" style={{ margin: 0 }}>{c.nombre || "Nueva configuración"}</h1>
            {c.guardada && (soloLectura ? <Tag tone="success">Activa</Tag> : <Tag tone="attention">En configuración</Tag>)}
          </span>
        </div>
        <div className="lm-header__actions">
          {soloLectura && <Button variant="outlined" icon="arrow_back_ios_new" onClick={() => router.push("/configuracion")}>Volver al listado</Button>}
        </div>
      </div>

      {!soloLectura && hermanas.length > 0 && (
        <div className="row gap-10 wrap" style={{ marginBottom: "var(--lm-space-15)" }}>
          <span className="lm-body-small muted">Otras configuraciones de {flota.nombre} en configuración:</span>
          {hermanas.map((x) => (
            <a key={x.id} className="lm-btn lm-btn--outlined lm-btn--small" href={`/configuracion/${x.id}`}>{x.nombre}</a>
          ))}
        </div>
      )}

      {soloLectura && est ? (
        <div className="stack gap-30">
          <Paso8 c={c} flota={flota} est={est} irA={irA} soloLectura />
          {pendientesActiva && <Paso7 {...props} />}
        </div>
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
                      </span>
                    </button>
                    {i < visibles.length - 1 && <span className="lm-stepper__line" />}
                  </li>
                );
              })}
            </ol>
          </nav>

          {p === 1 && <Paso1 {...props} />}
          {p === 2 && est && <Paso2 {...props} />}
          {p === 3 && est && <Paso3 {...props} />}
          {p === 4 && est && <Paso4 {...props} />}
          {p === 7 && est && <Paso7 {...props} />}
          {p === 8 && est && <Paso8 c={c} flota={flota} est={est} irA={irA} />}

          <footer className="lm-footer-bar">
            <div className="row gap-10" style={{ maxWidth: 1360, margin: "0 auto", padding: "var(--lm-space-15) var(--lm-space-30)" }}>
              <Button variant="text" icon={c.guardada ? undefined : "close"} onClick={guardarYSalir}>{c.guardada ? "Guardar y salir" : "Cancelar"}</Button>
              <span className="grow lm-body-small muted">
                Paso {idx + 1} de {visibles.length} · {actual.titulo}
                {intentado && !valido(p) && <span style={{ color: "var(--lm-sys-error)" }}> · Revisa los campos marcados</span>}
              </span>
              {anterior && <Button variant="outlined" onClick={() => irA(anterior.n)}>Anterior</Button>}
              {p === 8
                ? <Button icon="check" disabled={!primerNivelCargado(c, raiz)} onClick={finalizar}>Finalizar configuración</Button>
                : <Button onClick={() => avanzar()}>Siguiente</Button>}
            </div>
          </footer>
        </>
      )}

      {confirmarEst && est && (
        <Dialog title={`¿Usar ${est.nombre} en esta configuración?`} onClose={() => setConfirmarEst(false)}
          message={`Los pasos siguientes (valores de propiedades de hueco, drivers, propiedades de categoría y carga de datos) se basan en la estructura ${est.nombre}. Una vez confirmada, no se podrá cambiar. Si después necesitas otra estructura, tendrás que crear de nuevo la configuración.`}
          footer={<>
            <Button variant="outlined" onClick={() => setConfirmarEst(false)}>Revisar estructura</Button>
            <Button onClick={() => avanzar(true)}>Confirmar y continuar</Button>
          </>} />
      )}

      {salir && (
        <Dialog title="¿Salir sin guardar?" onClose={() => setSalir(false)}
          message="La configuración se guarda al completar el paso Estructura y unidades. Si sales ahora, se perderá lo que has hecho."
          footer={<>
            <Button variant="outlined" onClick={() => setSalir(false)}>Seguir configurando</Button>
            <Button variant="danger" onClick={() => { store.descartarConfig(c.id); router.push("/configuracion"); }}>Salir sin guardar</Button>
          </>} />
      )}
    </main>
  );
}
