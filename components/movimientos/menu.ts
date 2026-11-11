// Menú lateral de Movimientos: sin iconos y sin títulos de grupo; los grupos (por acción) se separan con una línea
// y cada entrada lleva su nombre completo (ver documentos/movimientos/flujos/movimientos.md).
// Montaje y Desmontaje son una entrada cada uno: dentro de la pantalla se elige si es en una unidad o en un almacén.

export type Item = { href: string; label: string };
export const GRUPOS: { items: Item[] }[] = [
  { items: [{ href: "/movimientos", label: "Historial de movimientos" }] },
  {
    items: [
      { href: "/movimientos/intercambio-unidad-almacen", label: "Intercambio entre unidad y almacén" },
      { href: "/movimientos/intercambio-entre-unidades", label: "Intercambio entre unidades" },
      { href: "/movimientos/intercambio-dentro-unidad", label: "Intercambio dentro de la unidad" },
      { href: "/movimientos/rotacion-bogies", label: "Rotación de bogies" },
    ],
  },
  {
    items: [
      { href: "/movimientos/montaje", label: "Montaje" },
      { href: "/movimientos/desmontaje", label: "Desmontaje" },
      { href: "/movimientos/envio-almacenes", label: "Envío entre almacenes" },
    ],
  },
  { items: [{ href: "/movimientos/fin-de-vida", label: "Fin de vida" }] },
];
export const ITEMS_MOVIMIENTOS = GRUPOS.flatMap((g) => g.items);
