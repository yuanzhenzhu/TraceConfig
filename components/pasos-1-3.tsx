"use client";

// Pasos 1 (Estructura y unidades), 2 (Valores de propiedades de hueco) y 3 (Drivers) del asistente.
// (Prueba) La estructura y sus propiedades de hueco van unidas: en el paso 1 se consultan en dos pestañas
// y en el paso 2 se da valor, si se quiere, a las propiedades que define la estructura.

import Link from "next/link";
import { useState } from "react";
import { Banner, Button, EmptyState, Field, Icon } from "./ds";
import { useRouter } from "next/navigation";
import { ArbolVista, ResumenArbol } from "./arbol";
import { EditorDrivers } from "./drivers";
import { SeccionSms } from "./sms";
import { ListaPropsHueco, resumenPropiedades } from "./propiedades";
import {
  contarHuecos, driversIniciales,
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
  const router = useRouter();
  const fijada = !!c.estructuraNueva && !!est; // estructura nueva creada en Estructuras desde el asistente
  const elegir = (e: Estructura) => set({ estructuraId: e.id });
  // Pestaña Crear una estructura nueva: informa y lleva a Estructuras; al crearla se vuelve aquí con ella asignada.
  const [modo, setModo] = useState<"existente" | "nueva">("existente");
  const irAEstructuras = () => router.push(`/configuracion/estructuras/nueva?config=${c.id}`);

  const errNombre = intentado && !c.unica && !c.nombre.trim() ? "Indica el nombre de la configuración" : "";
  const errEstructura = intentado && !est ? "Selecciona o crea una estructura" : "";

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
        {c.guardada && est && c.pasoMax > 1 ? ( // la estructura queda fijada al pasar del paso 1
          <>
            <Banner type="info" title="La estructura de esta configuración está confirmada"
              actions={<Link className="lm-btn lm-btn--outlined lm-btn--small" href={`/configuracion/estructuras/${est.id}`}>Modificar en Estructuras</Link>}>
              Los pasos siguientes se basan en ella, así que no se puede cambiar por otra: si necesitas otra estructura, crea de nuevo la configuración. La propia estructura sí se puede modificar desde el apartado Estructuras, y el cambio afectará a todas las configuraciones que la usan.
            </Banner>
            <VistaEstructura est={est} titulo={est.nombre} />
          </>
        ) : fijada ? (
          <>
            <Banner type="success" title={`${est!.nombre} se ha creado para esta configuración`}
              actions={<Link className="lm-btn lm-btn--outlined lm-btn--small" href={`/configuracion/estructuras/${est!.id}?config=${c.id}`}>Modificar en Estructuras</Link>}>
              La estructura nueva ya está asignada y forma parte del catálogo del cliente. Como has creado una estructura nueva, no se puede elegir una existente.
            </Banner>
            <VistaEstructura est={est!} titulo={est!.nombre} />
          </>
        ) : (
          <>
            <div className="lm-tabs" role="tablist" style={{ marginBottom: 0 }}>
              <button role="tab" className="lm-tab" aria-selected={modo === "existente"} onClick={() => setModo("existente")}>
                <Icon name="list" /> Usar una estructura existente
              </button>
              <button role="tab" className="lm-tab" aria-selected={modo === "nueva"} onClick={() => { setModo("nueva"); if (c.estructuraId) set({ estructuraId: null }); }}>
                <Icon name="add" /> Crear una estructura nueva
              </button>
            </div>
            {errEstructura && <Banner type="error">{errEstructura}</Banner>}

            {modo === "nueva" ? (
              <Banner type="info" title="La estructura nueva se crea en Estructuras"
                actions={<Button variant="outlined" small icon="north_east" onClick={irAEstructuras}>Ir a Estructuras</Button>}>
                Irás a Configuración › Estructura y propiedades de hueco para crearla: su composición de huecos y, si quieres, sus propiedades de hueco. Al pulsar Crear y volver al asistente, se añadirá al catálogo del cliente y volverás aquí con ella asignada. Lo que has rellenado en este paso se conserva. Una vez creada, ya no podrás elegir una estructura existente para esta configuración.
              </Banner>
            ) : (
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
            )}
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

export function paso1Valido(c: Configuracion, est: Estructura | undefined) {
  if ((!c.unica && !c.nombre.trim()) || !c.unidades || !est || est.raiz.hijos.length === 0) return false;
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
/**
 * Drivers propios de esta configuración (flota + estructura). Otra flota con la misma estructura puede tener otros.
 * Debajo, en la misma sección y opcional, su cálculo en SMS (también propio de la configuración).
 */
export function Paso3({ c, set, est, flota, intentado }: PasoProps) {
  const raiz: Nodo = est!.raiz;
  const valor = c.drivers && c.drivers.estructuraId === est!.id ? c.drivers : { ...driversIniciales(raiz), estructuraId: est!.id };
  return (
    <div className="stack gap-30">
    <section className="lm-surface lm-surface--p24 stack gap-20">
      <h2 className="lm-title-medium" style={{ margin: 0 }}>Drivers</h2>
      <p className="muted" style={{ margin: 0 }}>
        Los drivers son propios de esta configuración: de <strong>{flota.nombre}</strong> con <strong>{est!.nombre}</strong>. Otra flota que use {est!.nombre} puede tener otros. Se marcan sobre la estructura entera de la unidad, hueco a hueco. De inicio, el kilometraje en todos los huecos.
      </p>
      <EditorDrivers raiz={raiz} valor={valor} onChange={(v) => set({ drivers: { ...v, estructuraId: est!.id } })} />
      {/* Cálculo en SMS: junto a los drivers, propio de esta configuración y opcional (solo si la flota usa SMS) */}
      {flota.usaSms && <SeccionSms valor={c.sms ?? []} onChange={(v) => set({ sms: v })} intentado={intentado} />}
    </section>
    </div>
  );
}
