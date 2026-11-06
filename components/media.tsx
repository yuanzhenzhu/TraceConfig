"use client";

// Cálculo de media de los drivers: pestaña propia en Configuración › Drivers (no está en el alta ni en cada configuración).
// Es de cada FLOTA, común a todas sus configuraciones. Es opcional.
// Cada cálculo se configura en dos pasos: 1) el driver (km, ciclos u horas) y 2) su forma de cálculo:
// por flota o por línea, y en cada caso también por categoría, o por categoría y posición. Uno por driver.

import { Button, Field, Icon, IconButton } from "./ds";
import { DRIVERS, FORMAS_MEDIA, type CalculoMedia, type DriverId, type FormaMedia } from "@/lib/model";

const nombreDriver = (id: DriverId | "") => DRIVERS.find((d) => d.id === id)?.nombre;
const forma = (id: FormaMedia | "") => FORMAS_MEDIA.find((f) => f.id === id);

export function SeccionMedia({ valor, onChange, intentado }: {
  valor: CalculoMedia[]; onChange: (v: CalculoMedia[]) => void; intentado: boolean;
}) {
  const usados = valor.map((x) => x.driver).filter(Boolean);
  const cambiar = (i: number, cambios: Partial<CalculoMedia>) => onChange(valor.map((x, k) => (k === i ? { ...x, ...cambios } : x)));
  const anadir = () => onChange([...valor, { driver: "", forma: "" }]);
  const quitar = (i: number) => onChange(valor.filter((_, k) => k !== i));
  const lleno = valor.length >= DRIVERS.length;
  const incompleto = valor.some((x) => !x.driver || !x.forma);

  return (
    <div className="stack gap-20">
      <p className="muted" style={{ margin: 0 }}>
        Indica de qué drivers se calcula la media y cómo. Se aplica a todas las configuraciones de la flota. Para cada cálculo, elige primero el driver y después su forma de cálculo. Puedes añadir varios: por ejemplo, el kilometraje por flota y los ciclos por línea y categoría.
      </p>

      {valor.length === 0 ? (
        <div className="lm-card">
          <div className="lm-center" style={{ padding: "var(--lm-space-30) var(--lm-space-20)" }}>
            <Icon name="functions" size="xl" />
            <span>Todavía no se calcula la media de ningún driver</span>
            <span className="lm-body-small">Es opcional</span>
            <Button variant="outlined" icon="add" onClick={anadir}>Añadir driver</Button>
          </div>
        </div>
      ) : (
        <>
          {valor.map((x, i) => {
            const errDriver = intentado && !x.driver ? "Elige el driver" : "";
            const errForma = intentado && x.driver && !x.forma ? "Elige la forma de cálculo" : "";
            return (
              <div key={i} className="lm-card stack gap-15">
                <div className="row gap-10">
                  <span className="lm-title-small grow">
                    Cálculo {i + 1}{x.driver && x.forma ? ` · ${nombreDriver(x.driver)} por ${forma(x.forma)?.nombre.toLowerCase()}` : ""}
                  </span>
                  <IconButton icon="delete" label={`Quitar el cálculo ${i + 1}`} onClick={() => quitar(i)} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "var(--lm-space-30)", alignItems: "start" }}>
                  <Field label="1. Driver" required htmlFor={`media-driver-${i}`} error={errDriver}>
                    <select id={`media-driver-${i}`} className="lm-select" value={x.driver} aria-invalid={!!errDriver}
                      onChange={(e) => cambiar(i, { driver: e.target.value as DriverId })}>
                      <option value="">Elige un driver</option>
                      {DRIVERS.map((d) => (
                        <option key={d.id} value={d.id} disabled={d.id !== x.driver && usados.includes(d.id)}>{d.nombre}</option>
                      ))}
                    </select>
                  </Field>
                  <fieldset className="stack gap-10" style={{ border: 0, padding: 0, margin: 0 }} disabled={!x.driver}>
                    <legend className="lm-field__label" style={{ marginBottom: "var(--lm-space-10)" }}>
                      2. Forma de cálculo{!x.driver && <span className="muted"> · elige antes el driver</span>}
                    </legend>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--lm-space-10) var(--lm-space-30)" }}>
                      {(["flota", "linea"] as const).map((g) => (
                        <div key={g} className="stack gap-10">
                          <span className="lm-label-medium muted">{g === "flota" ? "POR FLOTA" : "POR LÍNEA"}</span>
                          {FORMAS_MEDIA.filter((f) => f.grupo === g).map((f) => (
                            <label key={f.id} className="lm-radio" style={{ alignItems: "flex-start", opacity: x.driver ? 1 : "var(--lm-state-disabled-content)" }}>
                              <input type="radio" name={`media-forma-${i}`} checked={x.forma === f.id} onChange={() => cambiar(i, { forma: f.id })} />
                              <span className="lm-radio__text"><span>{f.nombre}</span><span className="lm-radio__support">{f.desc}</span></span>
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
                    {errForma && <span className="lm-field__support lm-field__support--error" role="alert">{errForma}</span>}
                  </fieldset>
                </div>
              </div>
            );
          })}
          <div className="row gap-10">
            <Button variant="outlined" icon="add" disabled={lleno} onClick={anadir}>Añadir otro driver</Button>
            {lleno && <span className="lm-body-small muted">Ya hay un cálculo para cada driver</span>}
            {intentado && incompleto && <span className="lm-body-small" style={{ color: "var(--lm-sys-error)" }}>Completa o quita los cálculos sin terminar</span>}
          </div>
        </>
      )}
    </div>
  );
}
