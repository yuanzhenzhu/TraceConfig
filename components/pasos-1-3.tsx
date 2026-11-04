"use client";

// Pasos 1 (Datos y estructura), 2 (Unidades) y 3 (Drivers) del asistente.

import Link from "next/link";
import { useState } from "react";
import { Banner, Button, Field, Icon, useSnackbar } from "./ds";
import { ArbolVista, EditorEstructura, ResumenArbol } from "./arbol";
import { EditorDrivers, ResumenDrivers } from "./drivers";
import {
  clonar, contarHuecos, driversIniciales, nodo, nuevoId,
  type Configuracion, type DriversConfig, type Estructura, type Flota, type Nodo, type PerfilDrivers,
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
export function Paso1({ c, set, intentado, est }: PasoProps) {
  const store = useStore();
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

  const errNombre = intentado && !c.nombre.trim() ? "Indica el nombre de la configuración" : "";
  const errEstructura = intentado && !est ? "Selecciona o crea una estructura" : "";
  const nombreRepetido = esBorrador && !!est && store.estructuras.some((e) => e.nombre.trim().toLowerCase() === est.nombre.trim().toLowerCase());
  const errNombreEst = intentado && esBorrador && est && !est.nombre.trim() ? "Indica el nombre de la estructura" : nombreRepetido ? "Ya existe una estructura con este nombre" : "";
  const errVacia = intentado && est && est.raiz.hijos.length === 0 ? "La estructura está vacía: añade al menos un elemento" : "";

  return (
    <div className="stack gap-30">
      <section className="lm-surface lm-surface--p24 stack gap-20">
        <h2 className="lm-title-medium" style={{ margin: 0 }}>Datos de la configuración</h2>
        <p className="muted" style={{ margin: 0 }}>Una configuración es una parte de la flota que comparte la misma estructura.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "var(--lm-space-20)" }}>
          <Field label="Nombre" required htmlFor="c-nombre" error={errNombre}>
            <input id="c-nombre" className="lm-input" value={c.nombre} aria-invalid={!!errNombre} placeholder="Por ejemplo: Serie C" onChange={(e) => set({ nombre: e.target.value })} />
          </Field>
          <Field label="Descripción" htmlFor="c-desc">
            <input id="c-desc" className="lm-input" value={c.descripcion} placeholder="Por ejemplo: Unidades de 3 coches entregadas en 2026" onChange={(e) => set({ descripcion: e.target.value })} />
          </Field>
        </div>
      </section>

      <section className="lm-surface lm-surface--p24 stack gap-20">
        <h2 className="lm-title-medium" style={{ margin: 0 }}>Estructura</h2>
        {c.guardada && est ? (
          <>
            <Banner type="info" title="La estructura es común a todo el cliente"
              actions={<Link className="lm-btn lm-btn--outlined lm-btn--small" href={`/configuracion/estructuras/${est.id}`}>Modificar en Estructuras</Link>}>
              Esta configuración ya tiene unidades. Para cambiar la estructura, modifícala desde el apartado Estructuras: el cambio afectará a todas las configuraciones que la usan.
            </Banner>
            <div className="lm-card">
              <div className="stack gap-10" style={{ marginBottom: "var(--lm-space-10)" }}>
                <span className="lm-title-small">{est.nombre}</span>
                <ResumenArbol raiz={est.raiz} />
              </div>
              <ArbolVista raiz={est.raiz} />
            </div>
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
                <div className="lm-card">
                  {est ? (
                    <>
                      <div className="stack gap-10" style={{ marginBottom: "var(--lm-space-10)" }}>
                        <span className="lm-title-small">Vista previa · {est.nombre}</span>
                        <ResumenArbol raiz={est.raiz} />
                      </div>
                      <ArbolVista raiz={est.raiz} />
                    </>
                  ) : (
                    <div className="lm-center"><Icon name="find_in_page" size="xl" />Selecciona una estructura para ver su composición</div>
                  )}
                </div>
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
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

export function paso1Valido(c: Configuracion, est: Estructura | undefined, nombresOcupados: string[] = []) {
  if (!c.nombre.trim() || !est || est.raiz.hijos.length === 0) return false;
  if (est.borradorDe && (!est.nombre.trim() || nombresOcupados.includes(est.nombre.trim().toLowerCase()))) return false;
  return true;
}

/* ---------- Paso 2 ---------- */
export function Paso2({ c, set, intentado, est }: PasoProps) {
  const [texto, setTexto] = useState(c.unidades ? String(c.unidades) : "");
  const n = Number(texto);
  const valido = Number.isInteger(n) && n >= 1 && n <= 999;
  const err = intentado && !valido ? "Indica un número entero entre 1 y 999" : "";
  const huecos = est ? contarHuecos(est.raiz) : 0;
  return (
    <section className="lm-surface lm-surface--p24 stack gap-20" style={{ maxWidth: 720 }}>
      <h2 className="lm-title-medium" style={{ margin: 0 }}>Unidades</h2>
      <p className="muted" style={{ margin: 0 }}>Indica cuántas unidades (trenes) de la flota usan la estructura <strong>{est?.nombre}</strong>.</p>
      <Field label="Número de unidades" required htmlFor="u-num" error={err} support="Entre 1 y 999">
        <input id="u-num" className="lm-input" style={{ width: 200 }} inputMode="numeric" value={texto} aria-invalid={!!err}
          onChange={(e) => { setTexto(e.target.value); const v = Number(e.target.value); set({ unidades: Number.isInteger(v) && v >= 1 && v <= 999 ? v : null }); }} />
      </Field>
      {valido && (
        <div className="lm-card row gap-30">
          <span className="stack"><span className="lm-headline-small">{n}</span><span className="lm-body-small muted">unidades</span></span>
          <span className="stack"><span className="lm-headline-small">{huecos}</span><span className="lm-body-small muted">huecos por unidad</span></span>
          <span className="stack"><span className="lm-headline-small">{(n * huecos).toLocaleString("es-ES")}</span><span className="lm-body-small muted">huecos en total</span></span>
        </div>
      )}
      <Banner type="info" title="Los nº de serie se cargan después">
        Los números de serie, la fecha y los km de cada unidad se cargan en la plantilla de primer nivel (Tren), en el paso Carga de datos.
      </Banner>
      {!c.guardada && (
        <span className="lm-body-small muted row gap-5"><Icon name="info" size="m" />Al continuar, la configuración se guardará con el estado En configuración y podrás retomarla cuando quieras.</span>
      )}
    </section>
  );
}

/* ---------- Paso 3 ---------- */
// Los drivers son un catálogo común del cliente (Configuración › Drivers), como las estructuras:
// aquí se elige un perfil de la estructura de la configuración o se crea uno nuevo.
export function Paso3({ c, set, est }: PasoProps) {
  const snack = useSnackbar();
  const store = useStore();
  const raiz: Nodo = est!.raiz;
  const compatibles = store.perfiles.filter((p) => p.estructuraId === est!.id);
  const actual = store.perfil(c.perfilDriversId);
  const [modo, setModo] = useState<"existente" | "nuevo">(compatibles.length ? "existente" : "nuevo");
  const [nuevo, setNuevo] = useState<DriversConfig & { nombre: string; descripcion: string }>(() => ({ nombre: "", descripcion: "", ...driversIniciales(raiz) }));
  const [intentoNuevo, setIntentoNuevo] = useState(false);
  const repetido = store.perfiles.some((p) => p.nombre.trim().toLowerCase() === nuevo.nombre.trim().toLowerCase());
  const errNombre = intentoNuevo && !nuevo.nombre.trim() ? "Indica el nombre del perfil" : repetido ? "Ya existe un perfil con este nombre" : "";

  const crear = () => {
    setIntentoNuevo(true);
    if (!nuevo.nombre.trim() || repetido) return;
    const p: PerfilDrivers = { id: nuevoId("drv"), estructuraId: est!.id, ...nuevo };
    store.guardarPerfil(p);
    set({ perfilDriversId: p.id });
    setModo("existente");
  };
  const otrasDe = (id: string) => store.usosDePerfil(id).filter((x) => x.id !== c.id);
  const duplicar = () => {
    if (!actual) return;
    const p: PerfilDrivers = { ...structuredClone(actual), id: nuevoId("drv"), nombre: nombreLibre(`${actual.nombre} · ${c.nombre || "copia"}`, store.perfiles), descripcion: `Copia de ${actual.nombre}` };
    store.guardarPerfil(p);
    set({ perfilDriversId: p.id });
    snack(`Perfil duplicado como "${p.nombre}"`);
  };

  return (
    <section className="lm-surface lm-surface--p24 stack gap-20">
      <h2 className="lm-title-medium" style={{ margin: 0 }}>Drivers</h2>
      <p className="muted" style={{ margin: 0 }}>
        Elige el perfil de drivers de esta configuración. Los perfiles son comunes a todo el cliente y van ligados a una estructura: aquí solo aparecen los de <strong>{est!.nombre}</strong>.
      </p>
      <div className="lm-tabs" role="tablist" style={{ marginBottom: 0 }}>
        <button role="tab" className="lm-tab" aria-selected={modo === "existente"} onClick={() => setModo("existente")}><Icon name="list" /> Usar un perfil existente</button>
        <button role="tab" className="lm-tab" aria-selected={modo === "nuevo"} onClick={() => setModo("nuevo")}><Icon name="add" /> Crear un perfil nuevo</button>
      </div>

      {modo === "existente" ? (
        compatibles.length === 0 ? (
          <EmptyStateSimple texto={`Todavía no hay perfiles de drivers para ${est!.nombre}`} accion={<Button variant="outlined" icon="add" onClick={() => setModo("nuevo")}>Crear un perfil nuevo</Button>} />
        ) : (
          <div className="stack gap-20">
            <div role="radiogroup" aria-label="Perfiles de drivers" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--lm-space-10)" }}>
              {compatibles.map((p) => {
                const sel = c.perfilDriversId === p.id;
                const usos = store.usosDePerfil(p.id).filter((x) => x.id !== c.id);
                return (
                  <label key={p.id} className="lm-card lm-radio" style={{ alignItems: "flex-start", borderColor: sel ? "var(--lm-sys-primary)" : undefined, background: sel ? "color-mix(in srgb, var(--lm-sys-primary) 8%, var(--lm-sys-surface-container-lowest))" : undefined }}>
                    <input type="radio" name="perfil" checked={sel} onChange={() => set({ perfilDriversId: p.id })} aria-label={p.nombre} />
                    <span className="lm-radio__text gap-5">
                      <span className="lm-title-small">{p.nombre}</span>
                      <span className="lm-radio__support">{p.descripcion}</span>
                      <ResumenDrivers valor={p} />
                      <span className="lm-body-small muted">{usos.length ? `También lo usan: ${usos.map((x) => x.nombre).join(", ")}` : "No lo usa ninguna otra configuración"}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="stack gap-10">
              {actual ? (
                <>
                  <CabeceraPerfil nombre={actual.nombre} otras={otrasDe(actual.id)} apartado="Drivers" href={`/configuracion/drivers/${actual.id}`} onDuplicar={duplicar} />
                  <EditorDrivers soloLectura={otrasDe(actual.id).length > 0} raiz={raiz} valor={actual} onChange={(v) => store.guardarPerfil({ ...actual, ...v })} />
                </>
              ) : (
                <div className="lm-card lm-center"><Icon name="timelapse" size="xl" />Selecciona un perfil para ver sus drivers. Si omites el paso, se aplica el kilometraje por defecto.</div>
              )}
            </div>
          </div>
        )
      ) : (
        <div className="stack gap-20">
          <span className="lm-body-small muted row gap-5"><Icon name="info" size="m" />El perfil se añadirá al catálogo común del cliente y podrán usarlo otras configuraciones con {est!.nombre}.</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "var(--lm-space-20)" }}>
            <Field label="Nombre del perfil" required htmlFor="dp-nombre" error={errNombre}>
              <input id="dp-nombre" className="lm-input" value={nuevo.nombre} aria-invalid={!!errNombre} placeholder="Por ejemplo: Km y horas de motores"
                onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
            </Field>
            <Field label="Descripción" htmlFor="dp-desc">
              <input id="dp-desc" className="lm-input" value={nuevo.descripcion} onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })} />
            </Field>
          </div>
          <EditorDrivers raiz={raiz} valor={nuevo} onChange={(v) => setNuevo({ ...nuevo, ...v })} />
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Button variant="tonal" icon="check" onClick={crear}>Crear y usar este perfil</Button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Nombre que no repite ninguno del catálogo: añade (2), (3)… si hace falta. */
export function nombreLibre(base: string, lista: { nombre: string }[]) {
  const usado = (n: string) => lista.some((p) => p.nombre.trim().toLowerCase() === n.toLowerCase());
  let n = base, i = 2;
  while (usado(n)) n = `${base} (${i++})`;
  return n;
}

/**
 * Misma regla para drivers y propiedades en el asistente:
 * - Si el perfil lo usan otras configuraciones, aquí solo se ve. Se modifica en su apartado (con aviso de impacto) o se duplica.
 * - Si solo lo usa esta configuración, se edita aquí mismo.
 */
export function CabeceraPerfil({ nombre, otras, apartado, href, onDuplicar, titulo }: {
  nombre: string; otras: Configuracion[]; apartado: string; href: string; onDuplicar: () => void; titulo?: string;
}) {
  const store = useStore();
  const compartido = otras.length > 0;
  return (
    <div className="stack gap-10">
      <div className="row gap-10 wrap">
        <span className="lm-title-small grow">{titulo ?? "Perfil"} · {nombre}</span>
        {compartido && <Button variant="outlined" small icon="content_copy" onClick={onDuplicar}>Duplicar para esta configuración</Button>}
        {compartido && <Link className="lm-btn lm-btn--text lm-btn--small" href={href}>Modificar en {apartado}</Link>}
      </div>
      {compartido ? (
        <Banner type="info" title={`Solo lectura: este perfil lo usan también ${otras.length} ${otras.length === 1 ? "configuración" : "configuraciones"}`}>
          {otras.map((x) => `${store.flotas.find((f) => f.id === x.flotaId)?.codigo} · ${x.nombre}`).join(", ")}. Para cambiarlo para todas, modifícalo en {apartado}. Si esta configuración necesita algo distinto, duplícalo.
        </Banner>
      ) : (
        <span className="lm-body-small muted row gap-5"><Icon name="info" size="m" />Solo lo usa esta configuración, así que puedes editarlo aquí. También está en <Link href={href}>Configuración › {apartado}</Link>.</span>
      )}
    </div>
  );
}

function EmptyStateSimple({ texto, accion }: { texto: string; accion: React.ReactNode }) {
  return <div className="lm-card lm-center"><Icon name="timelapse" size="xl" /><span>{texto}</span>{accion}</div>;
}
