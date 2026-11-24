"use client";

// (Prueba, 24-11-2026) Paso 1 del asistente, Estructura y unidades: tarjeta simple «Configuración N» con
// Nº de unidades, Estructura, icono de info y Guardar. Sirve para crear la configuración (Asignar estructura) y,
// dentro del asistente, para cambiar las unidades (la estructura ya está confirmada) o consultarlas. No muestra la estructura.

import { useState, type ReactNode } from "react";
import { Button, Field, InfoTooltip } from "../ds";
import { useStore } from "@/lib/store";
import type { Estructura } from "@/lib/model";

export function TarjetaConfiguracion({ titulo, unidades, estructuraId, opciones, estructuraFija, soloLectura, minUnidades, aviso, onGuardar, conBorde }: {
  titulo: string;
  unidades?: number | null;
  estructuraId?: string;
  /** Estructuras que se pueden elegir (si la estructura está fija, solo se muestra la suya) */
  opciones: Estructura[];
  estructuraFija?: boolean;
  soloLectura?: boolean;
  /** Al añadir unidades: el nuevo total tiene que ser mayor que las que ya hay */
  minUnidades?: number;
  aviso?: ReactNode;
  onGuardar?: (unidades: number, estructuraId: string) => void;
  /** Tarjeta con borde dentro de otra superficie, en lugar de superficie propia */
  conBorde?: boolean;
}) {
  const store = useStore();
  const [texto, setTexto] = useState(unidades ? String(unidades) : "");
  const [estId, setEstId] = useState(estructuraId ?? "");
  const [intentado, setIntentado] = useState(false);
  const elegida = store.estructura(estId);
  const lista = estructuraFija && elegida ? [elegida] : opciones;
  const hay = lista.length > 0;

  const n = Number(texto);
  const errUnidades = !intentado ? ""
    : !texto.trim() ? "Indica el número de unidades"
    : !Number.isInteger(n) || n < 1 || n > 999 ? "Indica un número entero entre 1 y 999"
    : minUnidades !== undefined && n <= minUnidades ? `Indica un número mayor que las ${minUnidades} unidades actuales` : "";
  const errEstructura = intentado && !estId ? "Elige una estructura" : "";
  const valido = !!texto.trim() && Number.isInteger(n) && n >= 1 && n <= 999 && (minUnidades === undefined || n > minUnidades) && !!estId;

  const guardar = () => { setIntentado(true); if (valido) onGuardar?.(n, estId); };

  return (
    <section className={conBorde ? "stack gap-20" : "lm-surface lm-surface--p24 stack gap-20"}
      style={conBorde ? { padding: "var(--lm-space-15)", border: "1px solid var(--lm-sys-outline-variant)", borderRadius: "var(--lm-corner-30)" } : undefined}>
      <h2 className="lm-title-small" style={{ margin: 0 }}>{titulo}</h2>
      {aviso}
      {/* (24-11-2026) Ya confirmada: los mismos campos, no editables (sin borde de foco ni cursor de escritura)
          pero con el valor bien legible (on-surface al 100%, no al 38% del estado Disabled). */}
      {soloLectura && (
        <div className="row gap-20 wrap" style={{ alignItems: "flex-start" }}>
          <Field label="Nº de unidades" htmlFor="cfg-unid-ro" style={{ width: 300 }}>
            <input id="cfg-unid-ro" className="lm-input" value={unidades ?? ""} readOnly aria-readonly="true" tabIndex={-1} style={NO_EDITABLE} />
          </Field>
          <Field label="Estructura" htmlFor="cfg-est-ro" style={{ width: 300 }}>
            <input id="cfg-est-ro" className="lm-input" value={elegida?.nombre ?? ""} readOnly aria-readonly="true" tabIndex={-1} style={NO_EDITABLE} />
          </Field>
          {elegida && (
            <span style={{ marginTop: "var(--lm-space-30)" }}>
              <InfoTooltip label={`Descripción de ${elegida.nombre}`} text={`${elegida.descripcion || "Sin descripción"}. Ya está confirmada y no se puede cambiar`} />
            </span>
          )}
        </div>
      )}
      {/* Sin estructuras disponibles solo se muestra el aviso */}
      {hay && !soloLectura && <div className="row gap-20 wrap" style={{ alignItems: "flex-start" }}>
        <Field label="Nº de unidades" required htmlFor="cfg-unid" error={errUnidades} style={{ width: 300 }}
          support={minUnidades !== undefined ? `Ahora tiene ${minUnidades} unidades. Indica el nuevo total` : undefined}>
          <input id="cfg-unid" className="lm-input" inputMode="numeric" value={texto} placeholder="Por ejemplo: 12" readOnly={soloLectura}
            aria-invalid={!!errUnidades} onChange={(e) => setTexto(e.target.value.replace(/[^\d]/g, ""))} />
        </Field>
        <Field label="Estructura" required htmlFor="cfg-est" error={errEstructura} style={{ width: 300 }}>
          <select id="cfg-est" className="lm-select" value={estId} disabled={!hay || estructuraFija || soloLectura}
            aria-invalid={!!errEstructura} onChange={(e) => setEstId(e.target.value)}>
            <option value="">{hay ? "Elige una estructura" : "No hay estructuras disponibles"}</option>
            {lista.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </Field>
        <span className="row gap-20" style={{ marginTop: "var(--lm-space-30)" }}>
          <InfoTooltip label="Información de la estructura"
            text={elegida
              ? `${elegida.nombre}: ${elegida.descripcion || "sin descripción"}${estructuraFija ? ". Ya está confirmada y no se puede cambiar" : ""}`
              : "Elige la estructura de esta configuración. Una vez guardada no se podrá cambiar"} />
          {!soloLectura && <Button onClick={guardar}>Guardar</Button>}
        </span>
      </div>}
    </section>
  );
}

/** Campo no editable pero legible: contenedor como Disabled (on-surface al 12 %), contenido on-surface al 100 %. */
const NO_EDITABLE: React.CSSProperties = {
  color: "var(--lm-sys-on-surface)",
  borderColor: "color-mix(in srgb, var(--lm-sys-on-surface) 12%, transparent)",
  background: "var(--lm-sys-surface-container-low)",
  cursor: "default",
  pointerEvents: "none",
};
