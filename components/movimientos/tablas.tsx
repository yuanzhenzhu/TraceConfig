"use client";

// Tablas de selección de Movimientos: árbol de una unidad y activos de un almacén, en columnas
// (posición, categoría, nº de serie y driver), sin iconos. La sangría va solo en la primera columna para que las demás queden alineadas.

import { useMemo, useState, type ReactNode } from "react";
import { IconButton, Tag } from "@/components/ds";
import { SEP } from "@/lib/datos";
import { descendientes, formatoKm, huecosConActivo, type ActivoM } from "@/lib/movimientos";
import { recorrer, type Nodo } from "@/lib/model";

/** Driver que se muestra al lado de cada activo: km y, si los tiene, horas o ciclos. */
export const textoDriver = (a?: ActivoM) => {
  if (!a) return "—";
  const p = [a.km != null && `${formatoKm(a.km)} km`, a.horas != null && `${formatoKm(a.horas)} h`, a.ciclos != null && `${formatoKm(a.ciclos)} ciclos`].filter(Boolean);
  return p.length ? p.join(" · ") : "—";
};

const sangria = (nivel: number) => ({ paddingLeft: `calc(${nivel} * var(--lm-space-20))` });

/** Árbol de la unidad en una tabla: POSICIÓN · CATEGORÍA · Nº DE SERIE · DRIVER, con selección de un activo. */
export function TablaArbolUnidad({ raiz, unidad, activos, sel, onSel, busca, alto = 420, render }: {
  raiz: Nodo; unidad: string; activos: Record<string, ActivoM>; sel: string; onSel: (serie: string) => void; busca: string; alto?: number;
  /** Contenido extra al final de la fila (opcional). */
  render?: (a: ActivoM | undefined, n: Nodo) => ReactNode;
}) {
  const { activoDe, rutaDe } = useMemo(() => huecosConActivo(raiz, unidad, activos), [raiz, unidad, activos]);
  const [cerrados, setCerrados] = useState<Record<string, boolean>>(() => {
    const c: Record<string, boolean> = {};
    recorrer(raiz, (n, nivel) => { if (nivel >= 3 && n.hijos.length) c[n.id] = true; });
    return c;
  });
  const q = busca.trim().toLowerCase();
  const filas: { n: Nodo; nivel: number }[] = [];
  if (q) {
    recorrer(raiz, (n, nivel) => { if (nivel > 1 && (activoDe(n)?.serie ?? "").toLowerCase().includes(q)) filas.push({ n, nivel: 1 }); });
  } else {
    const ir = (n: Nodo, nivel: number) => { if (nivel > 1) filas.push({ n, nivel: nivel - 2 }); if (!cerrados[n.id]) n.hijos.forEach((h) => ir(h, nivel + 1)); };
    ir(raiz, 1);
  }
  return (
    <div style={{ maxHeight: alto, overflow: "auto", border: "1px solid var(--lm-sys-outline-variant)", borderRadius: "var(--lm-corner-30)" }}>
      <table className="lm-table">
        <thead style={{ position: "sticky", top: 0, background: "var(--lm-sys-surface-container-lowest)", zIndex: 1 }}>
          <tr><th>Posición</th><th>Categoría</th><th>Nº de serie</th><th>Driver</th>{render && <th />}</tr>
        </thead>
        <tbody>
          {!filas.length && <tr><td colSpan={5} className="muted">Ningún activo de la unidad {unidad} coincide con "{busca}"</td></tr>}
          {filas.map(({ n, nivel }) => {
            const a = activoDe(n);
            const on = !!a && a.serie === sel;
            return (
              <tr key={n.id} onClick={() => a && onSel(a.serie)} style={{ cursor: a ? "pointer" : "default", background: on ? "var(--lm-sys-secondary-container)" : undefined }}>
                <td>
                  <span className="row gap-5" style={sangria(nivel)}>
                    {!q && n.hijos.length ? (
                      <IconButton compact icon={cerrados[n.id] ? "chevron_right" : "expand_more"} label={`${cerrados[n.id] ? "Desplegar" : "Plegar"} ${n.nombre}`}
                        onClick={(e) => { e.stopPropagation(); setCerrados((c) => ({ ...c, [n.id]: !c[n.id] })); }} />
                    ) : <span style={{ width: "var(--lm-space-40)" }} />}
                    <input type="radio" name={`sel-${unidad}`} disabled={!a} checked={on} onChange={() => a && onSel(a.serie)} aria-label={`Elegir ${rutaDe(n)}`} onClick={(e) => e.stopPropagation()} />
                    <span style={{ fontWeight: n.hijos.length ? 500 : 400 }}>{q ? rutaDe(n) : n.nombre}</span>
                  </span>
                </td>
                <td>{n.categoria}</td>
                <td className={a ? "emph" : "muted"}>{a ? a.serie : "Vacío"}</td>
                <td className="muted">{textoDriver(a)}</td>
                {render && <td>{render(a, n)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Activos de un almacén que se pueden elegir; con conHijos, cada uno con sus activos montados debajo (no seleccionables). */
export function TablaAlmacen({ candidatos, activos, sel, onSel, conHijos, alto = 420 }: {
  candidatos: ActivoM[]; activos: Record<string, ActivoM>; sel: string; onSel: (serie: string) => void; conHijos: boolean; alto?: number;
}) {
  return (
    <div style={{ maxHeight: alto, overflow: "auto", border: "1px solid var(--lm-sys-outline-variant)", borderRadius: "var(--lm-corner-30)" }}>
      <table className="lm-table">
        <thead style={{ position: "sticky", top: 0, background: "var(--lm-sys-surface-container-lowest)", zIndex: 1 }}>
          <tr><th>Nº de serie</th><th>Categoría</th><th>Posición</th><th>Driver</th></tr>
        </thead>
        <tbody>
          {candidatos.flatMap((a) => {
            const on = a.serie === sel;
            const fila = (
              <tr key={a.serie} onClick={() => onSel(a.serie)} style={{ cursor: "pointer", background: on ? "var(--lm-sys-secondary-container)" : undefined }}>
                <td>
                  <span className="row gap-10">
                    <input type="radio" name="sel-almacen" checked={on} onChange={() => onSel(a.serie)} aria-label={`Elegir ${a.categoria} ${a.serie}`} onClick={(e) => e.stopPropagation()} />
                    <span style={{ fontWeight: 500 }}>{a.serie}</span>
                  </span>
                </td>
                <td>{a.categoria}</td>
                <td>{a.lugar.tipo === "almacen" && a.lugar.padre ? <>En {a.lugar.padre}{a.lugar.enHueco ? ` › ${a.lugar.enHueco}` : ""}</> : <Tag tone="neutral">Suelto</Tag>}</td>
                <td className="muted">{textoDriver(a)}</td>
              </tr>
            );
            if (!conHijos) return [fila];
            const hijos = descendientes(activos, a).map((d) => (
              <tr key={`${a.serie}>${d.a.serie}`} className="is-child" onClick={() => onSel(a.serie)} style={{ cursor: "pointer", background: on ? "var(--lm-sys-secondary-container)" : undefined }}>
                <td><span style={sangria(d.rel.split(SEP).length + 1)} className="muted">{d.a.serie}</span></td>
                <td className="muted">{d.a.categoria}</td>
                <td className="muted">{d.rel}</td>
                <td className="muted">{textoDriver(d.a)}</td>
              </tr>
            ));
            return [fila, ...hijos];
          })}
        </tbody>
      </table>
    </div>
  );
}
