"use client";

// Paneles del intercambio entre unidad y almacén (diseño A: lado a lado, en listas, sin tablas).
// - PanelUnidad: árbol de la unidad. Se marca un activo (con o sin sus activos montados). En "Después" muestra cómo queda,
//   con lo que cambia resaltado (sin etiquetas) y los huecos que quedan vacíos.
// - PanelAlmacen: activos del almacén de la misma categoría; con activos montados debajo y Rotar en los ejes.

import { useMemo, useState, type ReactNode } from "react";
import { Button, IconButton, Tag } from "@/components/ds";
import { SEP } from "@/lib/datos";
import { descendientes, espejo, huecosConActivo, type ActivoM } from "@/lib/movimientos";
import { recorrer, type Nodo } from "@/lib/model";
import { textoDriver, type SeleccionUnidad } from "./tablas";

const panel = {
  border: "1px solid var(--lm-sys-outline-variant)", borderRadius: "var(--lm-corner-30)",
  background: "var(--lm-sys-surface-container-lowest)", minWidth: 0,
};
const lista = (alto: number) => ({ maxHeight: alto, overflow: "auto" as const });
const fila = (on: boolean) => ({
  minHeight: "var(--lm-space-40)", padding: "0 var(--lm-space-15)", gap: "var(--lm-space-10)",
  background: on ? "var(--lm-sys-secondary-container)" : undefined, cursor: "pointer",
});

export function Panel({ titulo, subtitulo, accion, children }: { titulo: string; subtitulo?: ReactNode; accion?: ReactNode; children: ReactNode }) {
  return (
    <div className="stack" style={panel}>
      <div className="row gap-10" style={{ padding: "var(--lm-space-15)", borderBottom: "1px solid var(--lm-sys-outline-variant)" }}>
        <span className="stack grow">
          <span className="lm-title-small">{titulo}</span>
          {subtitulo && <span className="lm-body-small muted">{subtitulo}</span>}
        </span>
        {accion}
      </div>
      {children}
    </div>
  );
}

/** Árbol de la unidad en lista. marcas: serie -> etiqueta ("Sale" / "Entra"); vacios: rutas que quedan vacías. */
export function PanelUnidad({ raiz, unidad, activos, sel, onSel, busca, alto = 440, soloLectura, marcas = {}, vacios = new Set<string>(), abrirHasta, elegible }: {
  raiz: Nodo; unidad: string; activos: Record<string, ActivoM>; sel: SeleccionUnidad; onSel: (s: SeleccionUnidad) => void; busca: string; alto?: number;
  soloLectura?: boolean; marcas?: Record<string, "Sale" | "Entra">; vacios?: Set<string>; abrirHasta?: string;
  /** Si se indica, devuelve el motivo por el que un activo no se puede marcar (o null si se puede). */
  elegible?: (a: ActivoM) => string | null;
}) {
  const { activoDe, rutaDe } = useMemo(() => huecosConActivo(raiz, unidad, activos), [raiz, unidad, activos]);
  const [cerrados, setCerrados] = useState<Record<string, boolean>>(() => {
    const c: Record<string, boolean> = {};
    recorrer(raiz, (n, nivel) => { if (nivel >= 3 && n.hijos.length) c[n.id] = true; });
    // Abierto el camino hasta la posición elegida (vista Después)
    if (abrirHasta) recorrer(raiz, (n) => { const r = rutaDe(n); if (r && (abrirHasta === r || abrirHasta.startsWith(r + SEP) || r.startsWith(abrirHasta + SEP))) delete c[n.id]; });
    return c;
  });
  const padre = sel ? activos[sel.padre] : undefined;
  // Activos montados en el marcado, con su ruta relativa (para saber quién cuelga de quién)
  const desc = useMemo(() => (padre ? descendientes(activos, padre) : []), [padre, activos]);
  const hijos = useMemo(() => new Set(desc.map((d) => d.a.serie)), [desc]);
  const marcado = (s?: string) => !!s && !!sel && (s === sel.padre || (hijos.has(s) && !sel.quedan.includes(s)));

  // Hijos y nietos se marcan por separado: desmarcar uno desmarca lo que lleva montado (se queda en la unidad);
  // marcarlo vuelve a marcar lo que lleva montado y su padre (no puede salir sin él).
  const pulsar = (a: ActivoM, n: Nodo) => {
    if (soloLectura) return;
    if (sel && a.serie === sel.padre) { onSel(null); return; }
    if (sel && hijos.has(a.serie)) {
      const rel = desc.find((d) => d.a.serie === a.serie)!.rel;
      const debajo = desc.filter((d) => d.rel === rel || d.rel.startsWith(rel + SEP)).map((d) => d.a.serie);
      const encima = desc.filter((d) => rel.startsWith(d.rel + SEP)).map((d) => d.a.serie);
      const quedan = new Set(sel.quedan);
      if (quedan.has(a.serie)) { debajo.forEach((s) => quedan.delete(s)); encima.forEach((s) => quedan.delete(s)); }
      else debajo.forEach((s) => quedan.add(s));
      onSel({ ...sel, quedan: [...quedan] });
      return;
    }
    if (elegible?.(a)) return;
    onSel({ padre: a.serie, quedan: [] });
    setCerrados((c) => { const x = { ...c }; recorrer(n, (h) => { delete x[h.id]; }); return x; });
  };

  const q = busca.trim().toLowerCase();
  const filas: { n: Nodo; nivel: number }[] = [];
  if (q) recorrer(raiz, (n, nivel) => { if (nivel > 1 && (activoDe(n)?.serie ?? "").toLowerCase().includes(q)) filas.push({ n, nivel: 0 }); });
  else { const ir = (n: Nodo, nivel: number) => { if (nivel > 1) filas.push({ n, nivel: nivel - 2 }); if (!cerrados[n.id]) n.hijos.forEach((h) => ir(h, nivel + 1)); }; ir(raiz, 1); }

  return (
    <div role="tree" aria-label={`Unidad ${unidad}`} style={lista(alto)}>
      {!filas.length && <div className="muted" style={{ padding: "var(--lm-space-15)" }}>Ningún activo coincide con &quot;{busca}&quot;</div>}
      {filas.map(({ n, nivel }) => {
        const a = activoDe(n);
        const ruta = rutaDe(n);
        const on = !soloLectura && marcado(a?.serie);
        const marca = a ? marcas[a.serie] : undefined;
        return (
          <div key={n.id} role="treeitem" aria-level={nivel + 1} className="row" style={{ ...fila(on || !!marca), cursor: a && !soloLectura ? "pointer" : "default", paddingLeft: `calc(var(--lm-space-15) + ${nivel} * var(--lm-space-20))` }}
            onClick={() => a && pulsar(a, n)}>
            {!q && n.hijos.length ? (
              <IconButton compact icon={cerrados[n.id] ? "chevron_right" : "expand_more"} label={`${cerrados[n.id] ? "Desplegar" : "Plegar"} ${n.nombre}`}
                onClick={(e) => { e.stopPropagation(); setCerrados((c) => ({ ...c, [n.id]: !c[n.id] })); }} />
            ) : <span style={{ width: "var(--lm-space-40)" }} />}
            {!soloLectura && (
              <input type="checkbox" disabled={!a || (!on && !hijos.has(a.serie) && !!elegible?.(a))} title={a && !on && !hijos.has(a.serie) ? elegible?.(a) ?? undefined : undefined} checked={on} onChange={() => a && pulsar(a, n)} onClick={(e) => e.stopPropagation()}
                aria-label={`${on ? "Desmarcar" : "Marcar"} ${ruta}`} />
            )}
            <span className="grow" style={{ fontWeight: n.hijos.length ? 500 : 400 }}>{q ? ruta : n.nombre}</span>
            {vacios.has(ruta) ? <Tag tone="warning">Queda vacío</Tag>
              : <span style={{ width: 130, fontWeight: a ? 500 : 400 }} className={a ? undefined : "muted"}>{a ? a.serie : "Vacío"}</span>}
            <span className="lm-body-small muted" style={{ width: 150, textAlign: "right" }}>{textoDriver(a)}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Activos del almacén en lista. Con conHijos, sus activos montados debajo; en los ejes, Rotar. */
export function PanelAlmacen({ candidatos, activos, sel, onSel, conHijos, rotado, onRotar, alto = 440, marcas = {}, soloLectura }: {
  candidatos: ActivoM[]; activos: Record<string, ActivoM>; sel: string; onSel: (s: string) => void; conHijos: boolean;
  rotado: boolean; onRotar: (s: string) => void; alto?: number; marcas?: Record<string, "Sale" | "Entra">; soloLectura?: boolean;
}) {
  return (
    <div role="listbox" aria-label="Activos del almacén" style={lista(alto)}>
      {candidatos.map((a) => {
        const on = !soloLectura && a.serie === sel;
        const desc = conHijos ? descendientes(activos, a) : [];
        const girado = on && rotado;
        const nuevaPos = girado ? espejo(desc.map((d) => ({ rel: d.rel, categoria: d.a.categoria }))) : {};
        const marca = marcas[a.serie];
        return (
          <div key={a.serie} role="option" aria-selected={on} style={{ borderBottom: "1px solid var(--lm-sys-outline-variant)", background: on || marca ? "var(--lm-sys-secondary-container)" : undefined }}>
            <div className="row" style={{ ...fila(false), cursor: soloLectura ? "default" : "pointer" }} onClick={() => !soloLectura && onSel(a.serie)}>
              {!soloLectura && <input type="radio" name="sel-almacen" checked={on} onChange={() => onSel(a.serie)} onClick={(e) => e.stopPropagation()} aria-label={`Elegir ${a.categoria} ${a.serie}`} />}
              <span className="grow" style={{ fontWeight: 500 }}>{a.categoria} {a.serie}</span>
              {girado && <Tag tone="info">Rotado 180°</Tag>}
              <span className="lm-body-small muted" style={{ width: 150, textAlign: "right" }}>{textoDriver(a)}</span>
              {!soloLectura && conHijos && a.categoria === "Eje" && desc.length > 1 && (
                <span onClick={(e) => e.stopPropagation()}>
                  <Button variant={girado ? "tonal" : "text"} small onClick={() => onRotar(a.serie)}>{girado ? "Deshacer" : "Rotar"}</Button>
                </span>
              )}
            </div>
            {desc.map((d) => (
              <div key={d.a.serie} className="row lm-body-small" style={{ gap: "var(--lm-space-10)", padding: `0 var(--lm-space-15) var(--lm-space-5) calc(var(--lm-space-15) + ${d.rel.split(SEP).length} * var(--lm-space-20) + var(--lm-space-15))` }}>
                <span className="muted" style={{ width: 150 }}>{girado && nuevaPos[d.rel] !== d.rel ? <>{d.rel} → <strong style={{ color: "var(--lm-sys-on-surface)" }}>{nuevaPos[d.rel]}</strong></> : d.rel}</span>
                <span className="grow">{d.a.serie}</span>
                <span className="muted" style={{ width: 110, textAlign: "right" }}>{textoDriver(d.a)}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
