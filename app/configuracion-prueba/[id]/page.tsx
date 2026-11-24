"use client";

// Asistente de alta inicial de una configuración (épica A, pasos 1 a 8).
// Con una configuración activa: Consultar (solo lectura) o Añadir unidad (?modo=anadir: solo el nº de unidades y la
// carga de datos, con la plantilla de unidades obligatoria; los cambios son un borrador y solo se guardan al terminar).

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Banner, Breadcrumb, Button, Dialog, EmptyState, Loading, Tag, useSnackbar } from "@/components/ds";
import { Paso2, Paso3, paso1Valido, type PasoProps } from "@/components/configuracion-prueba/pasos-1-3";
import { Paso4 } from "@/components/configuracion-prueba/pasos-4-6";
import { Paso7 } from "@/components/configuracion-prueba/pasos-7-8";
import { PASOS_PRUEBA, StepperPrueba } from "@/components/configuracion-prueba/stepper";
import { TarjetaConfiguracion } from "@/components/configuracion-prueba/tarjeta-configuracion";
import { plantillasIniciales, type Configuracion, type Flota } from "@/lib/model";
import { todasCargadas } from "@/components/configuracion-prueba/plantillas";
import { useStore } from "@/lib/store";
import { etiquetaCfg, nombreEstructura } from "@/components/configuracion-prueba/nombre";

// (Prueba, 24-11-2026) Pasos: Estructura y unidades, Drivers, Propiedades hueco, Propiedades categoría
// y Plantillas. El paso 1 de una configuración nueva está en Asignar estructura (una configuración cada vez).
// Sin Resumen: se finaliza (o se añaden las unidades) en Plantillas.
/** Orden de un paso en el asistente (los números de paso no van en orden). */
const orden = (n: number) => PASOS_PRUEBA.map((x) => x.n).indexOf(n);

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
  const [modoAnadir, setModoAnadir] = useState(false);
  // Borrador al añadir unidades: no se guarda nada hasta pulsar Añadir unidades en el resumen.
  const [borr, setBorr] = useState<Pick<Configuracion, "unidades" | "plantillas" | "intentosPlantilla"> | null>(null);
  const [salirAnadir, setSalirAnadir] = useState(false);
  // (Prueba, 24-11-2026) Pasos 2, 3 y 4 con Cancelar y Guardar: al entrar se guarda una copia para poder descartar los cambios.
  const [copia, setCopia] = useState<{ paso: number; drivers: Configuracion["drivers"]; valoresHueco: Configuracion["valoresHueco"]; propsCategoria: typeof store.propsCategoria } | null>(null);
  useEffect(() => {
    if (!c || paso === null || ![2, 3, 4].includes(paso) || copia?.paso === paso) return;
    setCopia({ paso, drivers: structuredClone(c.drivers), valoresHueco: structuredClone(c.valoresHueco), propsCategoria: structuredClone(store.propsCategoria) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paso, c?.id]);

  useEffect(() => {
    if (!c || paso !== null) return;
    const qs = new URLSearchParams(window.location.search);
    const q = Number(qs.get("paso"));
    if (qs.get("modo") === "anadir" && c.estado === "activa" && est) {
      setModoAnadir(true);
      // (Prueba, 24-11-2026) Las unidades nuevas obligan a cargar de nuevo todas las plantillas.
      setBorr({ unidades: c.unidades, plantillas: plantillasIniciales(est.raiz), intentosPlantilla: { ...c.intentosPlantilla } });
    }
    if (!c.estructuraId && c.estado !== "activa") { router.replace(`/configuracion-prueba/asignar/${c.flotaId}`); return; }
    const n = q >= 1 && q <= 8 ? q : c.pasoActual;
    setPaso(n === 5 ? 4 : n === 6 ? 3 : n === 8 ? 7 : n); // los antiguos pasos 5, 6 y 8 (Resumen) ya no existen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c, paso]);

  if (!store.listo || (c && paso === null)) return <main className="lm-page"><Loading text="Cargando configuración" /></main>;
  if (!c || !flota) {
    return (
      <main className="lm-page">
        <EmptyState icon="search_off" title="No se ha encontrado la configuración" text="Puede que se haya descartado o que el enlace no sea correcto"
          action={<Button onClick={() => router.push("/configuracion-prueba")}>Volver al listado</Button>} />
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
  const listoAnadir = !!anadir && unidadesOk && todasCargadas(cv, raiz);
  const hayCambiosAnadir = !!anadir && (cv.unidades !== c.unidades || JSON.stringify(cv.plantillas) !== JSON.stringify(raiz ? plantillasIniciales(raiz) : {}));
  const qsModo = anadir ? "&modo=anadir" : "";
  // Nº de la configuración dentro de su flota (tarjeta «Configuración N» del paso 1)
  const numCfg = store.configs.filter((x) => x.flotaId === c.flotaId && x.guardada).findIndex((x) => x.id === c.id) + 1 || 1;

  const v1 = paso1Valido(c, est);
  // Los pasos siguientes dependen de la estructura: solo se puede ir a ellos una vez confirmada (al guardar el paso 1).
  const estructuraFijada = c.pasoMax > 1;
  const alcanzable = (n: number) => soloLectura || n === 1 || (v1 && c.guardada && estructuraFijada);
  const valido = (n: number) => (n === 1 ? v1 : n === 3 ? !!c.drivers : n === 7 ? todasCargadas(c, raiz) : true);

  const irA = (n: number, forzar = false) => {
    if (!forzar && !alcanzable(n)) return;
    if (soloLectura) { // en consulta (y al añadir unidades) no se guarda nada al navegar
      setPaso(n);
      setIntentado(false);
      window.history.replaceState(null, "", `/configuracion-prueba/${c.id}?paso=${n}${qsModo}`);
      window.scrollTo({ top: 0 });
      return;
    }
    const cambios: Partial<Configuracion> = { pasoActual: n, pasoMax: orden(n) > orden(c.pasoMax) ? n : c.pasoMax };
    if (n === 7 && raiz && !Object.keys(c.plantillas).length) cambios.plantillas = plantillasIniciales(raiz);
    set(cambios);
    setPaso(n);
    setIntentado(false);
    window.history.replaceState(null, "", `/configuracion-prueba/${c.id}?paso=${n}`);
    window.scrollTo({ top: 0 });
  };

  // Paso 1: tras crear la configuración (y confirmar la estructura) queda en solo consulta. Al añadir unidades sí se cambia el nº de unidades.
  const guardarPaso1 = (unidades: number) => {
    if (anadir) {
      set({ unidades });
      snack(`Se añadirán ${unidades - anadir.antes} unidades: carga las plantillas para terminar`);
      irA(7);
      return;
    }
    store.actualizarConfig(c.id, { unidades });
    snack(`Configuración ${etiquetaCfg(store, c)} guardada`);
    irA(3);
  };
  const finalizar = () => {
    set({ estado: "activa", pasoActual: 7 });
    snack(`Configuración ${etiquetaCfg(store, c)} finalizada: sus ${c.unidades} unidades ya están en uso`);
    router.push("/configuracion-prueba");
  };
  // Orden de los pasos con Cancelar y Guardar: Drivers (3) → Añadir valor a propiedades de hueco (2) → Propiedades categoría (4) → Plantillas (7)
  const SIGUIENTE: Record<number, number> = { 3: 2, 2: 4, 4: 7 };
  const GUARDADO: Record<number, string> = { 3: "Drivers guardados", 2: "Valores de propiedades de hueco guardados", 4: "Propiedades de categoría guardadas" };
  const guardarPaso = () => {
    snack(GUARDADO[p]);
    setCopia(null);
    irA(SIGUIENTE[p]);
  };
  const cancelarPaso = () => {
    if (copia) {
      store.actualizarConfig(c.id, { drivers: copia.drivers, valoresHueco: copia.valoresHueco });
      store.guardarPropsCategoria(copia.propsCategoria);
    }
    setCopia(null);
    snack("Cambios descartados");
    router.push("/configuracion-prueba");
  };
  const guardarAnadir = () => {
    if (!anadir || !listoAnadir) return;
    const n = (cv.unidades ?? 0) - anadir.antes;
    store.actualizarConfig(c.id, { unidades: cv.unidades, plantillas: cv.plantillas, intentosPlantilla: cv.intentosPlantilla });
    snack(`${n} unidades añadidas a ${etiquetaCfg(store, c)}: ahora tiene ${cv.unidades}`);
    router.push("/configuracion-prueba");
  };

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion-prueba" }, { label: flota.nombre, href: "/configuracion-prueba" }, { label: c.estructuraId ? nombreEstructura(store, c) : "Nueva configuración" }]} />
          <span className="row gap-15">
            <h1 className="lm-headline-small" style={{ margin: 0 }}>{c.estructuraId ? etiquetaCfg(store, c) : "Nueva configuración"}</h1>
            {c.guardada && (soloLectura ? <Tag tone="success">En uso</Tag> : <Tag tone="attention">2/3</Tag>)}
          </span>
        </div>
        <div className="lm-header__actions">
          {anadir && <Button variant="outlined" onClick={() => (hayCambiosAnadir ? setSalirAnadir(true) : router.push("/configuracion-prueba"))}>Cancelar</Button>}
        </div>
      </div>

      {soloLectura && (
        <div style={{ marginBottom: "var(--lm-space-20)" }}>
          {anadir ? (
            <Banner type="info" title={`Estás añadiendo unidades a ${etiquetaCfg(store, c)}`}>
              Solo puedes cambiar el número de unidades (paso 1) y cargar las plantillas (paso 5). Todas las plantillas son obligatorias. Los cambios se guardan al pulsar Añadir unidades en Plantillas: si sales antes, no se guarda nada.
            </Banner>
          ) : (
            <Banner type="info" title="Estás consultando una configuración en uso">
              Puedes recorrer todos sus pasos y ver sus datos, pero no modificar nada.
            </Banner>
          )}
        </div>
      )}

      {/* (Prueba, 24-11-2026) Sin barra inferior: se navega con el stepper, los cambios se guardan solos
          y la acción final (Finalizar configuración o Añadir unidades) está al final de Plantillas. */}
      <StepperPrueba actual={p} onIr={irA} bloqueado={(n) => !alcanzable(n)}
        hecho={(n) => !c.pasosOmitidos.includes(n) && (anadir
          ? (n === 1 ? unidadesOk : n === 7 ? todasCargadas(cv, raiz) : true)
          : soloLectura || (orden(n) < orden(c.pasoMax) && valido(n)))} />

      {p === 1 && (
        <TarjetaConfiguracion key={`${c.id}-${anadir ? "anadir" : "alta"}`} titulo={`Configuración ${numCfg}`}
          unidades={cv.unidades} estructuraId={c.estructuraId ?? ""} opciones={[]} estructuraFija
          soloLectura={!anadir} minUnidades={anadir?.antes} onGuardar={guardarPaso1} />
      )}
      {p === 2 && est && <Paso2 {...props} />}
      {p === 3 && est && <Paso3 {...props} />}
      {p === 4 && est && <Paso4 {...props} />}
      {[2, 3, 4].includes(p) && est && !soloLectura && (
        <div className="row gap-10" style={{ justifyContent: "flex-end", marginTop: "var(--lm-space-20)" }}>
          <Button variant="outlined" onClick={cancelarPaso}>Cancelar</Button>
          <Button onClick={guardarPaso}>Guardar</Button>
        </div>
      )}
      {p === 7 && est && <Paso7 {...props} />}

      {p === 7 && !(soloLectura && !anadir) && (
        <div className="row gap-10" style={{ justifyContent: "flex-end", marginTop: "var(--lm-space-20)" }}>
          {anadir
            ? <Button icon="check" disabled={!listoAnadir} onClick={guardarAnadir}>Añadir {(cv.unidades ?? 0) - anadir.antes > 0 ? (cv.unidades ?? 0) - anadir.antes : ""} unidades</Button>
            : <Button icon="check" disabled={!todasCargadas(c, raiz)} onClick={finalizar}>Finalizar configuración</Button>}
        </div>
      )}

      {salirAnadir && anadir && (
        <Dialog title="¿Salir sin añadir unidades?" onClose={() => setSalirAnadir(false)}
          message={`No se guardará ningún cambio: ${etiquetaCfg(store, c)} seguirá con sus ${anadir.antes} unidades y sus plantillas como estaban.`}
          footer={<>
            <Button variant="outlined" onClick={() => setSalirAnadir(false)}>Seguir añadiendo</Button>
            <Button variant="danger" onClick={() => router.push("/configuracion-prueba")}>Salir sin guardar</Button>
          </>} />
      )}
    </main>
  );
}
