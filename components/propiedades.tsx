"use client";

// Editores de propiedades (HU-14 a HU-20).
// - Propiedades de categoría: únicas para todo el cliente (Configuración › Propiedades de categoría y paso 4).
// - Propiedades de hueco: la estructura define cuáles tiene cada hueco (Configuración › Estructuras) y cada
//   configuración les da valor (paso 2 del asistente, opcional).
// - Propiedades de categoría: dependen de las categorías de la estructura.
// - Propiedades de hueco: dependen de los huecos de la estructura.

import { useMemo, useState } from "react";
import { Button, ButtonToggle, EmptyState, Field, Icon, SearchInput, Tag } from "./ds";
import { ArbolFilas, iconoCategoria } from "./arbol";
import { PROPS_CATEGORIA, PROPS_HUECO, categoriasDe, recorrer, rutaDe, type Nodo, type PropiedadesConfig, type PropsHueco } from "@/lib/model";

export function resumenPropiedades(raiz: Nodo, p: PropiedadesConfig) {
  const cats = new Set(categoriasDe(raiz).map((x) => x.categoria));
  const nCat = Object.entries(p.propsCategoria).filter(([k]) => cats.has(k)).reduce((s, [, l]) => s + l.length, 0);
  let nHuecos = 0; recorrer(raiz, (h) => { if (Object.keys(p.propsHueco[h.id] ?? {}).length) nHuecos++; });
  return { nCat, nHuecos };
}

/* ---------- Propiedades de categoría ---------- */
export function EditorPropsCategoria({ raiz, categorias, valor, onChange, soloLectura }: {
  /** Las categorías salen de la estructura (raiz) o de una lista (todas las del cliente). */
  raiz?: Nodo; categorias?: string[];
  valor: PropiedadesConfig["propsCategoria"]; onChange: (v: PropiedadesConfig["propsCategoria"]) => void; soloLectura?: boolean;
}) {
  const cats = raiz ? categoriasDe(raiz) : (categorias ?? []).map((categoria) => ({ categoria }));
  const [sel, setSel] = useState(cats[0]?.categoria ?? "");
  const [buscaCat, setBuscaCat] = useState("");
  const [buscaProp, setBuscaProp] = useState("");
  const asignadas = valor[sel] ?? [];
  // (Prueba) Ver solo lo asignado: en las propiedades de la categoría y en la lista de categorías
  const [vistaProps, setVistaProps] = useState<"asignadas" | "todas">((valor[cats[0]?.categoria ?? ""] ?? []).length ? "asignadas" : "todas");
  const [vistaCats, setVistaCats] = useState<"todas" | "con">("todas");
  const elegir = (c: string) => { setSel(c); setVistaProps((valor[c] ?? []).length ? "asignadas" : "todas"); };
  const conProps = cats.filter((x) => (valor[x.categoria] ?? []).length > 0).length;
  const busca = (p: { nombre: string }) => p.nombre.toLowerCase().includes(buscaProp.toLowerCase());
  const props = vistaProps === "asignadas"
    ? asignadas.map((a) => PROPS_CATEGORIA.find((p) => p.id === a.propId)!).filter(Boolean).filter(busca)
    // En Todas, las asignadas primero
    : [...PROPS_CATEGORIA].filter(busca).sort((a, b) => Number(!asignadas.some((x) => x.propId === a.id)) - Number(!asignadas.some((x) => x.propId === b.id)));

  const toggle = (propId: string, on: boolean) => {
    const lista = on ? [...asignadas, { propId, historico: false }] : asignadas.filter((a) => a.propId !== propId);
    onChange({ ...valor, [sel]: lista });
  };
  const historico = (propId: string, on: boolean) => onChange({ ...valor, [sel]: asignadas.map((a) => (a.propId === propId ? { ...a, historico: on } : a)) });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "var(--lm-space-20)", alignItems: "start" }}>
      <aside className="lm-card stack gap-10" aria-label="Categorías de la estructura">
        <SearchInput label="Buscar categoría" placeholder="Buscar categoría" value={buscaCat} onChange={setBuscaCat} />
        <ButtonToggle label="Categorías que se muestran" value={vistaCats} onChange={setVistaCats}
          options={[{ value: "todas", label: `Todas (${cats.length})` }, { value: "con", label: `Con propiedades (${conProps})` }]} />
        <div className="stack" role="listbox" aria-label="Categorías">
          {cats.filter((x) => x.categoria.toLowerCase().includes(buscaCat.toLowerCase()))
            .filter((x) => vistaCats === "todas" || (valor[x.categoria] ?? []).length > 0 || x.categoria === sel).map((x) => {
            const n = (valor[x.categoria] ?? []).length;
            return (
              <button key={x.categoria} role="option" aria-selected={sel === x.categoria} onClick={() => elegir(x.categoria)}
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
        <div className="row gap-15 wrap">
          <span className="lm-title-small grow">Propiedades de {sel}</span>
          <ButtonToggle label="Propiedades que se muestran" value={vistaProps} onChange={setVistaProps}
            options={[{ value: "asignadas", label: `Asignadas (${asignadas.length})` }, { value: "todas", label: `Todas (${PROPS_CATEGORIA.length})` }]} />
          <div style={{ width: 240 }}><SearchInput label="Buscar propiedad" placeholder="Buscar propiedad" value={buscaProp} onChange={setBuscaProp} /></div>
        </div>
        {vistaProps === "asignadas" && asignadas.length === 0 ? (
          <EmptyState icon="list" title={`${sel} no tiene propiedades`} text="Las propiedades se registran para cada activo de esta categoría"
            action={!soloLectura ? <Button variant="outlined" icon="add" onClick={() => setVistaProps("todas")}>Asignar propiedades</Button> : undefined} />
        ) : (
        <table className="lm-table">
          <thead><tr><th style={{ width: 48 }}><span className="sr-only">Asignar</span></th><th>Propiedad</th><th>Guardar histórico</th></tr></thead>
          <tbody>
            {props.map((p) => {
              const a = asignadas.find((x) => x.propId === p.id);
              return (
                <tr key={p.id}>
                  <td><label className="lm-check"><input type="checkbox" checked={!!a} disabled={soloLectura} onChange={(e) => toggle(p.id, e.target.checked)} aria-label={`Asignar ${p.nombre} a ${sel}`} /></label></td>
                  <td className={a ? "emph" : ""}>{p.nombre}</td>
                  <td>
                    <label className="lm-toggle lm-toggle--small">
                      <input type="checkbox" role="switch" disabled={soloLectura || !a} checked={!!a?.historico} onChange={(e) => historico(p.id, e.target.checked)} aria-label={`Guardar histórico de ${p.nombre}`} />
                      <span className={a ? "" : "muted"}>{a?.historico ? "Sí" : "No"}</span>
                    </label>
                  </td>
                </tr>
              );
            })}
            {props.length === 0 && <tr><td colSpan={3} className="muted">No hay propiedades con ese nombre</td></tr>}
          </tbody>
        </table>
        )}
      </div>
    </div>
  );
}

/* ---------- Propiedades de hueco: matriz de asignación (Configuración › Estructura y propiedades de hueco) ---------- */
/**
 * (Prueba) Se asignan directamente, sin seleccionar antes los huecos: la estructura en filas y una columna por propiedad.
 * Encima, un atajo para asignar o quitar una propiedad en todos los huecos de una categoría.
 * Aquí solo se elige qué propiedades tiene cada hueco; sus valores se dan en cada configuración (paso 2 del asistente).
 */
export function MatrizPropsHueco({ raiz, valor, onChange, soloLectura }: {
  raiz: Nodo; valor: PropsHueco; onChange: (v: PropsHueco) => void; soloLectura?: boolean;
}) {
  const cats = categoriasDe(raiz);
  const [prop, setProp] = useState(PROPS_HUECO[0].id);
  const [cat, setCat] = useState(cats.find((x) => x.nivel > 1)?.categoria ?? cats[0]?.categoria ?? "");
  const [soloConProps, setSoloConProps] = useState(false);
  const tiene = (id: string, p: string) => valor[id]?.[p] !== undefined;

  const poner = (ids: string[], p: string, on: boolean) => {
    const nuevo = { ...valor };
    ids.forEach((id) => {
      const actual = { ...(nuevo[id] ?? {}) };
      if (on) actual[p] = actual[p] ?? ""; else delete actual[p];
      nuevo[id] = actual;
    });
    onChange(nuevo);
  };
  const deCategoria = (c: string) => { const ids: string[] = []; recorrer(raiz, (n) => { if (n.categoria === c) ids.push(n.id); }); return ids; };

  const COL = 72;

  return (
    <div className="stack gap-20">
      {/* Atajo por categoría */}
      {!soloLectura && (
        <div className="row gap-10 wrap" style={{ alignItems: "flex-end" }}>
          <Field label="Propiedad" htmlFor="mp-prop" style={{ width: 220 }}>
            <select id="mp-prop" className="lm-select lm-select--dense" value={prop} onChange={(e) => setProp(e.target.value)}>
              {PROPS_HUECO.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
          <Field label="Categoría" htmlFor="mp-cat" style={{ width: 240 }}>
            <select id="mp-cat" className="lm-select lm-select--dense" value={cat} onChange={(e) => setCat(e.target.value)}>
              {cats.map((x) => <option key={x.categoria} value={x.categoria}>{x.categoria} ({x.huecos})</option>)}
            </select>
          </Field>
          <Button variant="outlined" icon="add" onClick={() => poner(deCategoria(cat), prop, true)}>Asignar a todos</Button>
          <Button variant="text" icon="remove" onClick={() => poner(deCategoria(cat), prop, false)}>Quitar a todos</Button>
          <span className="grow" />
          <label className="lm-check"><input type="checkbox" checked={soloConProps} onChange={(e) => setSoloConProps(e.target.checked)} />Ver solo huecos con propiedades</label>
        </div>
      )}

      {/* Matriz */}
      <div className="lm-card" style={{ overflowX: "auto" }}>
        <div style={{ minWidth: 300 + COL * PROPS_HUECO.length }}>
          <div className="row gap-10" style={{ minHeight: "var(--lm-space-50)", borderBottom: "1px solid var(--lm-sys-outline-variant)" }}>
            <span className="lm-label-medium grow" style={{ paddingLeft: "var(--lm-space-50)" }}>ESTRUCTURA DE LA UNIDAD</span>
            {PROPS_HUECO.map((p) => (
              <span key={p.id} className="lm-label-small" title={p.nombre} style={{ width: COL, flex: "none", boxSizing: "border-box", textAlign: "center", overflowWrap: "anywhere", padding: "0 var(--lm-space-5)" }}>{p.nombre}</span>
            ))}
          </div>
          <ArbolFilas raiz={raiz} abiertosIni={3} filtro={soloConProps ? (n) => Object.keys(valor[n.id] ?? {}).length > 0 : undefined} render={(n) => (
            <>
              <span className="row gap-10 grow" style={{ whiteSpace: "nowrap", minWidth: 0 }}>
                <Icon name={iconoCategoria(n.categoria)} size="m" />
                <span style={{ fontWeight: n.hijos.length ? 500 : 400 }}>{n.nombre}</span>
              </span>
              {PROPS_HUECO.map((p) => (
                <span key={p.id} style={{ width: COL, flex: "none", display: "flex", justifyContent: "center" }}>
                  <input type="checkbox" style={{ width: 18, height: 18, accentColor: "var(--lm-sys-primary)" }} disabled={soloLectura}
                    aria-label={`${p.nombre} en ${n.nombre}`} checked={tiene(n.id, p.id)} onChange={(e) => poner([n.id], p.id, e.target.checked)} />
                </span>
              ))}
            </>
          )} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Lista de propiedades de hueco (paso 1, consulta; paso 2, valores) ---------- */
/**
 * Una fila por cada propiedad de hueco que define la estructura, con su hueco y su posición.
 * Con `valor` y `onChange` (paso 2) cada fila tiene un campo para su valor, propio de la configuración y opcional.
 */
export function ListaPropsHueco({ raiz, definicion, valor, onChange }: {
  raiz: Nodo; definicion: PropsHueco; valor?: PropsHueco; onChange?: (v: PropsHueco) => void;
}) {
  const editable = !!valor && !!onChange;
  const conValores = !!valor; // con valor y sin onChange: se ven los valores sin poder cambiarlos
  const [prop, setProp] = useState("");
  const [cat, setCat] = useState("");
  const [buscar, setBuscar] = useState("");
  const filas: { n: Nodo; posicion: string; p: (typeof PROPS_HUECO)[number] }[] = [];
  recorrer(raiz, (n) => {
    PROPS_HUECO.forEach((p) => {
      if (definicion[n.id]?.[p.id] !== undefined) filas.push({ n, posicion: [raiz.nombre, ...rutaDe(raiz, n.id)].join(" › "), p });
    });
  });
  const props = PROPS_HUECO.filter((p) => filas.some((f) => f.p.id === p.id));
  const categorias = [...new Set(filas.map((f) => f.n.categoria))];
  const conValor = conValores ? filas.filter((f) => valor![f.n.id]?.[f.p.id]).length : 0;
  const q = buscar.trim().toLowerCase();
  const lista = filas
    .filter((f) => !prop || f.p.id === prop)
    .filter((f) => !cat || f.n.categoria === cat)
    .filter((f) => !q || `${f.posicion} ${f.p.nombre}`.toLowerCase().includes(q));

  const cambiar = (id: string, propId: string, v: string) => {
    const actual = { ...(valor![id] ?? {}) };
    if (v) actual[propId] = v; else delete actual[propId];
    onChange!({ ...valor, [id]: actual });
  };
  const limpiar = () => { setProp(""); setCat(""); setBuscar(""); };

  return (
    <div className="stack gap-15">
      <div className="lm-filters">
        <SearchInput value={buscar} onChange={setBuscar} placeholder="Buscar por posición" label="Buscar por posición" />
        {props.length > 1 && (
          <select className="lm-select lm-select--dense" style={{ width: 220 }} aria-label="Filtrar por propiedad" value={prop} onChange={(e) => setProp(e.target.value)}>
            <option value="">Todas las propiedades</option>
            {props.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        )}
        {categorias.length > 1 && (
          <select className="lm-select lm-select--dense" style={{ width: 220 }} aria-label="Filtrar por categoría" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {(prop || cat || buscar) && <Button variant="text" icon="restart_alt" onClick={limpiar}>Restablecer</Button>}
        <span className="grow" />
        <span className="lm-body-small muted">{conValores ? `${conValor} de ${filas.length} con valor` : `${filas.length} propiedades de hueco`}</span>
      </div>
      {lista.length === 0 ? (
        <EmptyState icon="search_off" title="No hay resultados" text="Ninguna propiedad coincide con los filtros"
          action={<Button variant="outlined" onClick={limpiar}>Restablecer filtros</Button>} />
      ) : (
        <div style={{ maxHeight: 560, overflow: "auto" }}>
          <table className="lm-table">
            <thead>
              <tr>
                <th>Propiedad</th><th>Hueco</th><th>Posición</th>
                {conValores && <th style={{ width: 320 }}>Valor</th>}
              </tr>
            </thead>
            <tbody>
              {lista.map(({ n, posicion, p }) => (
                <tr key={`${n.id}-${p.id}`}>
                  <td><span className="emph">{p.nombre}</span> <span className="lm-body-small muted">· {p.tipo}</span></td>
                  <td>{n.nombre}</td>
                  <td className="muted">{posicion}</td>
                  {conValores && !editable && <td>{valor![n.id]?.[p.id] || <span className="muted">Sin valor</span>}</td>}
                  {editable && (
                    <td>
                      <input className="lm-input lm-input--dense" aria-label={`${p.nombre} de ${posicion}`} value={valor![n.id]?.[p.id] ?? ""}
                        placeholder={`Opcional, por ejemplo: ${p.ejemplo}`} onChange={(e) => cambiar(n.id, p.id, e.target.value)} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
