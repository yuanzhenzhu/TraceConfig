"use client";

// Paso 4 (Propiedades de categoría). El cálculo de media está en Configuración › Drivers (components/media.tsx).
// - Propiedades de categoría: únicas para todo el cliente; se editan aquí o en su apartado.
// - Propiedades de hueco: de cada estructura; se editan en el paso 1, junto a la estructura.

import Link from "next/link";
import { Banner } from "./ds";
import { EditorPropsCategoria } from "./propiedades";
import { useStore } from "@/lib/store";
import type { PasoProps } from "./pasos-1-3";

/* ---------- Paso 4 ---------- */
/** Propiedades de categoría: un único juego para todo el cliente. Se editan aquí (las categorías de esta estructura) y en su apartado. */
export function Paso4({ est, soloLectura }: PasoProps) {
  const store = useStore();
  const flotas = new Set(store.configs.filter((x) => x.guardada).map((x) => x.flotaId)).size;
  return (
    <section className="lm-surface lm-surface--p24 stack gap-20">
      <h2 className="lm-title-medium" style={{ margin: 0 }}>Propiedades de categoría</h2>
      {!soloLectura && <Banner type="attention" title="Son comunes a todo el cliente">
        Lo que cambies aquí se aplica a todas las flotas ({flotas}). Aquí solo ves las categorías de {est!.nombre}; todas las categorías están en <Link href="/configuracion/propiedades-categoria">Configuración › Propiedades de categoría</Link>.
      </Banner>}
      <EditorPropsCategoria soloLectura={soloLectura} raiz={est!.raiz} valor={store.propsCategoria} onChange={(v) => store.guardarPropsCategoria(v)} />
    </section>
  );
}
