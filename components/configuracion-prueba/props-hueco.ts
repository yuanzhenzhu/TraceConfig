// (Prueba, 18-11-2026) Propiedades de hueco: se separan la definición (qué propiedades tiene cada hueco, por
// estructura) y los valores (por flota y estructura, es decir, por configuración).

import { recorrer, type Configuracion, type Estructura, type PropsHueco } from "@/lib/model";

/** Huecos de la estructura que tienen alguna propiedad definida. */
export function huecosConPropiedades(est: Estructura) {
  let n = 0;
  recorrer(est.raiz, (h) => { if (Object.keys(est.propsHueco?.[h.id] ?? {}).length) n++; });
  return n;
}

/** Valores (hueco y propiedad) que define la estructura y cuántos tienen valor en la configuración. */
export function valoresRellenos(est: Estructura, valores: PropsHueco | undefined) {
  let total = 0, rellenos = 0;
  recorrer(est.raiz, (h) => {
    Object.keys(est.propsHueco?.[h.id] ?? {}).forEach((p) => {
      total++;
      if ((valores?.[h.id]?.[p] ?? "").trim()) rellenos++;
    });
  });
  return { total, rellenos };
}

export const configsCon = (configs: Configuracion[], estId: string) => configs.filter((c) => c.guardada && c.estructuraId === estId);
