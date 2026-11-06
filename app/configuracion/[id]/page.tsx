"use client";

// Asistente de alta inicial de una configuración (épica A, pasos 1 a 8).
// Con una configuración activa: Consultar (solo lectura) o Añadir unidad (?modo=anadir: solo el nº de unidades y la
// carga de datos, con la plantilla de unidades obligatoria; los cambios son un borrador y solo se guardan al terminar).

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Banner, Breadcrumb, Button, Dialog, EmptyState, Icon, Loading, Tag, useSnackbar } from "@/components/ds";
import { Paso1, Paso2, Paso3, paso1Valido, type PasoProps } from "@/components/pasos-1-3";
import { Paso4 } from "@/components/pasos-4-6";
import { Paso7, Paso8 } from "@/components/pasos-7-8";
import { PASOS, categoriasDe, driversIniciales, plantillasIniciales, primerNivelCargado, type Configuracion, type Flota } from "@/lib/model";
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
  const [modoAnadir, setModoAnadir] = useState(false);
  // Borrador al añadir unidades: no se guarda nada hasta pulsar Añadir unidades en el resumen.
  const [borr, setBorr] = useState<Pick<Configuracion, "unidades" | "plantillas" | "intentosPlantilla"> | null>(null);
  const [salirAnadir, setSalirAnadir] = useState(false);

  useEffect(() => {
    if (!c || paso !== null) return;
    const qs = new URLSearchParams(window.location.search);
    const q = Number(qs.get("paso"));
    if (qs.get("modo") === "anadir" && c.estado === "activa" && est) {
      setModoAnadir(true);
      // Las unidades nuevas obligan a cargar de nuevo la plantilla de unidades (primer nivel).
      setBorr({ unidades: c.unidades, plantillas: { ...c.plantillas, [est.raiz.categoria]: "pendiente" }, intentosPlantilla: { ...c.intentosPlantilla } });
    }
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
  const raiz = est?.raiz;
  const anadir = modoAnadir && borr ? { antes: c.unidades ?? 0 } : undefined;
  const cv: Configuracion = anadir ? { ...c, ...borr! } : c; // lo que ven los pasos
  const set = (cambios: Partial<Configuracion>) => {
    if (!anadir) { store.actualizarConfig(c.id, cambios); return; }
    const { unidades, plantillas, intentosPlantilla } = cambios; // al añadir unidades solo cambian estos datos, en el borrador
    setBorr((b) => ({ ...b!, ...(unidades !== undefined && { unidades }), ...(plantillas && { plantillas }), ...(intentosPlantilla && { intentosPlantilla }) }));
  };
  const setFlota = (cambios: Partial<Flota>) => store.actualizarFlota(flota.id, cambios);
  const soloLectura = c.estado === "activa"; // Consultar: el asistente entero, sin poder modificar nada
  const props: PasoProps = { c: cv, set, intentado, est, flota, setFlota, soloLectura, anadir };
  const unidadesOk = !anadir || (cv.unidades ?? 0) > anadir.antes;
  const listoAnadir = !!anadir && unidadesOk && primerNivelCargado(cv, raiz);
  const hayCambiosAnadir = !!anadir && (cv.unidades !== c.unidades || JSON.stringify(cv.plantillas) !== JSON.stringify({ ...c.plantillas, [raiz?.categoria ?? ""]: "pendiente" }));
  const qsModo = anadir ? "&modo=anadir" : "";
  const visibles = PASOS;
  const idx = visibles.findIndex((x) => x.n === p);
  const actual = visibles[idx] ?? visibles[0];
  const siguiente = visibles[idx + 1];
  const anterior = visibles[idx - 1];
  const hermanas = c.guardada ? store.configs.filter((x) => x.flotaId === c.flotaId && x.id !== c.id && x.guardada && x.estado !== "activa") : [];

  const v1 = paso1Valido(c, est);
  // Los pasos siguientes dependen de la estructura: solo se puede ir a ellos una vez confirmada (al pasar del paso 1).
  const estructuraFijada = c.pasoMax > 1;
  const alcanzable = (n: number) => soloLectura || n === 1 || (v1 && c.guardada && estructuraFijada);
  const valido = (n: number) => (n === 1 ? v1 : n === 3 ? !!c.drivers : n === 7 || n === 8 ? primerNivelCargado(c, raiz) : true);

  const irA = (n: number, forzar = false) => {
    if (!forzar && !alcanzable(n)) return;
    if (soloLectura) { // en consulta solo se navega: no se guarda nada
      setPaso(n);
      setIntentado(false);
      window.history.replaceState(null, "", `/configuracion/${c.id}?paso=${n}${qsModo}`);
      window.scrollTo({ top: 0 });
      return;
    }
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
  const guardarAnadir = () => {
    if (!anadir || !listoAnadir) return;
    const n = (cv.unidades ?? 0) - anadir.antes;
    store.actualizarConfig(c.id, { unidades: cv.unidades, plantillas: cv.plantillas, intentosPlantilla: cv.intentosPlantilla });
    snack(`${n} unidades añadidas a ${store.etiqueta(c)}: ahora tiene ${cv.unidades}`);
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
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion" }, { label: flota.nombre, href: "/configuracion" }, { label: c.nombre || "Nueva configuración" }]} />
          <span className="row gap-15">
            <h1 className="lm-headline-small" style={{ margin: 0 }}>{c.nombre || "Nueva configuración"}</h1>
            {c.guardada && (soloLectura ? <Tag tone="success">Activa</Tag> : <Tag tone="attention">En configuración</Tag>)}
          </span>
        </div>
        <div className="lm-header__actions">
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

      {soloLectura && (
        <div style={{ marginBottom: "var(--lm-space-20)" }}>
          {anadir ? (
            <Banner type="info" title={`Estás añadiendo unidades a ${store.etiqueta(c)}`}>
              Solo puedes cambiar el número de unidades (paso 1) y cargar las plantillas (paso 5). La plantilla de unidades es obligatoria. Los cambios se guardan al pulsar Añadir unidades en el resumen: si sales antes, no se guarda nada.
            </Banner>
          ) : (
            <Banner type="info" title="Estás consultando una configuración activa">
              Puedes recorrer todos sus pasos y ver sus datos, pero no modificar nada.
            </Banner>
          )}
        </div>
      )}

      {(
        <>
          <nav aria-label="Pasos de la configuración" className="lm-surface" style={{ marginBottom: "var(--lm-space-20)" }}>
            <ol className="lm-stepper" style={{ listStyle: "none", margin: 0 }}>
              {visibles.map((x, i) => {
                const omit = c.pasosOmitidos.includes(x.n);
                const hecho = !omit && x.n !== p && (anadir
                  ? (x.n === 1 ? unidadesOk : x.n === 7 ? primerNivelCargado(cv, raiz) : x.n !== 8)
                  : soloLectura || (x.n < c.pasoMax && valido(x.n)));
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
          {p === 8 && est && <Paso8 c={cv} flota={flota} est={est} irA={irA} soloLectura={soloLectura} anadir={anadir} />}

          <footer className="lm-footer-bar">
            <div className="row gap-10" style={{ maxWidth: 1360, margin: "0 auto", padding: "var(--lm-space-15) var(--lm-space-30)" }}>
              {anadir
                ? <Button variant="text" icon="close" onClick={() => (hayCambiosAnadir ? setSalirAnadir(true) : router.push("/configuracion"))}>Cancelar</Button>
                : soloLectura
                ? <Button variant="text" icon="arrow_back_ios_new" onClick={() => router.push("/configuracion")}>Volver al listado</Button>
                : <Button variant="text" icon={c.guardada ? undefined : "close"} onClick={guardarYSalir}>{c.guardada ? "Guardar y salir" : "Cancelar"}</Button>}
              <span className="grow lm-body-small muted">
                Paso {idx + 1} de {visibles.length} · {actual.titulo}
                {anadir ? " · Añadir unidades" : soloLectura && " · Solo consulta"}
                {anadir && intentado && p === 1 && !unidadesOk && <span style={{ color: "var(--lm-sys-error)" }}> · Revisa el número de unidades</span>}
                {intentado && !valido(p) && <span style={{ color: "var(--lm-sys-error)" }}> · Revisa los campos marcados</span>}
              </span>
              {anterior && <Button variant="outlined" onClick={() => irA(anterior.n)}>Anterior</Button>}
              {anadir
                ? p === 8
                  ? <Button icon="check" disabled={!listoAnadir} onClick={guardarAnadir}>Añadir {(cv.unidades ?? 0) - anadir.antes > 0 ? (cv.unidades ?? 0) - anadir.antes : ""} unidades</Button>
                  : <Button onClick={() => { if (p === 1 && !unidadesOk) { setIntentado(true); return; } irA(siguiente!.n); }}>Siguiente</Button>
                : soloLectura
                ? siguiente && <Button onClick={() => irA(siguiente.n)}>Siguiente</Button>
                : p === 8
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

      {salirAnadir && anadir && (
        <Dialog title="¿Salir sin añadir unidades?" onClose={() => setSalirAnadir(false)}
          message={`No se guardará ningún cambio: ${store.etiqueta(c)} seguirá con sus ${anadir.antes} unidades y sus plantillas como estaban.`}
          footer={<>
            <Button variant="outlined" onClick={() => setSalirAnadir(false)}>Seguir añadiendo</Button>
            <Button variant="danger" onClick={() => router.push("/configuracion")}>Salir sin guardar</Button>
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
