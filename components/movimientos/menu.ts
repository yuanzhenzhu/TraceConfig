// Menú lateral de Movimientos, agrupado por acción y sin iconos (ver documentos/movimientos/flujos/movimientos.md).
// Montaje y Desmontaje son una entrada cada uno: dentro de la pantalla se elige si es en una unidad o en un almacén.

export type Item = { href: string; label: string };
export const GRUPOS: { titulo?: string; items: Item[] }[] = [
  { items: [{ href: "/movimientos", label: "Historial de movimientos" }] },
  {
    titulo: "Intercambios", items: [
      { href: "/movimientos/intercambio-unidad-almacen", label: "Entre unidad y almacén" },
      { href: "/movimientos/intercambio-entre-unidades", label: "Entre unidades" },
      { href: "/movimientos/intercambio-dentro-unidad", label: "Dentro de la unidad" },
      { href: "/movimientos/rotacion-bogies", label: "Rotación de bogies" },
    ],
  },
  {
    titulo: "Montajes y desmontajes", items: [
      { href: "/movimientos/montaje", label: "Montaje" },
      { href: "/movimientos/desmontaje", label: "Desmontaje" },
    ],
  },
  { titulo: "Envíos", items: [{ href: "/movimientos/envio-almacenes", label: "Envío entre almacenes" }] },
  { titulo: "", items: [{ href: "/movimientos/fin-de-vida", label: "Fin de vida" }] },
];
export const ITEMS_MOVIMIENTOS = GRUPOS.flatMap((g) => g.items.map((i) => ({ ...i, grupo: g.titulo ?? "" })));
