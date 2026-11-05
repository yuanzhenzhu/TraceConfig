"use client";

// Cálculo de drivers en SMS (HU-21). Sección opcional del paso 3 del asistente.
// Es de la FLOTA: si una flota tiene varias configuraciones, todas comparten el mismo cálculo.
// Cada cálculo se configura en dos pasos: 1) el driver (km, ciclos u horas) y 2) su forma de cálculo
// (flota, línea, categoría, o categoría y posición). Se pueden añadir varios, uno por driver.

import { Banner, Button, Field, Icon, IconButton } from "./ds";
import { DRIVERS, FORMAS_SMS, smsCompleto, type CalculoSms, type DriverId, type Flota, type FormaSms } from "@/lib/model";
import { useStore } from "@/lib/store";

export function SeccionSms({ flota, setFlota, configId, intentado }: {
  flota: Flota; setFlota: (cambios: Partial<Flota>) => void; configId: string; intentado: boolean;
}) {
  const store = useStore();
  const calculos = flota.sms ?? [];
  const otras = store.configs.filter((x) => x.flotaId === flota.id && x.id !== configId && x.guardada);
  const usados = calculos.map((x) => x.driver).filter(Boolean);
  const guardar = (lista: CalculoSms[]) => setFlota({ sms: lista });
  const cambiar = (i: number, cambios: Partial<CalculoSms>) => guardar(calculos.map((x, k) => (k === i ? { ...x, ...cambios } : x)));
  const anadir = () => guardar([...calculos, { driver: "", forma: "" }]);
  const quitar = (i: number) => guardar(calculos.filter((_, k) => k !== i));
  const lleno = calculos.length >= DRIVERS.length;

  return (
    <section className="lm-surface lm-surface--p24 stack gap-20">
      <div className="row gap-10">
        <h2 className="lm-title-medium grow" style={{ margin: 0 }}>Cálculo de drivers en SMS</h2>
        <span className="lm-body-small muted">Opcional</span>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Indica qué drivers se envían a SMS, la herramienta de planificación de mantenimientos, y cómo calcula cada uno. Para cada cálculo, elige primero el driver y después su forma de cálculo. Puedes añadir varios: por ejemplo, el kilometraje por flota y los ciclos por categoría.
      </p>
      <Banner type="info" title={`Es de la flota ${flota.nombre}`}>
        {otras.length
          ? `Lo comparten todas sus configuraciones: si lo cambias aquí, también cambia en ${otras.map((x) => store.etiqueta(x)).join(", ")}.`
          : "Lo comparten todas sus configuraciones: si la flota tiene más, tendrán el mismo cálculo."}
      </Banner>

      {calculos.length === 0 ? (
        <div className="lm-card">
          <div className="lm-center" style={{ padding: "var(--lm-space-30) var(--lm-space-20)" }}>
            <Icon name="functions" size="xl" />
            <span>Todavía no se envía ningún driver a SMS</span>
            <span className="lm-body-small">Si no lo necesitas, continúa con el paso siguiente</span>
            <Button variant="outlined" icon="add" onClick={anadir}>Añadir driver</Button>
          </div>
        </div>
      ) : (
        <>
          {calculos.map((x, i) => {
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
            {intentado && !smsCompleto(flota) && <span className="lm-body-small" style={{ color: "var(--lm-sys-error)" }}>Completa o quita los cálculos sin terminar</span>}
          </div>
        </>
      )}
    </section>
  );
}

/** Texto corto de los cálculos en SMS de una flota (resumen). */
export function textoSms(flota: Flota) {
  const lista = (flota.sms ?? []).filter((x) => x.driver && x.forma);
  if (!lista.length) return "No se envía ningún driver a SMS";
  return lista.map((x) => `${DRIVERS.find((d) => d.id === x.driver)?.nombre} por ${FORMAS_SMS.find((f) => f.id === x.forma)?.nombre.toLowerCase()}`).join(" · ");
}
