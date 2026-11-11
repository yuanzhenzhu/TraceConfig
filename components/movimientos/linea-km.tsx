"use client";

// Línea de tiempo del km de una unidad, compacta (una fila): registros cercanos a la fecha y "Este movimiento" entre ellos.
// 1 anterior y 1 posterior; si no hay posterior, los 2 anteriores. El punto de este movimiento va resaltado
// (en color de error si el km no encaja). Composición con tokens del sistema (no es un componente de la librería).

import { formatoKm, textoFecha, type PuntoKm } from "@/lib/movimientos";

type Punto = { fecha: string; km: number | null; texto: string; tipo: "registro" | "nuevo" };

export function LineaKm({ previos, posterior, fechaNueva, kmNuevo, error }: {
  previos: PuntoKm[]; posterior?: PuntoKm; fechaNueva: string; kmNuevo: number | null; error?: boolean;
}) {
  const puntos: Punto[] = [
    ...previos.map((p): Punto => ({ fecha: p.fecha, km: p.km, texto: p.mov ?? "Alta", tipo: "registro" })),
    { fecha: fechaNueva, km: kmNuevo, texto: "Este movimiento", tipo: "nuevo" },
    ...(posterior ? [{ fecha: posterior.fecha, km: posterior.km, texto: posterior.mov ?? "Alta", tipo: "registro" as const }] : []),
  ];
  const color = (p: Punto) => (p.tipo === "nuevo" ? (error ? "var(--lm-sys-error)" : "var(--lm-sys-primary)") : "var(--lm-sys-outline)");
  return (
    <div role="list" aria-label="Registros de km cerca de la fecha" style={{ position: "relative", display: "grid", gridTemplateColumns: `repeat(${puntos.length}, minmax(0, 1fr))`, maxWidth: 720 }}>
      {/* línea */}
      <span aria-hidden="true" style={{ position: "absolute", left: `calc(100% / ${puntos.length * 2})`, right: `calc(100% / ${puntos.length * 2})`, top: 5, borderTop: "2px solid var(--lm-sys-outline-variant)" }} />
      {puntos.map((p, i) => (
        <div key={i} role="listitem" className="stack" style={{ alignItems: "center", gap: 2, position: "relative", textAlign: "center" }}>
          <span aria-hidden="true" style={{
            width: 12, height: 12, borderRadius: "var(--lm-corner-full)", background: p.tipo === "nuevo" ? color(p) : "var(--lm-sys-surface-container-lowest)",
            border: `2px solid ${color(p)}`,
          }} />
          <span className="lm-label-medium" style={{ color: p.tipo === "nuevo" ? color(p) : "var(--lm-sys-on-surface)" }}>
            {p.km === null ? "— km" : `${formatoKm(p.km)} km`}
          </span>
          <span className="lm-body-small muted">{textoFecha(p.fecha).slice(0, 10)} · {p.texto}</span>
        </div>
      ))}
    </div>
  );
}
