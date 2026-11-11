"use client";

// Resultado de un intercambio entre unidad y almacén, como ANTES / DESPUÉS de cada sitio:
// izquierda, la posición de la unidad (qué había montado y qué queda); derecha, el almacén (qué había y qué tiene ahora).
// Se calcula aplicando las filas del movimiento a los activos actuales. Se usa en la pantalla y en la confirmación.

import { Banner, Tag } from "@/components/ds";
import { SEP } from "@/lib/datos";
import { descendientes, useTextos, type ActivoM, type FilaMov } from "@/lib/movimientos";

type Item = { pos: string; categoria: string; serie: string; cambia?: string; vacio?: "antes" | "nuevo" };

const caja = {
  border: "1px solid var(--lm-sys-outline-variant)", borderRadius: "var(--lm-corner-30)",
  padding: "var(--lm-space-15) var(--lm-space-20)", flex: 1, minWidth: 0,
};

function Lista({ titulo, items, tono }: { titulo: string; items: Item[]; tono: "neutral" | "primary" }) {
  const [p, ...hijos] = items;
  return (
    <div className="stack gap-5" style={{ flex: 1, minWidth: 0 }}>
      <span><Tag tone={tono}>{titulo}</Tag></span>
      {!p ? <span className="muted">Vacío</span> : (
        <>
          <span><span style={{ fontWeight: 500 }}>{p.categoria} {p.serie}</span></span>
          {hijos.map((h) => h.vacio ? (
            <span key={`vacio-${h.pos}`} className="lm-body-small row gap-5" style={{ paddingLeft: "var(--lm-space-15)" }}>
              <span className="muted">{h.pos}</span>
              {h.vacio === "nuevo" ? <Tag tone="warning">Queda vacío</Tag> : <span className="muted">· vacío</span>}
            </span>
          ) : (
            <span key={h.serie} className="lm-body-small" style={{ paddingLeft: "var(--lm-space-15)" }}>
              <span className="muted">{h.cambia ? <>{h.cambia} → <strong style={{ color: "var(--lm-sys-on-surface)" }}>{h.pos}</strong></> : h.pos}</span> {h.serie}
            </span>
          ))}
        </>
      )}
    </div>
  );
}

export function ResultadoIntercambio({ filas, activos, serieUnidad, serieAlmacen, huecos = [] }: {
  filas: FilaMov[]; activos: Record<string, ActivoM>; serieUnidad: string; serieAlmacen: string;
  /** Huecos de la estructura por debajo de la posición (ruta relativa y categoría), para mostrar los que quedan vacíos. */
  huecos?: { rel: string; categoria: string }[];
}) {
  const t = useTextos();
  const A = activos[serieUnidad], B = activos[serieAlmacen];
  if (!A || !B || A.lugar.tipo !== "unidad" || B.lugar.tipo !== "almacen") return null;
  const { unidad, hueco } = A.lugar;
  const almacenId = B.lugar.almacenId;

  // Estado después: los activos con el "después" de cada fila
  const despues: Record<string, ActivoM> = { ...activos };
  filas.forEach((f) => { despues[f.serie] = { ...despues[f.serie], lugar: f.despues }; });
  const relAntes = new Map(filas.map((f) => [f.serie, f.antes]));

  // Unidad: lo montado en el hueco y por debajo, antes y después
  const enHueco = (estado: Record<string, ActivoM>): Item[] => Object.values(estado)
    .filter((a) => a.lugar.tipo === "unidad" && a.lugar.unidad === unidad && (a.lugar.hueco === hueco || a.lugar.hueco.startsWith(hueco + SEP)))
    .map((a) => {
      const h = (a.lugar as { hueco: string }).hueco;
      return { pos: h === hueco ? h.split(SEP).pop()! : h.slice(hueco.length + SEP.length), categoria: a.categoria, serie: a.serie };
    })
    .sort((x, y) => (x.pos === hueco.split(SEP).pop() ? -1 : y.pos === hueco.split(SEP).pop() ? 1 : x.pos.localeCompare(y.pos, "es", { numeric: true })));
  const ordenar = (l: Item[]) => { const [p, ...h] = l; return [p, ...h.sort((x, y) => x.pos.localeCompare(y.pos, "es", { numeric: true }))].filter(Boolean); };
  // Huecos sin activo: en "Antes" ya vacíos; en "Después", los que quedan vacíos con este movimiento se resaltan
  const conVacios = (l: Item[], ocupadosAntes?: Set<string>): Item[] => ordenar([...l, ...huecos.filter((h) => !l.some((i) => i.pos === h.rel))
    .map((h): Item => ({ pos: h.rel, categoria: h.categoria, serie: "", vacio: ocupadosAntes?.has(h.rel) ? "nuevo" : "antes" }))]);
  const antesSinVacios = enHueco(activos);
  const unidadAntes = conVacios(antesSinVacios);
  const unidadDespues = conVacios(enHueco(despues).map((i) => {
    const a = relAntes.get(i.serie);
    const antes = a && a.tipo === "almacen" ? a.enHueco : undefined;
    return antes && antes !== i.pos.split(SEP).pop() ? { ...i, cambia: antes } : i;
  }), new Set(antesSinVacios.map((i) => i.pos)));
  const nuevosVacios = unidadDespues.filter((i) => i.vacio === "nuevo").map((i) => i.pos);

  // Almacén: el activo que había (con sus hijos) y el que queda (con sus hijos)
  const conjunto = (estado: Record<string, ActivoM>, s: string): Item[] => {
    const a = estado[s];
    return [{ pos: "", categoria: a.categoria, serie: a.serie }, ...descendientes(estado, a).map((d) => ({ pos: d.rel, categoria: d.a.categoria, serie: d.a.serie }))];
  };
  const almacenAntes = conjunto(activos, B.serie);
  const almacenDespues = conjunto(despues, A.serie);

  return (
    <div className="stack gap-15">
    <div className="row gap-15" style={{ alignItems: "stretch" }}>
      <div className="stack gap-10" style={caja}>
        <span className="stack">
          <span className="lm-title-small">Unidad {unidad}</span>
          <span className="lm-body-small muted">{hueco}</span>
        </span>
        <div className="row gap-20" style={{ alignItems: "flex-start" }}>
          <Lista titulo="Antes" tono="neutral" items={unidadAntes} />
          <Lista titulo="Después" tono="primary" items={unidadDespues} />
        </div>
      </div>
      <div className="stack gap-10" style={caja}>
        <span className="stack">
          <span className="lm-title-small">{t.nombreAlmacen(almacenId)}</span>
          <span className="lm-body-small muted">{B.lugar.padre ? `En ${B.lugar.padre}${B.lugar.enHueco ? ` › ${B.lugar.enHueco}` : ""}` : "Suelto"}</span>
        </span>
        <div className="row gap-20" style={{ alignItems: "flex-start" }}>
          <Lista titulo="Antes" tono="neutral" items={almacenAntes} />
          <Lista titulo="Después" tono="primary" items={almacenDespues} />
        </div>
      </div>
    </div>
    {nuevosVacios.length > 0 && (
      <Banner type="attention" title={`${nuevosVacios.length === 1 ? "Queda 1 hueco vacío" : `Quedan ${nuevosVacios.length} huecos vacíos`} en la unidad ${unidad}`}>
        {nuevosVacios.map((p) => `${hueco} › ${p}`).join(" · ")}. El {B.categoria.replace(/^./, (c) => c.toLowerCase())} {B.serie} no tiene activos para esas posiciones; podrás montarlos después con Montaje.
      </Banner>
    )}
    </div>
  );
}
