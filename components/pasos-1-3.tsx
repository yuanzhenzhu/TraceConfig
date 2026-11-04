"use client";

// Pasos 1 (Estructura y unidades), 2 (Valores de propiedades de hueco) y 3 (Drivers) del asistente.
// (Prueba) La estructura y sus propiedades de hueco van unidas: en el paso 1 se consultan en dos pestañas
// y en el paso 2 se da valor, si se quiere, a las propiedades que define la estructura.

import Link from "next/link";
import { useState } from "react";
import { Banner, EmptyState, Field, Icon } from "./ds";
import { ArbolVista, EditorEstructura, ResumenArbol } from "./arbol";
import { EditorDrivers } from "./drivers";
import { ListaPropsHueco, resumenPropiedades } from "./propiedades";
import {
  clonar, contarHuecos, driversIniciales, nodo, nuevoId,
  type Configuracion, type Estructura, type Flota, type Nodo,
} from "@/lib/model";
import { useStore } from "@/lib/store";

export type PasoProps = {
  c: Configuracion;
  set: (cambios: Partial<Configuracion>) => void;
  intentado: boolean;
  est?: Estructura;
  flota: Flota;
  setFlota: (cambios: Partial<Flota>) => void;
};

/* ---------- Paso 1 ---------- */
export function Paso1({ c, set, intentado, est, flota }: PasoProps) {
  const store = useStore();
  // Si la flota tiene una o varias estructuras se indica al crear la flota (dialog Nueva flota).
  const [texto, setTexto] = useState(c.unidades ? String(c.unidades) : "");
  const nUnidades = Number(texto);
  const unidadesOk = Number.isInteger(nUnidades) && nUnidades >= 1 && nUnidades <= 999;
  const errUnidades = intentado && !unidadesOk ? "Indica un número entero entre 1 y 999" : "";
  const huecos = est ? contarHuecos(est.raiz) : 0;
  const esBorrador = est?.borradorDe === c.id; // estructura nueva creada en este asistente
  const [modo, setModo] = useState<"existente" | "nueva">(esBorrador ? "nueva" : "existente");
  const [origen, setOrigen] = useState<"existente" | "cero">("cero");
  const [base, setBase] = useState(store.estructuras[0]?.id ?? "");

  const quitarBorrador = () => { if (esBorrador && est) store.eliminarEstructura(est.id); };
  const elegir = (e: Estructura) => { quitarBorrador(); set({ estructuraId: e.id }); };
  const crearNueva = (o: "existente" | "cero", baseId = base) => {
    const b = store.estructura(baseId);
    const raiz = o === "existente" && b ? { ...clonar(b.raiz), nombre: "Tren" } : nodo("Tren", "Tren");
    const borrador: Estructura = esBorrador && est
      ? { ...est, raiz }
      : { id: nuevoId("est"), nombre: "", descripcion: "", raiz, borradorDe: c.id };
    store.guardarEstructura(borrador);
    set({ estructuraId: borrador.id });
  };
  const editarBorrador = (cambios: Partial<Estructura>) => { if (est) store.guardarEstructura({ ...est, ...cambios }); };

  const errNombre = intentado && !c.unica && !c.nombre.trim() ? "Indica el nombre de la configuración" : "";
  const errEstructura = intentado && !est ? "Selecciona o crea una estructura" : "";
  const nombreRepetido = esBorrador && !!est && store.estructuras.some((e) => e.nombre.trim().toLowerCase() === est.nombre.trim().toLowerCase());
  const errNombreEst = intentado && esBorrador && est && !est.nombre.trim() ? "Indica el nombre de la estructura" : nombreRepetido ? "Ya existe una estructura con este nombre" : "";
  const errVacia = intentado && est && est.raiz.hijos.length === 0 ? "La estructura está vacía: añade al menos un elemento" : "";

  return (
    <div className="stack gap-30">
      <section className="lm-surface lm-surface--p24 stack gap-20">
        <h2 className="lm-title-medium" style={{ margin: 0 }}>Datos de la configuración</h2>
        <p className="muted" style={{ margin: 0 }}>Una configuración es una parte de la flota que comparte la misma estructura.</p>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--lm-space-30)", alignItems: "start" }}>
          {c.unica ? (
            <div className="stack gap-5"><span className="lm-field__label">Nombre</span><span>{flota.nombre} <span className="muted lm-body-small">· la flota tiene una sola estructura</span></span></div>
          ) : (
            <Field label="Nombre" required htmlFor="c-nombre" error={errNombre}>
              <input id="c-nombre" className="lm-input" value={c.nombre} aria-invalid={!!errNombre} placeholder="Por ejemplo: Serie C" onChange={(e) => set({ nombre: e.target.value })} />
            </Field>
          )}
          <Field label="Número de unidades" required htmlFor="u-num" error={errUnidades} support="Entre 1 y 999. Los nº de serie se cargan después, en la plantilla de primer nivel">
            <input id="u-num" className="lm-input" inputMode="numeric" value={texto} aria-invalid={!!errUnidades} placeholder="Por ejemplo: 16"
              onChange={(e) => { setTexto(e.target.value); const v = Number(e.target.value); set({ unidades: Number.isInteger(v) && v >= 1 && v <= 999 ? v : null }); }} />
          </Field>
        </div>

        {unidadesOk && est && (
          <span className="lm-body-small muted">{nUnidades} unidades × {huecos} huecos por unidad = {(nUnidades * huecos).toLocaleString("es-ES")} huecos en total</span>
        )}
        {!c.guardada && (
          <span className="lm-body-small muted row gap-5"><Icon name="info" size="m" />Al continuar, la configuración se guardará con el estado En configuración y podrás retomarla cuando quieras.</span>
        )}
      </section>

      <section className="lm-surface lm-surface--p24 stack gap-20">
        <h2 className="lm-title-medium" style={{ margin: 0 }}>Estructura</h2>
        {c.guardada && est ? (
          <>
            <Banner type="info" title="La estructura es común a todo el cliente"
              actions={<Link className="lm-btn lm-btn--outlined lm-btn--small" href={`/configuracion/estructuras/${est.id}`}>Modificar en Estructuras</Link>}>
              Esta configuración ya tiene unidades. Para cambiar la estructura, modifícala desde el apartado Estructuras: el cambio afectará a todas las configuraciones que la usan.
            </Banner>
            <VistaEstructura est={est} titulo={est.nombre} />
          </>
        ) : (
          <>
            <div className="lm-tabs" role="tablist" style={{ marginBottom: 0 }}>
              <button role="tab" className="lm-tab" aria-selected={modo === "existente"} onClick={() => { setModo("existente"); if (esBorrador) { quitarBorrador(); set({ estructuraId: null }); } }}>
                <Icon name="list" /> Usar una estructura existente
              </button>
              <button role="tab" className="lm-tab" aria-selected={modo === "nueva"} onClick={() => { setModo("nueva"); if (!esBorrador) crearNueva(origen); }}>
                <Icon name="add" /> Crear una estructura nueva
              </button>
            </div>
            {errEstructura && <Banner type="error">{errEstructura}</Banner>}

            {modo === "existente" ? (
              <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "var(--lm-space-20)", alignItems: "start" }}>
                <div className="stack gap-10" role="radiogroup" aria-label="Estructuras existentes">
                  {store.estructuras.map((e) => {
                    const sel = c.estructuraId === e.id;
                    const usos = store.usosDe(e.id).length;
                    return (
                      <label key={e.id} className="lm-card lm-radio" style={{ alignItems: "flex-start", borderColor: sel ? "var(--lm-sys-primary)" : undefined, background: sel ? "color-mix(in srgb, var(--lm-sys-primary) 8%, var(--lm-sys-surface-container-lowest))" : undefined }}>
                        <input type="radio" name="estructura" checked={sel} onChange={() => elegir(e)} aria-label={`${e.nombre}: ${e.descripcion}`} />
                        <span className="lm-radio__text gap-5">
                          <span className="lm-title-small">{e.nombre}</span>
                          <span className="lm-radio__support">{e.descripcion}</span>
                          <span className="lm-body-small muted">{contarHuecos(e.raiz)} huecos por unidad · {usos ? `usada en ${usos} configuraciones` : "sin usar"}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {est ? <VistaEstructura est={est} titulo={`Vista previa · ${est.nombre}`} /> : (
                  <div className="lm-card"><div className="lm-center"><Icon name="find_in_page" size="xl" />Selecciona una estructura para ver su composición</div></div>
                )}
              </div>
            ) : est && esBorrador ? (
              <div className="stack gap-20">
                <span className="lm-body-small muted row gap-5"><Icon name="info" size="m" />La estructura se añadirá al catálogo común del cliente cuando guardes las unidades.</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "var(--lm-space-20)" }}>
                  <Field label="Nombre de la estructura" required htmlFor="e-nombre" error={errNombreEst}>
                    <input id="e-nombre" className="lm-input" value={est.nombre} aria-invalid={!!errNombreEst} placeholder="Por ejemplo: Estructura 4"
                      onChange={(e) => editarBorrador({ nombre: e.target.value })} />
                  </Field>
                  <Field label="Descripción de la estructura" htmlFor="e-desc">
                    <input id="e-desc" className="lm-input" value={est.descripcion} onChange={(e) => editarBorrador({ descripcion: e.target.value })} />
                  </Field>
                </div>
                <fieldset className="row gap-30" style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="lm-field__label" style={{ marginBottom: "var(--lm-space-10)" }}>Punto de partida</legend>
                  <label className="lm-radio">
                    <input type="radio" name="origen" checked={origen === "cero"} onChange={() => { setOrigen("cero"); crearNueva("cero"); }} />
                    Desde cero
                  </label>
                  <label className="lm-radio">
                    <input type="radio" name="origen" checked={origen === "existente"} onChange={() => { setOrigen("existente"); crearNueva("existente"); }} />
                    Copiar una estructura existente
                  </label>
                  {origen === "existente" && (
                    <select className="lm-select lm-select--dense" style={{ width: 240 }} aria-label="Estructura de partida" value={base}
                      onChange={(e) => { setBase(e.target.value); crearNueva("existente", e.target.value); }}>
                      {store.estructuras.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                  )}
                </fieldset>
                {errVacia && <Banner type="error">{errVacia}</Banner>}
                <EditorEstructura raiz={est.raiz} onChange={(raiz) => editarBorrador({ raiz })} />
                <span className="lm-body-small muted row gap-5"><Icon name="info" size="m" />Una estructura nueva empieza sin propiedades de hueco. Se seleccionan después en Configuración › Estructuras.</span>
              </div>
            ) : null}
          </>
        )}
      </section>

    </div>
  );
}

/* ---------- Estructura y sus propiedades de hueco, en dos pestañas (solo consulta) ---------- */
const contarConProps = (est: Estructura) => resumenPropiedades(est.raiz, { propsCategoria: {}, propsHueco: est.propsHueco ?? {} }).nHuecos;

function Pestanas({ n, valor, onChange }: { n: number; valor: "estructura" | "huecos"; onChange: (v: "estructura" | "huecos") => void }) {
  return (
    <div className="lm-tabs" role="tablist" style={{ marginBottom: 0 }}>
      <button role="tab" className="lm-tab" aria-selected={valor === "estructura"} onClick={() => onChange("estructura")}><Icon name="table_rows" /> Estructura</button>
      <button role="tab" className="lm-tab" aria-selected={valor === "huecos"} onClick={() => onChange("huecos")}><Icon name="radio_button_checked" /> Propiedades de hueco{n ? ` (${n})` : ""}</button>
    </div>
  );
}

function VistaEstructura({ est, titulo }: { est: Estructura; titulo: string }) {
  const [pest, setPest] = useState<"estructura" | "huecos">("estructura");
  const n = contarConProps(est);
  return (
    <div className="lm-card stack gap-10">
      <span className="lm-title-small">{titulo}</span>
      <Pestanas n={n} valor={pest} onChange={setPest} />
      {pest === "estructura" ? (
        <>
          <ResumenArbol raiz={est.raiz} />
          <ArbolVista raiz={est.raiz} />
        </>
      ) : n === 0 ? (
        <div className="lm-center"><Icon name="radio_button_checked" size="xl" />{est.nombre} no tiene propiedades de hueco
          <Link className="lm-btn lm-btn--text lm-btn--small" href={`/configuracion/estructuras/${est.id}?pestana=huecos`}>Definirlas en Estructuras</Link>
        </div>
      ) : (
        <>
          <span className="lm-body-small muted row gap-5"><Icon name="info" size="m" />Vienen seleccionadas con la estructura y aquí solo se consultan. Sus valores se dan en el paso siguiente.</span>
          <ListaPropsHueco raiz={est.raiz} definicion={est.propsHueco ?? {}} />
        </>
      )}
    </div>
  );
}

export function paso1Valido(c: Configuracion, est: Estructura | undefined, nombresOcupados: string[] = []) {
  if ((!c.unica && !c.nombre.trim()) || !c.unidades || !est || est.raiz.hijos.length === 0) return false;
  if (est.borradorDe && (!est.nombre.trim() || nombresOcupados.includes(est.nombre.trim().toLowerCase()))) return false;
  return true;
}

/* ---------- Paso 2 ---------- */
/** Valores de las propiedades de hueco que define la estructura. Son de esta configuración y opcionales. */
export function Paso2({ c, set, est }: PasoProps) {
  const def = est!.propsHueco ?? {};
  const n = contarConProps(est!);
  return (
    <section className="lm-surface lm-surface--p24 stack gap-20">
      <h2 className="lm-title-medium" style={{ margin: 0 }}>Valores de propiedades de hueco</h2>
      {n === 0 ? (
        <EmptyState icon="radio_button_checked" title={`${est!.nombre} no tiene propiedades de hueco`}
          text="No hay valores que dar. Puedes continuar con el paso siguiente"
          action={<Link className="lm-btn lm-btn--outlined" href={`/configuracion/estructuras/${est!.id}?pestana=huecos`}>Definirlas en Estructuras</Link>} />
      ) : (
        <>
          <p className="muted" style={{ margin: 0 }}>
            Estas son las propiedades de hueco seleccionadas en {est!.nombre}. Escribe el valor de cada una: los valores son únicos de esta configuración y puedes dejarlos vacíos.
          </p>
          <ListaPropsHueco raiz={est!.raiz} definicion={def} valor={c.valoresHueco ?? {}} onChange={(v) => set({ valoresHueco: v })} />
        </>
      )}
    </section>
  );
}

/* ---------- Paso 3 ---------- */
/** Drivers propios de esta configuración (flota + estructura). Otra flota con la misma estructura puede tener otros. */
export function Paso3({ c, set, est, flota }: PasoProps) {
  const raiz: Nodo = est!.raiz;
  const valor = c.drivers && c.drivers.estructuraId === est!.id ? c.drivers : { ...driversIniciales(raiz), estructuraId: est!.id };
  return (
    <section className="lm-surface lm-surface--p24 stack gap-20">
      <h2 className="lm-title-medium" style={{ margin: 0 }}>Drivers</h2>
      <p className="muted" style={{ margin: 0 }}>
        Los drivers son propios de esta configuración: de <strong>{flota.nombre}</strong> con <strong>{est!.nombre}</strong>. Otra flota que use {est!.nombre} puede tener otros. De inicio, el kilometraje en todas las categorías.
      </p>
      <EditorDrivers raiz={raiz} valor={valor} onChange={(v) => set({ drivers: { ...v, estructuraId: est!.id } })} />
    </section>
  );
}
