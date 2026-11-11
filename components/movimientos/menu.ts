// Menú lateral de Movimientos, agrupado por acción (ver documentos/movimientos/flujos/movimientos.md).

export type Item = { href: string; label: string; icon: string };
export const GRUPOS: { titulo?: string; items: Item[] }[] = [
  { items: [{ href: "/movimientos", label: "Historial de movimientos", icon: "list" }] },
  {
    titulo: "Intercambios", items: [
      { href: "/movimientos/intercambio-unidad-almacen", label: "Entre unidad y almacén", icon: "swap_vert" },
      { href: "/movimientos/intercambio-entre-unidades", label: "Entre unidades", icon: "swap_vert" },
      { href: "/movimientos/intercambio-dentro-unidad", label: "Dentro de la unidad", icon: "swap_vert" },
      { href: "/movimientos/rotacion-bogies", label: "Rotación de bogies", icon: "sync" },
    ],
  },
  {
    titulo: "Montajes y desmontajes", items: [
      { href: "/movimientos/montaje-unidad", label: "Montaje en unidad", icon: "add" },
      { href: "/movimientos/desmontaje-unidad", label: "Desmontaje de unidad", icon: "remove" },
      { href: "/movimientos/montaje-almacen", label: "Montaje en almacén", icon: "add" },
      { href: "/movimientos/desmontaje-almacen", label: "Desmontaje en almacén", icon: "remove" },
    ],
  },
  { titulo: "Envíos", items: [{ href: "/movimientos/envio-almacenes", label: "Envío entre almacenes", icon: "north_east" }] },
  { titulo: "", items: [{ href: "/movimientos/fin-de-vida", label: "Fin de vida", icon: "block" }] },
];
export const ITEMS_MOVIMIENTOS = GRUPOS.flatMap((g) => g.items.map((i) => ({ ...i, grupo: g.titulo ?? "" })));

