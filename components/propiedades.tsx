"use client";

// Editores de propiedades (HU-14 a HU-20).
// - Propiedades de categoría: únicas para todo el cliente (Configuración › Propiedades de categoría y paso 4).
// - Propiedades de hueco: la estructura define cuáles tiene cada hueco (Configuración › Estructuras) y cada
//   configuración les da valor (paso 2 del asistente, opcional).
// - Propiedades de categoría: dependen de las categorías de la estructura.
// - Propiedades de hueco: dependen de los huecos de la estructura.

import { useMemo, useState } from "react";
import { Button, EmptyState, Icon, SearchInput, Tag } from "./ds";
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
                  <td><label className="lm-check"><input type="checkbox" checked={!!a} disabled={soloLectura} onChange={(e) => toggle(p.id, e.target.checked)} aria-label={`Asignar ${p.nombre} a ${sel}`} /></label></td>
                  <td className={a ? "emph" : ""}>{p.nombre}</td>
                  <td className="muted">{p.tipo}</td>
                  <td>
                    <label className="lm-toggle lm-toggle--small">
                      <input type="checkbox" role="switch" disabled={soloLectura || !a} checked={!!a?.historico} onChange={(e) => historico(p.id, e.target.checked)} aria-label={`Guardar histórico de ${p.nombre}`} />
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
/**
 * - modo "definir": qué propiedades tiene cada hueco. Es de la estructura (Configuración › Estructuras).
 * - modo "valores": el valor de esas propiedades en una configuración (paso 2 del asistente). Solo se ven
 *   las propiedades que define la estructura (`definicion`) y los valores son opcionales.
 */
export function EditorPropsHueco({ raiz, valor, onChange, soloLectura, modo = "definir", definicion }: {
  raiz: Nodo; valor: PropsHueco; onChange: (v: PropsHueco) => void; soloLectura?: boolean;
  modo?: "definir" | "valores"; definicion?: PropsHueco;
}) {
  const [sel, setSel] = useState<string[]>([]);
  const [cat, setCat] = useState("");
  const def = modo === "valores" ? definicion ?? {} : valor;
  const definidas = (id: string) => Object.keys(def[id] ?? {});
  const seleccionable = (id: string) => modo === "definir" || definidas(id).length > 0;
  const cats = categoriasDe(raiz).filter((x) => {
    if (modo === "definir") return true;
    let hay = false; recorrer(raiz, (n) => { if (n.categoria === x.categoria && definidas(n.id).length) hay = true; });
    return hay;
  });

  const seleccionarCategoria = (categoria: string) => {
    const ids: string[] = [];
    recorrer(raiz, (n) => { if (n.categoria === categoria && seleccionable(n.id)) ids.push(n.id); });
    setSel(ids);
  };
  const toggleHueco = (id: string, on: boolean) => setSel((s) => (on ? [...s, id] : s.filter((x) => x !== id)));

  // Definir: qué huecos de la selección tienen cada propiedad
  const estadoProp = (propId: string) => {
    const n = sel.filter((id) => def[id]?.[propId] !== undefined).length;
    return { todas: n === sel.length && sel.length > 0, algunas: n > 0 && n < sel.length };
  };
  const asignar = (propId: string, on: boolean) => {
    const nuevo = { ...valor };
    sel.forEach((id) => {
      const actual = { ...(nuevo[id] ?? {}) };
      if (on) actual[propId] = ""; else delete actual[propId];
      nuevo[id] = actual;
    });
    onChange(nuevo);
  };

  // Valores: solo en los huecos de la selección que tienen la propiedad
  const conProp = (propId: string) => sel.filter((id) => def[id]?.[propId] !== undefined);
  const valorProp = (propId: string) => {
    const vs = new Set(conProp(propId).map((id) => valor[id]?.[propId] ?? ""));
    return { valor: vs.size === 1 ? [...vs][0] : "", varios: vs.size > 1 };
  };
  const cambiarValor = (propId: string, v: string) => {
    const nuevo = { ...valor };
    conProp(propId).forEach((id) => {
      const actual = { ...(nuevo[id] ?? {}) };
      if (v) actual[propId] = v; else delete actual[propId];
      nuevo[id] = actual;
    });
    onChange(nuevo);
  };

  const cuenta = useMemo(() => {
    let huecos = 0, conValor = 0;
    recorrer(raiz, (h) => {
      const d = Object.keys(def[h.id] ?? {});
      if (d.length) huecos++;
      if (d.some((p) => valor[h.id]?.[p])) conValor++;
    });
    return { huecos, conValor };
  }, [def, valor, raiz]);
  const propsEnSeleccion = modo === "definir" ? PROPS_HUECO : PROPS_HUECO.filter((p) => conProp(p.id).length > 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 440px", gap: "var(--lm-space-20)", alignItems: "start" }}>
      <div className="lm-card stack gap-10">
        <div className="row gap-10 wrap">
          <span className="lm-title-small grow">
            {modo === "definir" ? `Huecos · ${cuenta.huecos} con propiedades` : `Huecos con propiedades · ${cuenta.conValor} de ${cuenta.huecos} con valores`}
          </span>
          <select className="lm-select lm-select--dense" style={{ width: 240 }} aria-label="Seleccionar todos los huecos de una categoría" value={cat}
            onChange={(e) => { setCat(e.target.value); if (e.target.value) seleccionarCategoria(e.target.value); }}>
            <option value="">Seleccionar por categoría…</option>
            {cats.map((x) => <option key={x.categoria} value={x.categoria}>Todos: {x.categoria} ({x.huecos})</option>)}
          </select>
          {sel.length > 0 && <Button variant="text" small onClick={() => { setSel([]); setCat(""); }}>Quitar selección</Button>}
        </div>
        <div style={{ maxHeight: 520, overflow: "auto" }}>
          <ArbolFilas raiz={raiz} abiertosIni={3} render={(n) => {
            const np = definidas(n.id).length;
            const nv = definidas(n.id).filter((p) => valor[n.id]?.[p]).length;
            const ok = seleccionable(n.id);
            return (
              <label className="lm-check grow" style={{ minHeight: "var(--lm-space-50)" }}>
                <input type="checkbox" checked={sel.includes(n.id)} disabled={!ok} onChange={(e) => { setCat(""); toggleHueco(n.id, e.target.checked); }} aria-label={`Seleccionar ${n.nombre}`} />
                <span style={{ fontWeight: n.hijos.length ? 500 : 400 }} className={`grow${ok ? "" : " muted"}`}>{n.nombre}</span>
                {np > 0 && (modo === "definir"
                  ? <Tag tone="primary" num={np}>prop.</Tag>
                  : <Tag tone={nv === np ? "success" : nv ? "attention" : "neutral"}>{nv}/{np} valores</Tag>)}
              </label>
            );
          }} />
        </div>
      </div>

      <aside className="lm-card stack gap-15" aria-label="Propiedades de los huecos seleccionados" style={{ position: "sticky", top: "calc(var(--lm-space-60) + var(--lm-space-20))" }}>
        {sel.length === 0 ? (
          <div className="lm-center" style={{ padding: "var(--lm-space-50) var(--lm-space-20)" }}>
            <Icon name="radio_button_checked" size="xl" />
            <span>{soloLectura ? "Selecciona uno o varios huecos para ver sus propiedades"
              : modo === "definir" ? "Selecciona uno o varios huecos para asignarles propiedades"
              : "Selecciona uno o varios huecos para dar valor a sus propiedades"}</span>
            <span className="lm-body-small">Consejo: usa "Seleccionar por categoría" para elegir, por ejemplo, todas las ruedas a la vez</span>
          </div>
        ) : (
          <>
            <span className="lm-title-small">{sel.length === 1 ? rutaDe(raiz, sel[0]).join(" › ") || raiz.nombre : `${sel.length} huecos seleccionados`}</span>
            {modo === "valores" && <span className="lm-body-small muted">Los valores son opcionales. Puedes dejarlos vacíos y rellenarlos más adelante.</span>}
            {propsEnSeleccion.map((p) => {
              if (modo === "definir") {
                const e = estadoProp(p.id);
                return (
                  <label key={p.id} className="lm-check" style={{ paddingBottom: "var(--lm-space-10)", borderBottom: "1px solid var(--lm-sys-outline-variant)" }}>
                    <input type="checkbox" checked={e.todas} disabled={soloLectura} ref={(el) => { if (el) el.indeterminate = e.algunas; }} onChange={(ev) => asignar(p.id, ev.target.checked)} />
                    <span className="grow">{p.nombre}</span>
                    <span className="lm-body-small muted">{p.tipo}</span>
                  </label>
                );
              }
              const v = valorProp(p.id);
              const n = conProp(p.id).length;
              return (
                <div key={p.id} className="stack gap-5" style={{ paddingBottom: "var(--lm-space-10)", borderBottom: "1px solid var(--lm-sys-outline-variant)" }}>
                  <div className="row gap-10">
                    <span className="grow">{p.nombre}</span>
                    <span className="lm-body-small muted">{p.tipo}{n < sel.length ? ` · en ${n} de ${sel.length} huecos` : ""}</span>
                  </div>
                  <input className="lm-input lm-input--dense" aria-label={`Valor de ${p.nombre}`} value={v.valor} readOnly={soloLectura}
                    placeholder={v.varios ? "Varios valores" : `Opcional, por ejemplo: ${p.ejemplo}`} onChange={(ev) => cambiarValor(p.id, ev.target.value)} />
                </div>
              );
            })}
          </>
        )}
      </aside>
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
