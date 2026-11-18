"use client";

// (Prueba, 18-11-2026) Asignación de línea: en qué línea circula cada unidad (tren) y desde cuándo.
// El Excel no trae la línea de cada unidad: la asignación inicial es FICTICIA (por flota) y los cambios se guardan
// en el navegador, con su historial. Cada asignación lleva fecha y hora; no lleva km.

import { useCallback, useEffect, useState } from "react";
import { LINEAS as LINEAS_EXCEL } from "@/lib/model";

/**
 * (Prueba) Supuesto: el cliente tiene 12 líneas. Las 3 primeras vienen del Excel (hoja de líneas);
 * de la 4 a la 12 son ficticias y solo se usan en Asignación de línea (el cálculo de medias sigue con las del Excel).
 */
export const LINEAS: { id: string; nombre: string }[] = [
  ...LINEAS_EXCEL,
  ...Array.from({ length: Math.max(0, 12 - LINEAS_EXCEL.length) }, (_, i) => {
    const n = LINEAS_EXCEL.length + i + 1;
    return { id: `linea-prueba-${n}`, nombre: `Línea ${n}` };
  }),
];

export type Asignacion = { lineaId: string; fecha: string }; // fecha: ISO
export type Historial = Record<string, Asignacion[]>; // clave de unidad («configId|1001») → asignaciones, la última es la actual

const CLAVE = "lm-prueba-asignacion-linea";

/** Línea inicial ficticia de una unidad, según su flota. */
function inicial(flotaNombre: string, i: number): Asignacion {
  // Una flota con «Línea N» en el nombre empieza en esa línea
  const n = /línea\s*(\d+)/i.exec(flotaNombre)?.[1];
  // Para las demás flotas, una línea según el nombre de la flota; la mitad de sus unidades en la siguiente
  const h = [...flotaNombre].reduce((t, ch) => t + ch.charCodeAt(0), 0);
  const linea = (n && LINEAS.find((l) => l.nombre === `Línea ${n}`)) || LINEAS[(h + (i % 2)) % LINEAS.length];
  return { lineaId: linea.id, fecha: "2025-01-07T06:00:00.000Z" };
}

export function useAsignacionLinea() {
  const [guardado, setGuardado] = useState<Historial>({});
  useEffect(() => {
    try { setGuardado(JSON.parse(localStorage.getItem(CLAVE) ?? "{}")); } catch { /* sin almacenamiento */ }
  }, []);

  /** Historial de una unidad (con la asignación inicial ficticia si no tiene otra). */
  const historial = useCallback((clave: string, flotaNombre: string, i: number): Asignacion[] =>
    guardado[clave] ?? [inicial(flotaNombre, i)], [guardado]);

  const asignar = useCallback((unidades: { clave: string; previo: Asignacion[] }[], lineaId: string, fecha: string) => {
    setGuardado((g) => {
      const r = { ...g };
      unidades.forEach(({ clave, previo }) => { r[clave] = [...previo, { lineaId, fecha }]; });
      try { localStorage.setItem(CLAVE, JSON.stringify(r)); } catch { /* sin almacenamiento: solo en esta vista */ }
      return r;
    });
  }, []);

  const restablecer = useCallback(() => {
    setGuardado({});
    try { localStorage.removeItem(CLAVE); } catch { /* nada */ }
  }, []);

  return { historial, asignar, restablecer };
}

export const nombreLinea = (id: string) => LINEAS.find((l) => l.id === id)?.nombre ?? "—";
export const fechaHora = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
