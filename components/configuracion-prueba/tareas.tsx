"use client";

// (Prueba, 18-11-2026) Panel de progreso: se abre con el icono de información junto a los estados
// 1/3 (flota sin estructura) y 2/3 (configuración sin todas las plantillas). Figma Main-Trace 1169:21396.
// Se basa en el patrón `configuration-detail-card` (popover) de Compositions: panel sobre la tabla, con tokens del sistema.
// (24-11-2026) Título «Progreso (N/3)», pasos Flota · Estructuras y unidades (con sus opcionales) · Plantillas
// dentro de un recuadro, y una sola acción abajo: Continuar (botón principal a todo el ancho).

import { useEffect, useRef, useState } from "react";
import { Button, Icon, IconButton } from "../ds";

export type Tarea = {
  titulo: string;
  /** hecha: check verde · pendiente: círculo vacío */
  estado: "hecha" | "pendiente";
  /** Texto más pequeño debajo de la tarea, con una etiqueta encima (p. ej. «Opcionales») */
  sub?: { etiqueta: string; texto: string };
};

export function TareasPendientes({ titulo, tareas, label, accion }: {
  titulo: string; tareas: Tarea[]; label: string; accion: { label: string; onClick: () => void };
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const fuera = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", fuera); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <IconButton compact icon="info" label={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)} />
      {open && (
        <div role="dialog" aria-label={titulo} style={{
          position: "absolute", top: "calc(100% + var(--lm-space-5))", right: 0, zIndex: 30, width: 400,
          padding: "var(--lm-space-20)", background: "var(--lm-sys-surface-container-lowest)",
          borderRadius: "var(--lm-corner-30)", boxShadow: "var(--lm-elevation-2)", textAlign: "left", whiteSpace: "normal",
        }}>
          <div className="row gap-10" style={{ marginBottom: "var(--lm-space-15)" }}>
            <span className="lm-title-medium grow">{titulo}</span>
            <IconButton icon="close" label="Cerrar progreso" onClick={() => setOpen(false)} />
          </div>
          <ol style={{
            listStyle: "none", margin: 0, padding: "var(--lm-space-15) var(--lm-space-20)", position: "relative",
            background: "var(--lm-sys-surface-container-low)", border: "1px solid var(--lm-sys-outline-variant)", borderRadius: "var(--lm-corner-30)",
          }}>
            {tareas.map((t, i) => (
              <li key={t.titulo} className="row gap-15" style={{ alignItems: "flex-start", position: "relative", paddingBottom: i < tareas.length - 1 ? "var(--lm-space-20)" : 0 }}>
                {/* Línea hasta el paso siguiente */}
                {i < tareas.length - 1 && (
                  <span aria-hidden="true" style={{ position: "absolute", left: 15, top: 32, bottom: 0, borderLeft: "1px solid var(--lm-sys-outline-variant)" }} />
                )}
                <span aria-label={t.estado === "hecha" ? "Hecha" : "Pendiente"} role="img" style={{
                  width: 32, height: 32, flex: "none", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center",
                  ...(t.estado === "hecha"
                    ? { background: "var(--lm-success-container-variant)", color: "var(--lm-on-success-container)" }
                    : { background: "var(--lm-sys-surface-container-lowest)", border: "2px solid var(--lm-sys-outline-variant)" }),
                }}>
                  {t.estado === "hecha" && <Icon name="check" size="m" />}
                </span>
                <span className="stack gap-10 grow" style={{ paddingTop: "var(--lm-space-5)" }}>
                  <span className="lm-title-medium">{t.titulo}</span>
                  {t.sub && (
                    <span className="stack gap-5">
                      <span className="lm-label-small" style={{ textTransform: "uppercase" }}>{t.sub.etiqueta}</span>
                      <span className="muted">{t.sub.texto}</span>
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
          <Button style={{ width: "100%", marginTop: "var(--lm-space-20)" }} onClick={() => { setOpen(false); accion.onClick(); }}>{accion.label}</Button>
        </div>
      )}
    </span>
  );
}
