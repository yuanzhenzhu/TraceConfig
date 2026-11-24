// (Prueba, 24-11-2026) Todas las plantillas son obligatorias, tanto en el alta como al añadir unidades
// a una configuración en uso: no se puede finalizar ni añadir unidades hasta que estén todas cargadas.
// Se pueden cargar de dos formas: una plantilla por categoría (con todas las unidades) o una por unidad
// (un Excel con una pestaña por categoría). Está completo si todas las categorías están cargadas o si
// todas las unidades (al añadir, solo las nuevas) lo están.

import { categoriasDe, type Configuracion, type EstadoPlantilla, type Nodo } from "@/lib/model";

/** Unidades que cubre la carga por unidad: al añadir, solo las nuevas (de desde + 1 al total). */
export function unidadesACargar(c: Configuracion, desde = 0): string[] {
  return Array.from({ length: Math.max(0, (c.unidades ?? 0) - desde) }, (_, i) => String(desde + i + 1));
}

export function todasCargadas(c: Configuracion, raiz: Nodo | undefined, desde = 0): boolean {
  if (!raiz) return false;
  if (categoriasDe(raiz).every((x) => c.plantillas[x.categoria] === "cargada")) return true;
  const us = unidadesACargar(c, desde);
  return us.length > 0 && us.every((u) => c.plantillasUnidad?.[u] === "cargada");
}

/** Al terminar por unidad, todas las categorías quedan cargadas (así las unidades pasan a los demás módulos). */
export function plantillasCompletas(raiz: Nodo): Record<string, EstadoPlantilla> {
  return Object.fromEntries(categoriasDe(raiz).map((x) => [x.categoria, "cargada" as EstadoPlantilla]));
}
