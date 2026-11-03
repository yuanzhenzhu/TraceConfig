"use client";

// Pasos 1 (Datos y estructura), 2 (Unidades) y 3 (Drivers) del asistente.

import Link from "next/link";
import { useState } from "react";
import { Banner, Button, Field, Icon, Tag } from "./ds";
import { ArbolFilas, ArbolVista, EditorEstructura, ResumenArbol } from "./arbol";
import {
  DRIVERS, buscar, categoriasDe, clonar, contarHuecos, driversEfectivos, driversIniciales, nodo, nuevoId, recorrer,
  type Configuracion, type DriverId, type Drivers, type DriversConfig, type Estructura, type Flota, type Nodo,
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
// Tener un driver y que sea heredable son dos marcas distintas:
// - Tener: el hueco cuenta su vida con ese driver.
// - Heredable: su valor viene del padre (no se registra aparte). La unidad no tiene padre, así que nunca hereda.
export function Paso3({ c, set, est, flota, setFlota }: PasoProps) {
  const store = useStore();
  const raiz: Nodo = est!.raiz;
  const { drivers: d, heredables: h } = driversEfectivos(c, flota, raiz);
  const [catSel, setCatSel] = useState("");
  const compartida = c.driversModo === "flota";
  // Otras configuraciones de la flota que comparten estos drivers (misma estructura y modo flota)
  const companeras = store.configs.filter((x) => x.id !== c.id && x.guardada && x.flotaId === flota.id && x.estructuraId === c.estructuraId && x.driversModo === "flota");

  /** Guarda en la flota o en la configuración, según lo que haya elegido el usuario. */
  const guardar = (dc: DriversConfig) => {
    if (compartida) setFlota({ driversCompartidos: { ...flota.driversCompartidos, [est!.id]: dc } });
    else set(dc);
  };
  const elegirModo = (modo: "flota" | "propios") => {
    if (modo === c.driversModo) return;
    if (modo === "propios") set({ driversModo: "propios", drivers: d, heredables: h }); // parte de los valores compartidos
    else {
      if (!flota.driversCompartidos?.[est!.id]) setFlota({ driversCompartidos: { ...flota.driversCompartidos, [est!.id]: { drivers: d, heredables: h } } });
      set({ driversModo: "flota" });
    }
  };

  const marcar = (n: Nodo, drv: DriverId, valor: boolean, tiene: Drivers, hereda: Drivers) => {
    // Al marcar un driver en un hueco, también lo tienen todos sus hijos, que además lo heredan de él (el padre no).
    recorrer(n, (x) => {
      tiene[x.id] = { ...tiene[x.id], [drv]: valor };
      // El hueco marcado conserva su heredable; sus hijos pasan a heredar de él. Al desmarcar, nadie lo hereda.
      hereda[x.id] = { ...hereda[x.id], [drv]: !valor ? false : x.id === n.id ? !!hereda[x.id]?.[drv] : true };
    });
  };
  const padreTiene = (id: string, tiene: Drivers, drv: DriverId) => {
    let ok = false;
    recorrer(raiz, (x, _l, p) => { if (x.id === id && p) ok = !!tiene[p.id]?.[drv]; });
    return ok;
  };
  const cambiarTiene = (id: string, drv: DriverId, valor: boolean) => {
    const tiene = { ...d }, hereda = { ...h };
    marcar(buscar(raiz, id)!, drv, valor, tiene, hereda);
    guardar({ drivers: tiene, heredables: hereda });
  };
  const cambiarHeredable = (id: string, drv: DriverId, valor: boolean) => {
    guardar({ drivers: d, heredables: { ...h, [id]: { ...h[id], [drv]: valor } } });
  };
  const aplicarCategoria = (drv: DriverId, valor: boolean) => {
    const tiene = { ...d }, hereda = { ...h };
    recorrer(raiz, (n) => { if (n.categoria === catSel) marcar(n, drv, valor, tiene, hereda); });
    guardar({ drivers: tiene, heredables: hereda });
  };
  const cuenta = (m: Drivers, drv: DriverId) => Object.values(m).filter((x) => x[drv]).length;
  const COL = 88;

  return (
    <section className="lm-surface lm-surface--p24 stack gap-20">
      <div className="row gap-20">
        <h2 className="lm-title-medium grow" style={{ margin: 0 }}>Drivers</h2>
        <Button variant="text" icon="restart_alt" onClick={() => guardar(driversIniciales(raiz))}>Restablecer por defecto</Button>
      </div>
      <fieldset className="stack gap-10" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="lm-field__label" style={{ marginBottom: "var(--lm-space-10)" }}>¿De quién son estos drivers?</legend>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--lm-space-15)" }}>
          {([
            { modo: "flota", titulo: `Compartidos con la flota ${flota.codigo}`, desc: companeras.length
              ? `También los usan: ${companeras.map((x) => x.nombre).join(", ")}. Un cambio aquí les afecta.`
              : `Los usarán todas las configuraciones de ${flota.codigo} con ${est!.nombre} que elijan esta opción.` },
            { modo: "propios", titulo: "Propios de esta configuración", desc: "Solo afectan a esta configuración. Se parte de los valores actuales." },
          ] as const).map((o) => {
            const sel = c.driversModo === o.modo;
            return (
              <label key={o.modo} className="lm-card lm-radio" style={{ alignItems: "flex-start", borderColor: sel ? "var(--lm-sys-primary)" : undefined, background: sel ? "color-mix(in srgb, var(--lm-sys-primary) 8%, var(--lm-sys-surface-container-lowest))" : undefined }}>
                <input type="radio" name="drivers-modo" checked={sel} onChange={() => elegirModo(o.modo)} aria-label={o.titulo} />
                <span className="lm-radio__text gap-5">
                  <span className="lm-title-small">{o.titulo}</span>
                  <span className="lm-radio__support">{o.desc}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <Banner type="info" title="Tener un driver y que sea heredable son cosas distintas">
        <strong>Tener</strong>: el hueco cuenta su vida con ese driver (por defecto, el kilometraje lo tienen todos). <strong>Heredable</strong>: el valor viene del padre y no hay que registrarlo aparte (por defecto, todos menos la unidad). Al marcar un driver en un hueco, también lo tienen sus hijos y lo heredan de él.
      </Banner>
      <div className="row gap-10 wrap">
        {DRIVERS.map((x) => (
          <Tag key={x.id} tone="primary">{x.nombre}: {cuenta(d, x.id)} huecos · {cuenta(h, x.id)} heredables</Tag>
        ))}
      </div>
      <div className="lm-card row gap-15 wrap">
        <span className="lm-title-small">Aplicar a toda una categoría</span>
        <select className="lm-select lm-select--dense" style={{ width: 220 }} aria-label="Categoría" value={catSel} onChange={(e) => setCatSel(e.target.value)}>
          <option value="">Selecciona una categoría</option>
          {categoriasDe(raiz).map((x) => <option key={x.categoria} value={x.categoria}>{x.categoria} ({x.huecos})</option>)}
        </select>
        {DRIVERS.map((x) => (
          <span key={x.id} className="row gap-5">
            <Button small variant="outlined" disabled={!catSel} onClick={() => aplicarCategoria(x.id, true)}>Marcar {x.corto}</Button>
            <Button small variant="text" disabled={!catSel} onClick={() => aplicarCategoria(x.id, false)}>Quitar</Button>
          </span>
        ))}
      </div>
      <div className="lm-card">
        <div className="row" style={{ height: "var(--lm-space-40)" }}>
          <span className="grow" />
          {DRIVERS.map((x) => (
            <span key={x.id} className="lm-label-medium" style={{ width: COL * 2, textAlign: "center", borderBottom: "1px solid var(--lm-sys-outline-variant)", margin: "0 var(--lm-space-5)" }}>
              {x.nombre.toUpperCase()}
            </span>
          ))}
        </div>
        <div className="row" style={{ height: "var(--lm-space-40)", borderBottom: "1px solid var(--lm-sys-outline-variant)" }}>
          <span className="lm-label-medium grow" style={{ paddingLeft: "var(--lm-space-50)" }}>HUECO</span>
          {DRIVERS.map((x) => (
            <span key={x.id} className="row" style={{ margin: "0 var(--lm-space-5)" }}>
              <span className="lm-label-small muted" style={{ width: COL, textAlign: "center" }}>TIENE</span>
              <span className="lm-label-small muted" style={{ width: COL, textAlign: "center" }}>HEREDABLE</span>
            </span>
          ))}
        </div>
        <ArbolFilas raiz={raiz} abiertosIni={3} render={(n) => (
          <>
            <span className="grow row gap-10">
              <span style={{ fontWeight: n.hijos.length ? 500 : 400 }}>{n.nombre}</span>
              {n.id === raiz.id && <Tag tone="neutral">Unidad</Tag>}
            </span>
            {DRIVERS.map((x) => {
              const tiene = !!d[n.id]?.[x.id];
              const puedeHeredar = tiene && n.id !== raiz.id && padreTiene(n.id, d, x.id);
              return (
                <span key={x.id} className="row" style={{ margin: "0 var(--lm-space-5)" }}>
                  <span style={{ width: COL, display: "flex", justifyContent: "center" }}>
                    <input type="checkbox" style={{ width: 18, height: 18, accentColor: "var(--lm-sys-primary)" }}
                      aria-label={`${n.nombre} tiene ${x.nombre}`} checked={tiene} onChange={(e) => cambiarTiene(n.id, x.id, e.target.checked)} />
                  </span>
                  <span style={{ width: COL, display: "flex", justifyContent: "center" }}>
                    <input type="checkbox" style={{ width: 18, height: 18, accentColor: "var(--lm-sys-primary)" }}
                      aria-label={`${x.nombre} heredable en ${n.nombre}`} disabled={!puedeHeredar}
                      title={n.id === raiz.id ? "La unidad no tiene padre del que heredar" : !tiene ? `Marca antes que tiene ${x.nombre}` : !puedeHeredar ? `El padre no tiene ${x.nombre}` : undefined}
                      checked={puedeHeredar && !!h[n.id]?.[x.id]} onChange={(e) => cambiarHeredable(n.id, x.id, e.target.checked)} />
                  </span>
                </span>
              );
            })}
          </>
        )} />
      </div>
    </section>
  );
}
