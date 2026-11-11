"use client";

// Resultado de un intercambio entre unidad y almacén, compacto: dos líneas, SALE y ENTRA, con origen → destino
// y debajo, en pequeño, sus activos montados con su posición (y el cambio si se ha rotado).
// Se usa en la pantalla y en el dialog de confirmación.

import { Icon, Tag } from "@/components/ds";
import { SEP } from "@/lib/datos";
import { useTextos, type FilaMov, type Lugar } from "@/lib/movimientos";

function Linea({ etiqueta, tono, filas, rotado }: { etiqueta: string; tono: "error" | "success"; filas: FilaMov[]; rotado?: boolean }) {
  const t = useTextos();
  const p = filas.find((f) => !f.conPadre);
  if (!p) return null;
  const hijos = filas.filter((f) => f.conPadre);
  // Posición de cada hijo respecto a su padre (en la unidad, la ruta bajo el hueco del padre; en el almacén, su hueco en el padre)
  const base = (l: Lugar) => (l.tipo === "unidad" ? l.hueco : "");
  const posicion = (l: Lugar, b: string) => (l.tipo === "unidad" ? (b && l.hueco.startsWith(b + SEP) ? l.hueco.slice(b.length + SEP.length) : l.hueco) : l.tipo === "almacen" ? l.enHueco ?? "" : "");
  const bAntes = base(p.antes), bDespues = base(p.despues);
  return (
    <div className="stack gap-5" style={{ padding: "var(--lm-space-15) 0" }}>
      <div className="row gap-10 wrap">
        <span style={{ width: 64 }}><Tag tone={tono}>{etiqueta}</Tag></span>
        <span style={{ fontWeight: 500 }}>{p.categoria} {p.serie}</span>
        {rotado && <Tag tone="info">Rotado 180°</Tag>}
        <span className="muted">{t.lugar(p.antes)}</span>
        <span aria-label="pasa a" className="row" style={{ color: "var(--lm-sys-on-surface-variant)" }}><Icon name="arrow_right" size="m" /></span>
        <span style={{ fontWeight: 500 }}>{t.lugar(p.despues)}</span>
      </div>
      <span className="lm-body-small muted" style={{ paddingLeft: 74 }}>
        {hijos.length ? <>Con {hijos.map((h, i) => {
          const antes = posicion(h.antes, bAntes), despues = posicion(h.despues, bDespues);
          const pos = antes && despues && antes.split(SEP).pop() !== despues.split(SEP).pop() ? <>{antes} → <strong>{despues}</strong></> : despues || antes;
          return <span key={h.serie}>{i > 0 && " · "}{pos} {h.serie}</span>;
        })}</> : "Sin activos montados"}
      </span>
    </div>
  );
}

export function ResultadoIntercambio({ filas, rotado }: { filas: FilaMov[]; unidad?: string; almacen?: string; rotado?: boolean }) {
  return (
    <div className="stack" style={{ border: "1px solid var(--lm-sys-outline-variant)", borderRadius: "var(--lm-corner-30)", padding: "0 var(--lm-space-20)" }}>
      <Linea etiqueta="Sale" tono="error" filas={filas.filter((f) => f.antes.tipo === "unidad")} />
      <hr className="lm-divider" />
      <Linea etiqueta="Entra" tono="success" filas={filas.filter((f) => f.antes.tipo === "almacen")} rotado={rotado} />
    </div>
  );
}
