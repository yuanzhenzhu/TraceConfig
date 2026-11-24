"use client";

// (Prueba, 24-11-2026) Stepper del asistente de configuración: empieza por Estructura y unidades.
// Los pasos a los que aún no se puede ir llevan candado. Sin la palabra «Opcional» (24-11-2026).
// Sin paso Resumen: se finaliza en Plantillas.

import { Icon } from "../ds";

export const PASOS_PRUEBA: { n: number; titulo: string }[] = [
  { n: 1, titulo: "Estructura y unidades" },
  { n: 3, titulo: "Drivers" },
  { n: 2, titulo: "Añadir valor a propiedades de hueco" },
  { n: 4, titulo: "Propiedades categoría" },
  { n: 7, titulo: "Plantillas" },
];

export function StepperPrueba({ actual, hecho, bloqueado, onIr, plano }: {
  actual: number; hecho: (n: number) => boolean; bloqueado: (n: number) => boolean; onIr?: (n: number) => void;
  /** Sin superficie propia: cuando va dentro de otra superficie (pantalla de configuración nueva) */
  plano?: boolean;
}) {
  return (
    <nav aria-label="Pasos de la configuración" className={plano ? undefined : "lm-surface"} style={{ marginBottom: plano ? 0 : "var(--lm-space-20)" }}>
      <ol className="lm-stepper" style={{ listStyle: "none", margin: 0 }}>
        {PASOS_PRUEBA.map((x, i) => {
          const lock = bloqueado(x.n);
          const ok = !lock && x.n !== actual && hecho(x.n);
          const cls = x.n === actual ? "is-current" : lock ? "is-locked" : ok ? "is-done" : "";
          return (
            <li key={x.n} className="row gap-10" style={{ flex: i < PASOS_PRUEBA.length - 1 ? 1 : undefined }}>
              <button className={`lm-step ${cls}`} disabled={lock} aria-current={x.n === actual ? "step" : undefined} onClick={() => onIr?.(x.n)}>
                <span className="lm-step__dot">{lock ? <Icon name="lock" label="Bloqueado" /> : ok ? <Icon name="check" /> : i + 1}</span>
                <span className="lm-step__label"><span>{x.titulo}</span></span>
              </button>
              {i < PASOS_PRUEBA.length - 1 && <span className="lm-stepper__line" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
