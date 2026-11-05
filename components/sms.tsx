"use client";

// Cálculo de drivers en SMS (HU-21). Va junto a los drivers: en el paso 3 del asistente y en Configuración › Drivers.
// Como los drivers, es de cada CONFIGURACIÓN (flota + estructura). Solo aparece si la flota usa SMS.
// Cada cálculo se configura en dos pasos: 1) el driver (km, ciclos u horas) y 2) su forma de cálculo
// (flota, línea, categoría, o categoría y posición). Se pueden añadir varios, uno por driver. Es opcional.

import { Button, Field, Icon, IconButton } from "./ds";
import { DRIVERS, FORMAS_SMS, type CalculoSms, type DriverId, type FormaSms } from "@/lib/model";

export function SeccionSms({ valor, onChange, intentado, soloLectura }: {
  valor: CalculoSms[]; onChange: (v: CalculoSms[]) => void; intentado: boolean; soloLectura?: boolean;
}) {
  if (soloLectura) {
    const ok = valor.filter((x) => x.driver && x.forma);
    return (
      <div className="stack gap-15" style={{ borderTop: "1px solid var(--lm-sys-outline-variant)", paddingTop: "var(--lm-space-20)" }}>
        <h3 className="lm-title-medium" style={{ margin: 0 }}>Cálculo de drivers para SMS</h3>
        {ok.length === 0 ? <span className="muted">No se envía ningún driver a SMS</span> : (
          <table className="lm-table">
            <thead><tr><th style={{ width: 48 }}>Nº</th><th>Driver</th><th>Forma de cálculo</th></tr></thead>
            <tbody>
              {ok.map((x, i) => {
                const f = FORMAS_SMS.find((y) => y.id === x.forma);
                return (
                  <tr key={i}>
                    <td className="muted">{i + 1}</td>
                    <td className="emph">{DRIVERS.find((d) => d.id === x.driver)?.nombre}</td>
                    <td><span className="stack"><span>{f?.nombre}</span><span className="lm-body-small muted">{f?.desc}</span></span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    );
  }
  const usados = valor.map((x) => x.driver).filter(Boolean);
  const cambiar = (i: number, cambios: Partial<CalculoSms>) => onChange(valor.map((x, k) => (k === i ? { ...x, ...cambios } : x)));
  const anadir = () => onChange([...valor, { driver: "", forma: "" }]);
  const quitar = (i: number) => onChange(valor.filter((_, k) => k !== i));
  const lleno = valor.length >= DRIVERS.length;
  const incompleto = valor.some((x) => !x.driver || !x.forma);

  return (
    <div className="stack gap-20" style={{ borderTop: "1px solid var(--lm-sys-outline-variant)", paddingTop: "var(--lm-space-20)" }}>
      <div className="row gap-10">
        <h3 className="lm-title-medium grow" style={{ margin: 0 }}>Cálculo de drivers para SMS</h3>
        <span className="lm-body-small muted">Opcional</span>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Indica qué drivers de esta configuración se envían a SMS, la herramienta de planificación de mantenimientos, y cómo calcula cada uno. Para cada cálculo, elige primero el driver y después su forma de cálculo. Puedes añadir varios: por ejemplo, el kilometraje por flota y los ciclos por categoría.
      </p>

      {valor.length === 0 ? (
        <div className="lm-card">
          <div className="lm-center" style={{ padding: "var(--lm-space-30) var(--lm-space-20)" }}>
            <Icon name="functions" size="xl" />
            <span>Todavía no se envía ningún driver a SMS</span>
            <span className="lm-body-small">Si no lo necesitas, puedes continuar</span>
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
                    Cálculo {i + 1}{x.driver && x.forma ? ` · ${DRIVERS.find((d) => d.id === x.driver)?.nombre} por ${FORMAS_SMS.find((f) => f.id === x.forma)?.nombre.toLowerCase()}` : ""}
                  </span>
                  <IconButton icon="delete" label={`Quitar el cálculo ${i + 1}`} onClick={() => quitar(i)} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "var(--lm-space-30)", alignItems: "start" }}>
                  <Field label="1. Driver" required htmlFor={`sms-driver-${i}`} error={errDriver}>
                    <select id={`sms-driver-${i}`} className="lm-select" value={x.driver} aria-invalid={!!errDriver}
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
                      {FORMAS_SMS.map((f) => (
                        <label key={f.id} className="lm-radio" style={{ alignItems: "flex-start", opacity: x.driver ? 1 : "var(--lm-state-disabled-content)" }}>
                          <input type="radio" name={`sms-forma-${i}`} checked={x.forma === f.id} onChange={() => cambiar(i, { forma: f.id as FormaSms })} />
                          <span className="lm-radio__text"><span>{f.nombre}</span><span className="lm-radio__support">{f.desc}</span></span>
                        </label>
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

/** Texto corto de los cálculos en SMS de una configuración (resumen y listados). */
export function textoSms(lista: CalculoSms[] | undefined) {
  const ok = (lista ?? []).filter((x) => x.driver && x.forma);
  if (!ok.length) return "No se envía ningún driver a SMS";
  return ok.map((x) => `${DRIVERS.find((d) => d.id === x.driver)?.nombre} por ${FORMAS_SMS.find((f) => f.id === x.forma)?.nombre.toLowerCase()}`).join(" · ");
}
