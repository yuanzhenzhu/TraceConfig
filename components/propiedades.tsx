"use client";

// Editores de un perfil de propiedades (HU-14 a HU-20). Se usan en Configuración › Propiedades y en los pasos 4 y 5 del asistente.
// - Propiedades de categoría: dependen de las categorías de la estructura.
// - Propiedades de hueco: dependen de los huecos de la estructura.

import { useMemo, useState } from "react";
import { Button, Icon, SearchInput, Tag } from "./ds";
import { ArbolFilas, iconoCategoria } from "./arbol";
import { PROPS_CATEGORIA, PROPS_HUECO, categoriasDe, recorrer, rutaDe, type Nodo, type PropiedadesConfig } from "@/lib/model";

export function resumenPropiedades(raiz: Nodo, p: PropiedadesConfig) {
  const cats = new Set(categoriasDe(raiz).map((x) => x.categoria));
  const nCat = Object.entries(p.propsCategoria).filter(([k]) => cats.has(k)).reduce((s, [, l]) => s + l.length, 0);
  let nHuecos = 0; recorrer(raiz, (h) => { if (Object.keys(p.propsHueco[h.id] ?? {}).length) nHuecos++; });
  return { nCat, nHuecos };
}

/* ---------- Propiedades de categoría ---------- */
export function EditorPropsCategoria({ raiz, valor, onChange }: {
  raiz: Nodo; valor: PropiedadesConfig["propsCategoria"]; onChange: (v: PropiedadesConfig["propsCategoria"]) => void;
}) {
  const cats = categoriasDe(raiz);
  const [sel, setSel] = useState(cats[0]?.categoria ?? "");
  const [buscaCat, setBuscaCat] = useState("");
  const [buscaProp, setBuscaProp] = useState("");
  const asignadas = valor[sel] ?? [];
  const props = PROPS_CATEGORIA.filter((p) => p.nombre.toLowerCase().includes(buscaProp.toLowerCase()));

  const toggle = (propId: string, on: boolean) => {
    const lista = on ? [...asignadas, { propId, historico: false }] : asignadas.filter((a) => a.propId !== propId);
    onChange({ ...valor, [sel]: lista });
  };
  const historico = (propId: string, on: boolean) => onChange({ ...valor, [sel]: asignadas.map((a) => (a.propId === propId ? { ...a, historico: on } : a)) });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "var(--lm-space-20)", alignItems: "start" }}>
      <aside className="lm-card stack gap-10" aria-label="Categorías de la estructura">
        <SearchInput label="Buscar categoría" placeholder="Buscar categoría" value={buscaCat} onChange={setBuscaCat} />
        <div className="stack" role="listbox" aria-label="Categorías">
          {cats.filter((x) => x.categoria.toLowerCase().includes(buscaCat.toLowerCase())).map((x) => {
            const n = (valor[x.categoria] ?? []).length;
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
  );
}

/* ---------- Propiedades de hueco ---------- */
export function EditorPropsHueco({ raiz, valor, onChange }: {
  raiz: Nodo; valor: PropiedadesConfig["propsHueco"]; onChange: (v: PropiedadesConfig["propsHueco"]) => void;
}) {
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
    const asign = sel.map((id) => valor[id]?.[propId]).filter((v) => v !== undefined);
    const valores = new Set(asign);
    return {
      todas: asign.length === sel.length && sel.length > 0,
      algunas: asign.length > 0 && asign.length < sel.length,
      valor: valores.size === 1 ? [...valores][0] ?? "" : "",
      varios: valores.size > 1,
    };
  };
  const asignar = (propId: string, on: boolean) => {
    const nuevo = { ...valor };
    sel.forEach((id) => {
      const actual = { ...(nuevo[id] ?? {}) };
      if (on) actual[propId] = actual[propId] ?? ""; else delete actual[propId];
      nuevo[id] = actual;
    });
    onChange(nuevo);
  };
  const cambiarValor = (propId: string, v: string) => {
    const nuevo = { ...valor };
    sel.forEach((id) => { nuevo[id] = { ...(nuevo[id] ?? {}), [propId]: v }; });
    onChange(nuevo);
  };
  const conProps = useMemo(() => { let n = 0; recorrer(raiz, (h) => { if (Object.keys(valor[h.id] ?? {}).length) n++; }); return n; }, [valor, raiz]);

  return (
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
            const np = Object.keys(valor[n.id] ?? {}).length;
            return (
              <label className="lm-check grow" style={{ minHeight: "var(--lm-space-50)" }}>
                <input type="checkbox" checked={sel.includes(n.id)} onChange={(e) => { setCat(""); toggleHueco(n.id, e.target.checked); }} aria-label={`Seleccionar ${n.nombre}`} />
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
                      placeholder={e.varios ? "Varios valores" : `Opcional, por ejemplo: ${p.ejemplo}`} onChange={(ev) => cambiarValor(p.id, ev.target.value)} />
                  )}
                </div>
              );
            })}
          </>
        )}
      </aside>
    </div>
  );
}
