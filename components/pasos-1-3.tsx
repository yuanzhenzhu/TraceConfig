"use client";

// Pasos 1 (Datos y estructura), 2 (Unidades) y 3 (Drivers) del asistente.

import { useState } from "react";
import { Banner, Button, Field, Icon, Tag } from "./ds";
import { ArbolFilas, ArbolVista, EditorEstructura, ResumenArbol } from "./arbol";
import {
  DRIVERS, ESTRUCTURAS, buscar, categoriasDe, clonar, contarHuecos, driversPorDefecto, nodo, nuevoId, recorrer,
  type Configuracion, type DriverId, type Drivers, type Estructura,
} from "@/lib/model";

export type PasoProps = { c: Configuracion; set: (cambios: Partial<Configuracion>) => void; intentado: boolean };

/* ---------- Paso 1 ---------- */
export function Paso1({ c, set, intentado }: PasoProps) {
  const bloqueada = c.guardada; // ya tiene unidades: solo extremos
  const esNueva = !!c.estructura && !ESTRUCTURAS.some((e) => e.id === c.estructura!.id);
  const [modo, setModo] = useState<"existente" | "nueva">(esNueva ? "nueva" : "existente");
  const [origen, setOrigen] = useState<"existente" | "cero">("cero");
  const [base, setBase] = useState(ESTRUCTURAS[0].id);

  const elegir = (e: Estructura) => set({ estructura: e });
  const crearNueva = (o: "existente" | "cero", baseId = base) => {
    const b = ESTRUCTURAS.find((e) => e.id === baseId)!;
    const raiz = o === "existente" ? { ...clonar(b.raiz), nombre: "Tren" } : nodo("Tren", "Tren");
    set({ estructura: { id: nuevoId("est"), nombre: c.estructura && esNueva ? c.estructura.nombre : "", descripcion: "", raiz } });
  };

  const errNombre = intentado && !c.nombre.trim() ? "Indica el nombre de la configuración" : "";
  const errEstructura = intentado && !c.estructura ? "Selecciona o crea una estructura" : "";
  const errNombreEst = intentado && modo === "nueva" && c.estructura && !c.estructura.nombre.trim() ? "Indica el nombre de la estructura" : "";
  const errVacia = intentado && c.estructura && c.estructura.raiz.hijos.length === 0 ? "La estructura está vacía: añade al menos un elemento" : "";

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
        {bloqueada && c.estructura ? (
          <>
            <span className="row gap-10"><strong>{c.estructura.nombre}</strong><ResumenArbol raiz={c.estructura.raiz} /></span>
            <EditorEstructura soloExtremos raiz={c.estructura.raiz} onChange={(raiz) => set({ estructura: { ...c.estructura!, raiz } })} />
          </>
        ) : (
          <>
            <div className="lm-tabs" role="tablist" style={{ marginBottom: 0 }}>
              <button role="tab" className="lm-tab" aria-selected={modo === "existente"} onClick={() => { setModo("existente"); if (esNueva) set({ estructura: null }); }}>
                <Icon name="list" /> Usar una estructura existente
              </button>
              <button role="tab" className="lm-tab" aria-selected={modo === "nueva"} onClick={() => { setModo("nueva"); if (!esNueva) crearNueva(origen); }}>
                <Icon name="add" /> Crear una estructura nueva
              </button>
            </div>
            {errEstructura && <Banner type="error">{errEstructura}</Banner>}

            {modo === "existente" ? (
              <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "var(--lm-space-20)", alignItems: "start" }}>
                <div className="stack gap-10" role="radiogroup" aria-label="Estructuras existentes">
                  {ESTRUCTURAS.map((e) => {
                    const sel = c.estructura?.id === e.id;
                    return (
                      <label key={e.id} className="lm-card lm-radio" style={{ alignItems: "flex-start", borderColor: sel ? "var(--lm-sys-primary)" : undefined, background: sel ? "color-mix(in srgb, var(--lm-sys-primary) 8%, var(--lm-sys-surface-container-lowest))" : undefined }}>
                        <input type="radio" name="estructura" checked={sel} onChange={() => elegir(e)} aria-label={`${e.nombre}: ${e.descripcion}`} />
                        <span className="lm-radio__text gap-5">
                          <span className="lm-title-small">{e.nombre}</span>
                          <span className="lm-radio__support">{e.descripcion}</span>
                          <span className="lm-body-small muted">{contarHuecos(e.raiz)} huecos por unidad</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="lm-card">
                  {c.estructura ? (
                    <>
                      <div className="stack gap-10" style={{ marginBottom: "var(--lm-space-10)" }}>
                        <span className="lm-title-small">Vista previa · {c.estructura.nombre}</span>
                        <ResumenArbol raiz={c.estructura.raiz} />
                      </div>
                      <ArbolVista raiz={c.estructura.raiz} />
                    </>
                  ) : (
                    <div className="lm-center"><Icon name="find_in_page" size="xl" />Selecciona una estructura para ver su composición</div>
                  )}
                </div>
              </div>
            ) : c.estructura ? (
              <div className="stack gap-20">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "var(--lm-space-20)" }}>
                  <Field label="Nombre de la estructura" required htmlFor="e-nombre" error={errNombreEst}>
                    <input id="e-nombre" className="lm-input" value={c.estructura.nombre} aria-invalid={!!errNombreEst} placeholder="Por ejemplo: Estructura 4"
                      onChange={(e) => set({ estructura: { ...c.estructura!, nombre: e.target.value } })} />
                  </Field>
                  <Field label="Descripción de la estructura" htmlFor="e-desc">
                    <input id="e-desc" className="lm-input" value={c.estructura.descripcion}
                      onChange={(e) => set({ estructura: { ...c.estructura!, descripcion: e.target.value } })} />
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
                      {ESTRUCTURAS.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                  )}
                </fieldset>
                {errVacia && <Banner type="error">{errVacia}</Banner>}
                <EditorEstructura raiz={c.estructura.raiz} onChange={(raiz) => set({ estructura: { ...c.estructura!, raiz } })} />
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

export function paso1Valido(c: Configuracion) {
  return !!c.nombre.trim() && !!c.estructura && !!c.estructura.nombre.trim() && c.estructura.raiz.hijos.length > 0;
}

/* ---------- Paso 2 ---------- */
export function Paso2({ c, set, intentado }: PasoProps) {
  const [texto, setTexto] = useState(c.unidades ? String(c.unidades) : "");
  const n = Number(texto);
  const valido = Number.isInteger(n) && n >= 1 && n <= 999;
  const err = intentado && !valido ? "Indica un número entero entre 1 y 999" : "";
  const huecos = c.estructura ? contarHuecos(c.estructura.raiz) : 0;
  return (
    <section className="lm-surface lm-surface--p24 stack gap-20" style={{ maxWidth: 720 }}>
      <h2 className="lm-title-medium" style={{ margin: 0 }}>Unidades</h2>
      <p className="muted" style={{ margin: 0 }}>Indica cuántas unidades (trenes) de la flota usan la estructura <strong>{c.estructura?.nombre}</strong>.</p>
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
export function Paso3({ c, set }: PasoProps) {
  const raiz = c.estructura!.raiz;
  const d: Drivers = Object.keys(c.drivers).length ? c.drivers : driversPorDefecto(raiz);
  const [catSel, setCatSel] = useState("");

  const cambiar = (id: string, drv: DriverId, valor: boolean) => {
    const n = buscar(raiz, id)!;
    const nuevo: Drivers = { ...d };
    // Heredable: el cambio se aplica al hueco y a todos sus hijos, nunca al padre.
    recorrer(n, (h) => { nuevo[h.id] = { ...nuevo[h.id], [drv]: valor }; });
    set({ drivers: nuevo });
  };
  const aplicarCategoria = (drv: DriverId, valor: boolean) => {
    const nuevo: Drivers = { ...d };
    recorrer(raiz, (n) => { if (n.categoria === catSel) recorrer(n, (h) => { nuevo[h.id] = { ...nuevo[h.id], [drv]: valor }; }); });
    set({ drivers: nuevo });
  };
  const cuenta = (drv: DriverId) => Object.values(d).filter((x) => x[drv]).length;

  return (
    <section className="lm-surface lm-surface--p24 stack gap-20">
      <div className="row gap-20">
        <h2 className="lm-title-medium grow" style={{ margin: 0 }}>Drivers</h2>
        <Button variant="text" icon="restart_alt" onClick={() => set({ drivers: driversPorDefecto(raiz) })}>Restablecer por defecto</Button>
      </div>
      <Banner type="info" title="Cómo funcionan los drivers">
        Un driver es la forma de contar la vida de un activo. Por defecto, el kilometraje está marcado en toda la estructura menos en la unidad. Al marcar un driver en un hueco, se marca también en todos sus hijos, pero no en el padre.
      </Banner>
      <div className="row gap-20 wrap">
        {DRIVERS.map((x) => <Tag key={x.id} tone="primary" num={cuenta(x.id)}>{x.nombre}</Tag>)}
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
        <div className="row" style={{ height: "var(--lm-space-50)", borderBottom: "1px solid var(--lm-sys-outline-variant)" }}>
          <span className="lm-label-medium grow" style={{ paddingLeft: "var(--lm-space-50)" }}>HUECO</span>
          {DRIVERS.map((x) => <span key={x.id} className="lm-label-medium" style={{ width: 96, textAlign: "center" }}>{x.nombre.toUpperCase()}</span>)}
        </div>
        <ArbolFilas raiz={raiz} abiertosIni={3} render={(n) => (
          <>
            <span className="grow row gap-10">
              <span style={{ fontWeight: n.hijos.length ? 500 : 400 }}>{n.nombre}</span>
              {n.id === raiz.id && <Tag tone="neutral">Unidad</Tag>}
            </span>
            {DRIVERS.map((x) => (
              <span key={x.id} style={{ width: 96, display: "flex", justifyContent: "center" }}>
                <input type="checkbox" className="lm-check" style={{ width: 18, height: 18, accentColor: "var(--lm-sys-primary)" }}
                  aria-label={`${x.nombre} en ${n.nombre}`} checked={!!d[n.id]?.[x.id]} onChange={(e) => cambiar(n.id, x.id, e.target.checked)} />
              </span>
            ))}
          </>
        )} />
      </div>
    </section>
  );
}
