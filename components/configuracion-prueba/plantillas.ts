// (Prueba, 24-11-2026) Todas las plantillas son obligatorias, tanto en el alta como al añadir unidades
// a una configuración en uso: no se puede finalizar ni añadir unidades hasta que estén todas cargadas.

import { categoriasDe, type Configuracion, type Nodo } from "@/lib/model";

export function todasCargadas(c: Configuracion, raiz: Nodo | undefined): boolean {
  return !!raiz && categoriasDe(raiz).every((x) => c.plantillas[x.categoria] === "cargada");
}
