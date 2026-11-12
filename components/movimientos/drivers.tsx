"use client";

// Horas (motores) y ciclos (puertas) de los activos que se mueven en un movimiento con unidad (HU-M00 §3).
// Son opcionales y, si se rellenan, tienen que ser iguales o mayores que el último registro del activo.
// Se guardan en la fila del activo (FilaMov.horas / FilaMov.ciclos).

import { useState, type ReactNode } from "react";
import { Field } from "@/components/ds";
import { formatoKm, type ActivoM, type FilaMov } from "@/lib/movimientos";

export type TipoDriver = "horas" | "ciclos";
export const driverDe = (categoria?: string): TipoDriver | null =>
  !categoria ? null : categoria.startsWith("Motor") ? "horas" : categoria === "Puerta" ? "ciclos" : null;

/** "del motor bogie MB-0012" / "de la puerta PU-0003". */
const deActivo = (a: ActivoM) => `${a.categoria === "Puerta" ? "de la" : "del"} ${a.categoria.replace(/^./, (c) => c.toLowerCase())} ${a.serie}`;

/** Campos de horas o ciclos para los activos indicados (solo los que son motor o puerta). */
export function useDrivers(activos: (ActivoM | undefined)[]) {
  const [valores, setValores] = useState<Record<string, string>>({});
  const conDriver = activos.filter((a): a is ActivoM => !!a && !!driverDe(a.categoria));
  const datos = conDriver.map((a) => {
    const tipo = driverDe(a.categoria)!;
    const v = valores[a.serie] ?? "";
    const num = v === "" ? null : Number(v);
    const previo = tipo === "horas" ? a.horas : a.ciclos;
    const error = num !== null && previo != null && num < previo ? `Tienen que ser iguales o mayores que ${formatoKm(previo)} (último registro)` : "";
    return { a, tipo, v, num, previo, error };
  });
  const campos: ReactNode = datos.length ? (
    <div className="row gap-15 wrap" style={{ alignItems: "flex-start" }}>
      {datos.map((d) => (
        <Field key={d.a.serie} label={`${d.tipo === "horas" ? "Horas" : "Ciclos"} ${deActivo(d.a)}`} htmlFor={`drv-${d.a.serie}`} error={d.error}
          support={`Opcional${d.previo != null ? ` · último registro: ${formatoKm(d.previo)}` : ""}`} style={{ width: 260 }}>
          <input id={`drv-${d.a.serie}`} className="lm-input lm-input--dense" inputMode="numeric" value={d.v}
            onChange={(e) => setValores((x) => ({ ...x, [d.a.serie]: e.target.value.replace(/[^\d]/g, "") }))} />
        </Field>
      ))}
    </div>
  ) : null;
  return {
    campos,
    ok: datos.every((d) => !d.error),
    /** Añade las horas o ciclos a las filas de sus activos. */
    aplicar: (filas: FilaMov[]) => filas.map((f) => {
      const d = datos.find((x) => x.a.serie === f.serie && x.num !== null);
      return d ? { ...f, [d.tipo]: d.num } : f;
    }),
    /** Texto para el resumen de la confirmación: "1.250 horas del motor MB-0012". */
    texto: datos.filter((d) => d.num !== null).map((d) => `${formatoKm(d.num)} ${d.tipo} ${deActivo(d.a)}`).join(" · "),
    reset: () => setValores({}),
  };
}
