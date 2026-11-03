"use client";

// Pasos 4 (Propiedades de categoría), 5 (Propiedades de hueco) y 6 (Cálculos en SMS).

import { useMemo, useState } from "react";
import { Banner, Button, Field, Icon, SearchInput, Tag } from "./ds";
import { ArbolFilas, iconoCategoria } from "./arbol";
import {
  DRIVERS, FORMAS_CALCULO, PROPS_CATEGORIA, PROPS_HUECO, categoriasDe, recorrer, rutaDe,
  type DriverId, type Flota,
} from "@/lib/model";
import type { PasoProps } from "./pasos-1-3";

/* ---------- Paso 4 ---------- */
function AvisoFlota({ flota }: { flota: Flota }) {
  return (
    <Banner type="info" title={`Se aplica a toda la flota ${flota.codigo}`}>
      Esta información es de la flota y la comparten todas sus configuraciones. Si cambias algo aquí, cambia para todas ellas.
    </Banner>
  );
}

export function Paso4({ est, flota, setFlota }: PasoProps) {
  const cats = categoriasDe(est!.raiz);
  const [sel, setSel] = useState(cats[0]?.categoria ?? "");
  const [buscaCat, setBuscaCat] = useState("");
  const [buscaProp, setBuscaProp] = useState("");
  const asignadas = flota.propsCategoria[sel] ?? [];
  const props = PROPS_CATEGORIA.filter((p) => p.nombre.toLowerCase().includes(buscaProp.toLowerCase()));

  const toggle = (propId: string, on: boolean) => {
    const lista = on ? [...asignadas, { propId, historico: false }] : asignadas.filter((a) => a.propId !== propId);
    setFlota({ propsCategoria: { ...flota.propsCategoria, [sel]: lista } });
  };
  const historico = (propId: string, on: boolean) => {
    setFlota({ propsCategoria: { ...flota.propsCategoria, [sel]: asignadas.map((a) => (a.propId === propId ? { ...a, historico: on } : a)) } });
  };

  return (
    <section className="lm-surface lm-surface--p24 stack gap-20">
      <h2 className="lm-title-medium" style={{ margin: 0 }}>Propiedades de categoría</h2>
      <p className="muted" style={{ margin: 0 }}>Elige qué propiedades se registran para cada categoría. Las propiedades asignadas aparecerán como columnas en su plantilla.</p>
      <AvisoFlota flota={flota} />
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "var(--lm-space-20)", alignItems: "start" }}>
        <aside className="lm-card stack gap-10" aria-label="Categorías de la estructura">
          <SearchInput label="Buscar categoría" placeholder="Buscar categoría" value={buscaCat} onChange={setBuscaCat} />
          <div className="stack" role="listbox" aria-label="Categorías">
            {cats.filter((x) => x.categoria.toLowerCase().includes(buscaCat.toLowerCase())).map((x) => {
              const n = (flota.propsCategoria[x.categoria] ?? []).length;
              return (
                <button key={x.categoria} role="option" aria-selected={sel === x.categoria} onClick={() => setSel(x.categoria)}
                  className="lm-palette-item row gap-10" style={{ cursor: "pointer", background: sel === x.categoria ? "var(--lm-sys-secondary-container)" : undefined }}>
                  <Icon name={iconoCategoria(x.categoria)} size="m" />
                  <span className="grow">{x.categoria}</span>
                  {n > 0 ? <Tag tone="primary" num={n}>{n === 1 ? "propiedad" : "propiedades"}</Tag> : <span className="lm-body-small muted">Sin propiedades</span>}
                </button>
              );
            })}
          </div>
        </aside>
        <div className="lm-card stack gap-15">
          <div className="row gap-15">
            <span className="lm-title-small grow">Propiedades de {sel}</span>
            <div style={{ width: 280 }}><SearchInput label="Buscar propiedad" placeholder="Buscar propiedad" value={buscaProp} onChange={setBuscaProp} /></div>
          </div>
          <table className="lm-table">
            <thead><tr><th style={{ width: 48 }}><span className="sr-only">Asignar</span></th><th>Propiedad</th><th>Tipo</th><th>Guardar histórico</th></tr></thead>
            <tbody>
              {props.map((p) => {
                const a = asignadas.find((x) => x.propId === p.id);
                return (
                  <tr key={p.id}>
                    <td><label className="lm-check"><input type="checkbox" checked={!!a} onChange={(e) => toggle(p.id, e.target.checked)} aria-label={`Asignar ${p.nombre} a ${sel}`} /></label></td>
                    <td className={a ? "emph" : ""}>{p.nombre}</td>
                    <td className="muted">{p.tipo}</td>
                    <td>
                      <label className="lm-toggle lm-toggle--small">
                        <input type="checkbox" role="switch" disabled={!a} checked={!!a?.historico} onChange={(e) => historico(p.id, e.target.checked)} aria-label={`Guardar histórico de ${p.nombre}`} />
                        <span className={a ? "" : "muted"}>{a?.historico ? "Sí" : "No"}</span>
                      </label>
                    </td>
                  </tr>
                );
              })}
              {props.length === 0 && <tr><td colSpan={4} className="muted">No hay propiedades con ese nombre</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ---------- Paso 5 ---------- */
export function Paso5({ est, flota, setFlota }: PasoProps) {
  const raiz = est!.raiz;
  const propsHueco = flota.propsHueco;
  const [sel, setSel] = useState<string[]>([]);
  const [cat, setCat] = useState("");
  const cats = categoriasDe(raiz);

  const seleccionarCategoria = (categoria: string) => {
    const ids: string[] = [];
    recorrer(raiz, (n) => { if (n.categoria === categoria) ids.push(n.id); });
    setSel(ids);
  };
  const toggleHueco = (id: string, on: boolean) => setSel((s) => (on ? [...s, id] : s.filter((x) => x !== id)));

  // Estado de cada propiedad en la selección
  const estadoProp = (propId: string) => {
    const vals = sel.map((id) => propsHueco[id]?.[propId]);
    const asign = vals.filter((v) => v !== undefined);
    const valores = new Set(asign);
    return {
      todas: asign.length === sel.length && sel.length > 0,
      algunas: asign.length > 0 && asign.length < sel.length,
      valor: valores.size === 1 ? [...valores][0] ?? "" : "",
      varios: valores.size > 1,
    };
  };
  const asignar = (propId: string, on: boolean) => {
    const nuevo = { ...propsHueco };
    sel.forEach((id) => {
      const actual = { ...(nuevo[id] ?? {}) };
      if (on) actual[propId] = actual[propId] ?? ""; else delete actual[propId];
      nuevo[id] = actual;
    });
    setFlota({ propsHueco: nuevo });
  };
  const valor = (propId: string, v: string) => {
    const nuevo = { ...propsHueco };
    sel.forEach((id) => { nuevo[id] = { ...(nuevo[id] ?? {}), [propId]: v }; });
    setFlota({ propsHueco: nuevo });
  };
  const conProps = useMemo(() => {
    let n = 0; recorrer(raiz, (h) => { if (Object.keys(propsHueco[h.id] ?? {}).length) n++; }); return n;
  }, [propsHueco, raiz]);

  return (
    <section className="lm-surface lm-surface--p24 stack gap-20">
      <h2 className="lm-title-medium" style={{ margin: 0 }}>Propiedades de hueco</h2>
      <Banner type="info">
        Las propiedades de hueco describen la posición (por ejemplo, el lado de una rueda), no el activo montado. Sus valores se pueden rellenar ahora o más adelante y <strong>no aparecen en las plantillas</strong>.
      </Banner>
      <AvisoFlota flota={flota} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 440px", gap: "var(--lm-space-20)", alignItems: "start" }}>
        <div className="lm-card stack gap-10">
          <div className="row gap-10 wrap">
            <span className="lm-title-small grow">Huecos · {conProps} con propiedades</span>
            <select className="lm-select lm-select--dense" style={{ width: 240 }} aria-label="Seleccionar todos los huecos de una categoría" value={cat}
              onChange={(e) => { setCat(e.target.value); if (e.target.value) seleccionarCategoria(e.target.value); }}>
              <option value="">Seleccionar por categoría…</option>
              {cats.map((x) => <option key={x.categoria} value={x.categoria}>Todos: {x.categoria} ({x.huecos})</option>)}
            </select>
            {sel.length > 0 && <Button variant="text" small onClick={() => { setSel([]); setCat(""); }}>Quitar selección</Button>}
          </div>
          <div style={{ maxHeight: 520, overflow: "auto" }}>
            <ArbolFilas raiz={raiz} abiertosIni={3} render={(n) => {
              const marcado = sel.includes(n.id);
              const np = Object.keys(propsHueco[n.id] ?? {}).length;
              return (
                <label className="lm-check grow" style={{ minHeight: "var(--lm-space-50)" }}>
                  <input type="checkbox" checked={marcado} onChange={(e) => { setCat(""); toggleHueco(n.id, e.target.checked); }} aria-label={`Seleccionar ${n.nombre}`} />
                  <span style={{ fontWeight: n.hijos.length ? 500 : 400 }} className="grow">{n.nombre}</span>
                  {np > 0 && <Tag tone="primary" num={np}>prop.</Tag>}
                </label>
              );
            }} />
          </div>
        </div>

        <aside className="lm-card stack gap-15" aria-label="Propiedades de los huecos seleccionados" style={{ position: "sticky", top: "calc(var(--lm-space-60) + var(--lm-space-20))" }}>
          {sel.length === 0 ? (
            <div className="lm-center" style={{ padding: "var(--lm-space-50) var(--lm-space-20)" }}>
              <Icon name="radio_button_checked" size="xl" />
              <span>Selecciona uno o varios huecos para asignarles propiedades</span>
              <span className="lm-body-small">Consejo: usa "Seleccionar por categoría" para elegir, por ejemplo, todas las ruedas a la vez</span>
            </div>
          ) : (
            <>
              <span className="lm-title-small">{sel.length === 1 ? rutaDe(raiz, sel[0]).join(" › ") || raiz.nombre : `${sel.length} huecos seleccionados`}</span>
              {PROPS_HUECO.map((p) => {
                const e = estadoProp(p.id);
                return (
                  <div key={p.id} className="stack gap-5" style={{ paddingBottom: "var(--lm-space-10)", borderBottom: "1px solid var(--lm-sys-outline-variant)" }}>
                    <label className="lm-check">
                      <input type="checkbox" checked={e.todas} ref={(el) => { if (el) el.indeterminate = e.algunas; }} onChange={(ev) => asignar(p.id, ev.target.checked)} />
                      <span className="grow">{p.nombre}</span>
                      <span className="lm-body-small muted">{p.tipo}</span>
                    </label>
                    {e.todas && (
                      <input className="lm-input lm-input--dense" aria-label={`Valor de ${p.nombre}`} value={e.valor}
                        placeholder={e.varios ? "Varios valores" : `Opcional, por ejemplo: ${p.ejemplo}`} onChange={(ev) => valor(p.id, ev.target.value)} />
                    )}
                  </div>
                );
              })}
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

/* ---------- Paso 6 ---------- */
export function Paso6({ flota, setFlota }: PasoProps) {
  if (!flota.usaSms) {
    return (
      <section className="lm-surface lm-surface--p24">
        <Banner type="info" title="Este cliente no usa SMS">Este paso no aplica para la flota {flota.codigo}. Puedes continuar.</Banner>
      </section>
    );
  }
  const sms = flota.sms ?? { ambito: "flota" as const, driver: "km" as DriverId, calculo: "real" };
  const upd = (x: Partial<typeof sms>) => setFlota({ sms: { ...sms, ...x } });
  return (
    <section className="lm-surface lm-surface--p24 stack gap-20" style={{ maxWidth: 820 }}>
      <h2 className="lm-title-medium" style={{ margin: 0 }}>Cálculos en SMS</h2>
      <p className="muted" style={{ margin: 0 }}>SMS es la herramienta de planificación de mantenimientos. Indica con qué datos de la flota debe calcular. Podrás cambiarlo más adelante.</p>
      <AvisoFlota flota={flota} />
      <fieldset className="stack gap-10" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="lm-field__label" style={{ marginBottom: "var(--lm-space-10)" }}>Ámbito del cálculo</legend>
        <label className="lm-radio"><input type="radio" name="ambito" checked={sms.ambito === "flota"} onChange={() => upd({ ambito: "flota" })} />Flota {flota.codigo} completa</label>
        <label className="lm-radio"><input type="radio" name="ambito" checked={sms.ambito === "linea"} onChange={() => upd({ ambito: "linea" })} />Por línea</label>
      </fieldset>
      <Field label="Driver" htmlFor="sms-driver" style={{ width: 280 }}>
        <select id="sms-driver" className="lm-select" value={sms.driver} onChange={(e) => upd({ driver: e.target.value as DriverId })}>
          {DRIVERS.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </select>
      </Field>
      <fieldset className="stack gap-10" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="lm-field__label" style={{ marginBottom: "var(--lm-space-10)" }}>Forma de cálculo</legend>
        {FORMAS_CALCULO.map((f) => (
          <label key={f.id} className="lm-radio" style={{ alignItems: "flex-start" }}>
            <input type="radio" name="calculo" checked={sms.calculo === f.id} onChange={() => upd({ calculo: f.id })} />
            <span className="lm-radio__text"><span>{f.nombre}</span><span className="lm-radio__support">{f.desc}</span></span>
          </label>
        ))}
      </fieldset>
      <span className="lm-body-small muted">Las formas de cálculo son de ejemplo (ficticias) hasta confirmar las reales.</span>
    </section>
  );
}
