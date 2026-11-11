"use client";

// Tablas de selección de Movimientos, sin iconos:
// - Árbol de una unidad en columnas (posición, categoría, nº de serie, driver) con casillas: se marca UN activo y, con él,
//   sus activos montados; si se desmarcan, sale solo el activo. No se pueden marcar activos de otra rama.
// - Activos de un almacén (nº de serie, categoría, driver), con sus activos montados debajo y, en los ejes, Rotar.

import { useMemo, useState } from "react";
import { Button, IconButton, Tag } from "@/components/ds";
import { SEP } from "@/lib/datos";
import { descendientes, espejo, formatoKm, huecosConActivo, type ActivoM } from "@/lib/movimientos";
import { recorrer, type Nodo } from "@/lib/model";

/** Driver que se muestra al lado de cada activo: km y, si los tiene, horas o ciclos. */
export const textoDriver = (a?: ActivoM) => {
  if (!a) return "—";
  const p = [a.km != null && `${formatoKm(a.km)} km`, a.horas != null && `${formatoKm(a.horas)} h`, a.ciclos != null && `${formatoKm(a.ciclos)} ciclos`].filter(Boolean);
  return p.length ? p.join(" · ") : "—";
};

const sangria = (nivel: number) => ({ paddingLeft: `calc(${nivel} * var(--lm-space-20))` });
const marco = (alto: number) => ({ maxHeight: alto, overflow: "auto", border: "1px solid var(--lm-sys-outline-variant)", borderRadius: "var(--lm-corner-30)" });
const cabecera = { position: "sticky" as const, top: 0, background: "var(--lm-sys-surface-container-lowest)", zIndex: 1 };

/** Selección en la unidad: un activo y, si conHijos, todos sus activos montados. */
export type SeleccionUnidad = { padre: string; conHijos: boolean } | null;

export function TablaArbolUnidad({ raiz, unidad, activos, sel, onSel, busca, alto = 420 }: {
  raiz: Nodo; unidad: string; activos: Record<string, ActivoM>; sel: SeleccionUnidad; onSel: (s: SeleccionUnidad) => void; busca: string; alto?: number;
}) {
  const { activoDe, rutaDe } = useMemo(() => huecosConActivo(raiz, unidad, activos), [raiz, unidad, activos]);
  const [cerrados, setCerrados] = useState<Record<string, boolean>>(() => {
    const c: Record<string, boolean> = {};
    recorrer(raiz, (n, nivel) => { if (nivel >= 3 && n.hijos.length) c[n.id] = true; });
    return c;
  });
  const padre = sel ? activos[sel.padre] : undefined;
  const hijos = useMemo(() => new Set(padre ? descendientes(activos, padre).map((d) => d.a.serie) : []), [padre, activos]);
  const marcado = (s?: string) => !!s && !!sel && (s === sel.padre || (sel.conHijos && hijos.has(s)));

  const pulsar = (a: ActivoM, n: Nodo) => {
    if (sel && a.serie === sel.padre) onSel(null); // desmarcar el activo: no sale nada
    else if (sel && hijos.has(a.serie)) onSel({ ...sel, conHijos: !sel.conHijos }); // sus activos montados se marcan o desmarcan juntos
    else {
      // otro activo: empieza con sus activos montados, que se despliegan para verlos marcados
      onSel({ padre: a.serie, conHijos: descendientes(activos, a).length > 0 });
      setCerrados((c) => { const x = { ...c }; recorrer(n, (h) => { delete x[h.id]; }); return x; });
    }
  };

  const q = busca.trim().toLowerCase();
  const filas: { n: Nodo; nivel: number }[] = [];
  if (q) {
    recorrer(raiz, (n, nivel) => { if (nivel > 1 && (activoDe(n)?.serie ?? "").toLowerCase().includes(q)) filas.push({ n, nivel: 0 }); });
  } else {
    const ir = (n: Nodo, nivel: number) => { if (nivel > 1) filas.push({ n, nivel: nivel - 2 }); if (!cerrados[n.id]) n.hijos.forEach((h) => ir(h, nivel + 1)); };
    ir(raiz, 1);
  }
  return (
    <div style={marco(alto)}>
      <table className="lm-table">
        <thead style={cabecera}>
          <tr><th>Posición</th><th>Categoría</th><th>Nº de serie</th><th>Driver</th></tr>
        </thead>
        <tbody>
          {!filas.length && <tr><td colSpan={4} className="muted">Ningún activo de la unidad {unidad} coincide con &quot;{busca}&quot;</td></tr>}
          {filas.map(({ n, nivel }) => {
            const a = activoDe(n);
            const on = marcado(a?.serie);
            return (
              <tr key={n.id} onClick={() => a && pulsar(a, n)} style={{ cursor: a ? "pointer" : "default", background: on ? "var(--lm-sys-secondary-container)" : undefined }}>
                <td>
                  <span className="row gap-5" style={sangria(nivel)}>
                    {!q && n.hijos.length ? (
                      <IconButton compact icon={cerrados[n.id] ? "chevron_right" : "expand_more"} label={`${cerrados[n.id] ? "Desplegar" : "Plegar"} ${n.nombre}`}
                        onClick={(e) => { e.stopPropagation(); setCerrados((c) => ({ ...c, [n.id]: !c[n.id] })); }} />
                    ) : <span style={{ width: "var(--lm-space-40)" }} />}
                    <input type="checkbox" disabled={!a} checked={on} onChange={() => a && pulsar(a, n)} onClick={(e) => e.stopPropagation()}
                      aria-label={`${on ? "Desmarcar" : "Marcar"} ${rutaDe(n)}`} />
                    <span style={{ fontWeight: n.hijos.length ? 500 : 400 }}>{q ? rutaDe(n) : n.nombre}</span>
                  </span>
                </td>
                <td>{n.categoria}</td>
                <td className={a ? "emph" : "muted"}>{a ? a.serie : "Vacío"}</td>
                <td className="muted">{textoDriver(a)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Activos de un almacén que se pueden elegir. Con conHijos, cada uno con sus activos montados debajo; en los ejes, Rotar. */
export function TablaAlmacen({ candidatos, activos, sel, onSel, conHijos, rotado, onRotar, alto = 420 }: {
  candidatos: ActivoM[]; activos: Record<string, ActivoM>; sel: string; onSel: (serie: string) => void; conHijos: boolean;
  rotado: boolean; onRotar: (serie: string) => void; alto?: number;
}) {
  return (
    <div style={marco(alto)}>
      <table className="lm-table">
        <thead style={cabecera}>
          <tr><th>Nº de serie</th><th>Categoría</th><th>Driver</th><th className="actions"><span className="sr-only">Rotar</span></th></tr>
        </thead>
        <tbody>
          {candidatos.flatMap((a) => {
            const on = a.serie === sel;
            const fondo = on ? "var(--lm-sys-secondary-container)" : undefined;
            const desc = conHijos ? descendientes(activos, a) : [];
            const girado = on && rotado;
            const nuevaPos = girado ? espejo(desc.map((d) => ({ rel: d.rel, categoria: d.a.categoria }))) : {};
            const fila = (
              <tr key={a.serie} onClick={() => onSel(a.serie)} style={{ cursor: "pointer", background: fondo }}>
                <td>
                  <span className="row gap-10">
                    <input type="radio" name="sel-almacen" checked={on} onChange={() => onSel(a.serie)} aria-label={`Elegir ${a.categoria} ${a.serie}`} onClick={(e) => e.stopPropagation()} />
                    <span style={{ fontWeight: 500 }}>{a.serie}</span>
                    {girado && <Tag tone="info">Rotado 180°</Tag>}
                  </span>
                </td>
                <td>{a.categoria}</td>
                <td className="muted">{textoDriver(a)}</td>
                <td className="actions" onClick={(e) => e.stopPropagation()}>
                  {conHijos && a.categoria === "Eje" && desc.length > 1 && (
                    <Button variant={girado ? "tonal" : "text"} small onClick={() => onRotar(a.serie)}>{girado ? "Deshacer rotación" : "Rotar"}</Button>
                  )}
                </td>
              </tr>
            );
            const filasHijos = desc.map((d) => (
              <tr key={`${a.serie}>${d.a.serie}`} className="is-child" onClick={() => onSel(a.serie)} style={{ cursor: "pointer", background: fondo }}>
                <td>
                  <span style={sangria(d.rel.split(SEP).length + 1)}>
                    <span className="muted">{d.a.serie}</span>
                    <span className="lm-body-small muted"> · {girado && nuevaPos[d.rel] !== d.rel ? <>{d.rel} → <strong>{nuevaPos[d.rel]}</strong></> : d.rel}</span>
                  </span>
                </td>
                <td className="muted">{d.a.categoria}</td>
                <td className="muted">{textoDriver(d.a)}</td>
                <td />
              </tr>
            ));
            return [fila, ...filasHijos];
          })}
        </tbody>
      </table>
    </div>
  );
}
