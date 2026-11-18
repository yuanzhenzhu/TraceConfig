// (Prueba) Una configuración ya no tiene nombre ni descripción propios: es una flota con una estructura.
// Se nombra por las dos: «Metro Línea 1 · Estructura 2». La estructura sí mantiene su nombre y descripción.

import type { Configuracion } from "@/lib/model";
import type { useStore } from "@/lib/store";

type Store = ReturnType<typeof useStore>;

/** Nombre de la estructura de la configuración, o «Sin estructura» si aún no se ha elegido. */
export const nombreEstructura = (store: Store, c: Configuracion) => store.estructura(c.estructuraId)?.nombre ?? "Sin estructura";

/** «Flota · Estructura»: cómo se nombra una configuración en textos, menús y avisos. */
export const etiquetaCfg = (store: Store, c: Configuracion) =>
  `${store.flotas.find((f) => f.id === c.flotaId)?.nombre ?? ""} · ${nombreEstructura(store, c)}`;
