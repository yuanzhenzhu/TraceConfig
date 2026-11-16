"use client";

// Cálculo de media de los drivers: pestaña propia en Configuración › Drivers (no está en el alta ni en cada configuración).
// Se muestra como una tabla con todos los cálculos; cada uno se añade o modifica en un dialog, con los pasos en orden:
// 1) por flota o por línea, 2) la flota o línea concreta, 3) el driver, 4) su forma de cálculo (solo las de ese nivel)
// y 5) sus opciones: periodo de cálculo (normalmente 180 días) y, en las formas por categoría, la categoría (prueba 16-11-2026).
// Una flota o línea tiene como mucho un cálculo por driver. Es opcional.

import { useState } from "react";
import { Button, Dialog, Field } from "./ds";
import { CATEGORIAS, DRIVERS, FORMAS_MEDIA, LINEAS, PERIODO_MEDIA, formaConCategoria, type DriverId, type FormaMedia, type NivelMedia } from "@/lib/model";

/** Un cálculo de media, con su flota o línea. */
export type FilaMedia = { nivel: NivelMedia; destino: string; driver: DriverId; forma: FormaMedia; periodo: number; categoria?: string };

export const nombreDriver = (id: DriverId) => DRIVERS.find((d) => d.id === id)?.nombre ?? id;
export const nombreForma = (id: FormaMedia) => FORMAS_MEDIA.find((f) => f.id === id)?.nombre ?? id;

export function DialogMedia({ fila, flotas, usados, onClose, onGuardar }: {
  fila?: FilaMedia;
  flotas: { id: string; nombre: string }[];
  /** Drivers que ya tienen cálculo en cada flota o línea (clave "flota:<id>" o "linea:<id>"), sin contar el que se modifica. */
  usados: (nivel: NivelMedia, destino: string) => DriverId[];
  onClose: () => void;
  onGuardar: (f: FilaMedia) => void;
}) {
  const [nivel, setNivel] = useState<NivelMedia | "">(fila?.nivel ?? "");
  const [destino, setDestino] = useState(fila?.destino ?? "");
  const [driver, setDriver] = useState<DriverId | "">(fila?.driver ?? "");
  const [forma, setForma] = useState<FormaMedia | "">(fila?.forma ?? "");
  const [periodo, setPeriodo] = useState(String(fila?.periodo ?? PERIODO_MEDIA));
  const [categoria, setCategoria] = useState(fila?.categoria ?? "");
  const [intentado, setIntentado] = useState(false);

  const opciones = nivel === "flota" ? flotas : nivel === "linea" ? LINEAS : [];
  const ocupados = nivel && destino ? usados(nivel, destino) : [];
  const libres = DRIVERS.filter((d) => !ocupados.includes(d.id));
  const conCategoria = formaConCategoria(forma);
  const dias = Number(periodo);
  const errPeriodo = !periodo.trim() ? "Indica el periodo de cálculo"
    : !Number.isInteger(dias) || dias < 1 || dias > 3650 ? "Indica un número de días entre 1 y 3650" : "";
  const errCategoria = conCategoria && !categoria ? "Elige una categoría" : "";
  const valido = !!(nivel && destino && driver && forma) && !errPeriodo && !errCategoria;
  const etiqueta = nivel === "linea" ? "Línea" : "Flota";

  const cambiarNivel = (n: NivelMedia) => { if (n !== nivel) { setNivel(n); setDestino(""); setForma(""); } };
  const cambiarDestino = (d: string) => { setDestino(d); if (driver && nivel && usados(nivel, d).includes(driver)) setDriver(""); };
  const guardar = () => {
    setIntentado(true);
    if (!valido || !nivel || !driver || !forma) return;
    onGuardar({ nivel, destino, driver, forma, periodo: dias, ...(conCategoria ? { categoria } : {}) });
  };

  return (
    <Dialog large title={fila ? "Modificar cálculo de media" : "Añadir cálculo de media"} onClose={onClose}
      footer={<>
        <Button variant="outlined" onClick={onClose}>Cancelar</Button>
        <Button disabled={!(nivel && destino && driver && forma)} onClick={guardar}>{fila ? "Guardar" : "Añadir"}</Button>
      </>}>
      <div className="stack gap-20">
        <fieldset className="stack gap-10" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="lm-field__label" style={{ marginBottom: "var(--lm-space-10)" }}>1. Calcular la media por *</legend>
          <div className="row gap-30">
            {(["flota", "linea"] as const).map((n) => (
              <label key={n} className="lm-radio">
                <input type="radio" name="media-nivel" checked={nivel === n} onChange={() => cambiarNivel(n)} />
                <span className="lm-radio__text"><span>{n === "flota" ? "Flota" : "Línea"}</span></span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field label={`2. ${etiqueta}`} required htmlFor="media-destino">
          <select id="media-destino" className="lm-select" value={destino} disabled={!nivel} onChange={(e) => cambiarDestino(e.target.value)}>
            <option value="">{nivel ? `Elige una ${etiqueta.toLowerCase()}` : "Elige antes flota o línea"}</option>
            {opciones.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
          </select>
        </Field>

        <Field label="3. Tipo de driver" required htmlFor="media-driver"
          support={destino && !libres.length ? "Esta flota o línea ya tiene un cálculo para cada driver" : undefined}>
          <select id="media-driver" className="lm-select" value={driver} disabled={!destino} onChange={(e) => setDriver(e.target.value as DriverId)}>
            <option value="">{destino ? "Elige un driver" : `Elige antes la ${etiqueta.toLowerCase()}`}</option>
            {DRIVERS.map((d) => (
              <option key={d.id} value={d.id} disabled={ocupados.includes(d.id)}>{d.nombre}{ocupados.includes(d.id) ? " (ya tiene cálculo)" : ""}</option>
            ))}
          </select>
        </Field>

        <fieldset className="stack gap-10" style={{ border: 0, padding: 0, margin: 0 }} disabled={!nivel || !driver}>
          <legend className="lm-field__label" style={{ marginBottom: "var(--lm-space-10)" }}>
            4. Forma de cálculo *{(!nivel || !driver) && <span className="muted"> · elige antes el driver</span>}
          </legend>
          {(nivel ? FORMAS_MEDIA.filter((f) => f.grupo === nivel) : FORMAS_MEDIA.filter((f) => f.grupo === "flota")).map((f) => (
            <label key={f.id} className="lm-radio" style={{ alignItems: "flex-start", opacity: nivel && driver ? 1 : "var(--lm-state-disabled-content)" }}>
              <input type="radio" name="media-forma" checked={forma === f.id} onChange={() => setForma(f.id)} />
              <span className="lm-radio__text"><span>{f.nombre}</span><span className="lm-radio__support">{f.desc}</span></span>
            </label>
          ))}
        </fieldset>

        <fieldset className="stack gap-10" style={{ border: 0, padding: 0, margin: 0 }} disabled={!forma}>
          <legend className="lm-field__label" style={{ marginBottom: "var(--lm-space-10)" }}>
            5. Opciones{!forma && <span className="muted"> · elige antes la forma de cálculo</span>}
          </legend>
          <div className="row gap-20 wrap" style={{ alignItems: "flex-start" }}>
            <Field label="Periodo de cálculo (días)" required htmlFor="media-periodo" style={{ width: 220 }}
              error={intentado ? errPeriodo : undefined} support="Normalmente, 180 días">
              <input id="media-periodo" className="lm-input" inputMode="numeric" value={periodo} disabled={!forma}
                aria-invalid={intentado && !!errPeriodo} onChange={(e) => setPeriodo(e.target.value.replace(/[^\d]/g, ""))} />
            </Field>
            {conCategoria && (
              <Field label="Categoría" required htmlFor="media-categoria" style={{ width: 260 }}
                error={intentado ? errCategoria : undefined}
                support={forma.endsWith("posicion") ? "Una media por cada posición de esta categoría" : "Una media para todos los activos de esta categoría"}>
                <select id="media-categoria" className="lm-select" value={categoria} aria-invalid={intentado && !!errCategoria}
                  onChange={(e) => setCategoria(e.target.value)}>
                  <option value="">Elige una categoría</option>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
            )}
          </div>
        </fieldset>
      </div>
    </Dialog>
  );
}
