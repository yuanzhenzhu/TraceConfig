"use client";

// Resultado de un intercambio entre unidad y almacén, en dos tarjetas: lo que SALE de la unidad (y a dónde va)
// y lo que ENTRA del almacén (y dónde queda). Se usa en la pantalla y en el dialog de confirmación.

import { Icon, Tag } from "@/components/ds";
import { SEP } from "@/lib/datos";
import { useTextos, type FilaMov } from "@/lib/movimientos";

const tarjeta = {
  background: "var(--lm-sys-surface-container-low)", border: "1px solid var(--lm-sys-outline-variant)",
  borderRadius: "var(--lm-corner-40)", padding: "var(--lm-space-20)",
};

function Grupo({ titulo, tono, etiqueta, destino, filas, lado }: {
  titulo: string; tono: "error" | "success"; etiqueta: string; destino: string; filas: FilaMov[]; lado: "sale" | "entra";
}) {
  const principal = filas.find((f) => !f.conPadre);
  const hijos = filas.filter((f) => f.conPadre);
  if (!principal) return null;
  const base = lado === "sale"
    ? (principal.antes.tipo === "unidad" ? principal.antes.hueco : "")
    : (principal.despues.tipo === "unidad" ? principal.despues.hueco : "");
  const rel = (h: string) => (base && h.startsWith(base + SEP) ? h.slice(base.length + SEP.length) : h);
  return (
    <div className="stack gap-15" style={{ ...tarjeta, flex: 1, minWidth: 0 }}>
      <div className="stack gap-5">
        <span className="row gap-10"><Tag tone={tono}>{etiqueta}</Tag><span className="lm-title-small">{titulo}</span></span>
        <span className="lm-body-small muted">Va a: <strong style={{ color: "var(--lm-sys-on-surface)" }}>{destino}</strong></span>
      </div>
      <div className="stack">
        <div className="row gap-10" style={{ padding: "var(--lm-space-10) 0", borderBottom: "1px solid var(--lm-sys-outline-variant)" }}>
          <span style={{ fontWeight: 500 }}>{principal.categoria} {principal.serie}</span>
          {hijos.length > 0 ? <span className="lm-body-small muted">con {hijos.length} activos montados</span> : <span className="lm-body-small muted">sin activos montados</span>}
        </div>
        {hijos.map((f) => {
          const ahora = lado === "sale" ? (f.antes.tipo === "unidad" ? rel(f.antes.hueco) : "") : (f.despues.tipo === "unidad" ? rel(f.despues.hueco) : "");
          const antes = lado === "entra" && f.antes.tipo === "almacen" ? f.antes.enHueco ?? "" : "";
          const cambia = lado === "entra" && antes && antes !== ahora.split(SEP).pop();
          return (
            <div key={f.serie} className="row gap-10 lm-body-medium" style={{ padding: "var(--lm-space-5) 0 var(--lm-space-5) var(--lm-space-20)" }}>
              <span className="grow">{f.categoria} {f.serie}</span>
              <span className="muted">{cambia ? <>{antes} → <strong style={{ color: "var(--lm-sys-on-surface)" }}>{ahora}</strong></> : ahora}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ResultadoIntercambio({ filas, unidad, almacen }: { filas: FilaMov[]; unidad: string; almacen: string }) {
  const t = useTextos();
  const sale = filas.filter((f) => f.antes.tipo === "unidad");
  const entra = filas.filter((f) => f.antes.tipo === "almacen");
  const pSale = sale.find((f) => !f.conPadre), pEntra = entra.find((f) => !f.conPadre);
  return (
    <div className="row gap-15" style={{ alignItems: "stretch" }}>
      <Grupo lado="sale" tono="error" etiqueta="Sale" titulo={`De la unidad ${unidad}`} filas={sale}
        destino={pSale ? t.lugar(pSale.despues) : t.nombreAlmacen(almacen)} />
      <span className="row" style={{ alignSelf: "center", color: "var(--lm-sys-on-surface-variant)" }} aria-hidden="true"><Icon name="swap_vert" /></span>
      <Grupo lado="entra" tono="success" etiqueta="Entra" titulo={`Del ${t.nombreAlmacen(almacen)}`} filas={entra}
        destino={pEntra ? t.lugar(pEntra.despues) : `Unidad ${unidad}`} />
    </div>
  );
}
