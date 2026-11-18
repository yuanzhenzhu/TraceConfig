"use client";

// (Prueba, 18-11-2026) Panel «Tareas pendientes»: se abre con el icono de información junto a los estados
// Sin estructura (flota) y Sin plantillas (configuración). Figma Main-Trace 1169:21396.
// Se basa en el patrón `configuration-detail-card` (popover) de Compositions: panel sobre la tabla, con tokens del sistema.

import { useEffect, useRef, useState } from "react";
import { Button, Icon, IconButton } from "../ds";

export type Tarea = {
  titulo: string;
  /** hecha: check verde · pendiente: círculo · recomendable: sin marca (no es obligatoria) */
  estado: "hecha" | "pendiente" | "recomendable";
  accion?: { label: string; onClick: () => void; disabled?: boolean };
};

export function TareasPendientes({ tareas, label }: { tareas: Tarea[]; label: string }) {
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
        <div role="dialog" aria-label="Tareas pendientes" style={{
          position: "absolute", top: "calc(100% + var(--lm-space-5))", right: 0, zIndex: 30, width: 440,
          padding: "var(--lm-space-20)", background: "var(--lm-sys-surface-container-lowest)",
          borderRadius: "var(--lm-corner-30)", boxShadow: "var(--lm-elevation-2)", textAlign: "left", whiteSpace: "normal",
        }}>
          <div className="row gap-10" style={{ marginBottom: "var(--lm-space-15)" }}>
            <span className="lm-title-medium grow">Tareas pendientes</span>
            <IconButton icon="close" label="Cerrar tareas pendientes" onClick={() => setOpen(false)} />
          </div>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, position: "relative" }}>
            {/* Línea que une los pasos */}
            <span aria-hidden="true" style={{ position: "absolute", left: 11, top: 12, bottom: 12, borderLeft: "1px solid var(--lm-sys-outline-variant)" }} />
            {tareas.map((t) => (
              <li key={t.titulo} className="row gap-15" style={{ position: "relative", minHeight: 48, padding: "var(--lm-space-5) 0" }}>
                <span style={{ width: 24, display: "inline-flex", justifyContent: "center", background: "var(--lm-sys-surface-container-lowest)", color: t.estado === "hecha" ? "var(--lm-success)" : "var(--lm-sys-outline)" }}>
                  {t.estado === "hecha" ? <Icon name="check_circle" filled label="Hecha" />
                    : t.estado === "pendiente" ? <Icon name="circle" label="Pendiente" /> : null}
                </span>
                <span className="lm-body-large grow">{t.titulo}</span>
                {t.accion && (
                  <Button variant="text" small disabled={t.accion.disabled} onClick={() => { setOpen(false); t.accion!.onClick(); }}>{t.accion.label}</Button>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </span>
  );
}
