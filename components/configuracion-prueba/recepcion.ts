"use client";

// (Prueba, 18-11-2026) Recepción en unidad: huecos de configuraciones ya terminadas (Activas) que aún no tienen datos.
// Dos orígenes:
// - Estructura modificada: se añadió una categoría nueva en los extremos de la estructura después del alta.
// - Montaje o desmontaje: un desmontaje de unidad dejó vacío un hueco (y los de sus hijos) que hay que volver a rellenar.
// (24-11-2026) No hay caso de alta de unidad: al añadir unidades todas las plantillas son obligatorias, así que no dejan huecos pendientes.
// Cada hueco necesita al menos nº de serie y km, y los valores de sus propiedades de categoría o de hueco si las tiene.
// Los huecos pendientes son FICTICIOS (ejemplo sobre las configuraciones Activas) y lo recibido se guarda en el navegador.

import { useCallback, useEffect, useState } from "react";
import { unidadesDe } from "@/lib/activos";
import { recorrer, rutaDe, type Configuracion, type Estructura, type Nodo, type PropsCategoria } from "@/lib/model";

export type Origen = "estructura" | "movimiento";
export type HuecoPendiente = {
  id: string; configId: string; flotaId: string; unidad: string; hueco: string; categoria: string; origen: Origen;
  propsCategoria: string[]; propsHueco: string[];
};
export type Recibido = { serie: string; km: string; props: Record<string, string>; fecha: string };

const SEP = " › ";
const CLAVE = "lm-prueba-recepcion-unidad";

/** Huecos pendientes de ejemplo: una categoría nueva en los extremos de la primera configuración en uso y huecos vaciados por desmontajes en la segunda. */
export function huecosPendientes(configs: Configuracion[], estructuras: Estructura[], propsCategoria: PropsCategoria): HuecoPendiente[] {
  const activas = unidadesDe(configs, estructuras).filter(({ c }) => c.estado === "activa");
  const out: HuecoPendiente[] = [];
  const pc = (cat: string) => (propsCategoria[cat] ?? []).map((p) => p.propId);

  // 1. Estructura modificada: «Sensor» nuevo debajo de los dos primeros extremos (huecos sin hijos) de cada unidad
  const a = activas[0];
  if (a) {
    const raiz = estructuras.find((e) => e.id === a.c.estructuraId)!.raiz;
    const extremos: Nodo[] = [];
    recorrer(raiz, (n) => { if (!n.hijos.length && extremos.length < 2) extremos.push(n); });
    a.series.forEach((u) => extremos.forEach((n, i) => {
      const hueco = [...rutaDe(raiz, n.id), `Sensor ${i + 1}`].join(SEP);
      out.push({ id: `rec-${a.c.id}-${u}-${n.id}-s`, configId: a.c.id, flotaId: a.c.flotaId, unidad: u, hueco, categoria: "Sensor", origen: "estructura", propsCategoria: pc("Sensor"), propsHueco: [] });
    }));
  }

  // 2. Montaje o desmontaje: en la segunda configuración en uso, un desmontaje de unidad dejó vacío un hueco con hijos
  //    (por ejemplo un bogie con sus ejes y ruedas) en la primera y la tercera unidad, y un hueco extremo en la segunda.
  const b = activas[1];
  if (b) {
    const est = estructuras.find((e) => e.id === b.c.estructuraId)!;
    let conHijos: Nodo | undefined; let extremo: Nodo | undefined;
    recorrer(est.raiz, (n, nivel) => {
      if (nivel >= 3 && n.hijos.length && !conHijos) conHijos = n;
      if (nivel >= 3 && !n.hijos.length && !extremo) extremo = n;
    });
    const vaciar = (u: string, desde: Nodo) => recorrer(desde, (n) => out.push({
      id: `rec-${b.c.id}-${u}-${n.id}-m`, configId: b.c.id, flotaId: b.c.flotaId, unidad: u, hueco: rutaDe(est.raiz, n.id).join(SEP),
      categoria: n.categoria, origen: "movimiento", propsCategoria: pc(n.categoria), propsHueco: Object.keys(est.propsHueco?.[n.id] ?? {}),
    }));
    const [u1, u2, u3] = b.series;
    if (conHijos) { if (u1) vaciar(u1, conHijos); if (u3) vaciar(u3, conHijos); }
    if (extremo && u2) vaciar(u2, extremo);
  }
  return out;
}

export function useRecepcion() {
  const [recibidos, setRecibidos] = useState<Record<string, Recibido>>({});
  useEffect(() => { try { setRecibidos(JSON.parse(localStorage.getItem(CLAVE) ?? "{}")); } catch { /* sin almacenamiento */ } }, []);
  const recibir = useCallback((nuevos: Record<string, Recibido>) => {
    setRecibidos((r) => {
      const x = { ...r, ...nuevos };
      try { localStorage.setItem(CLAVE, JSON.stringify(x)); } catch { /* solo en esta vista */ }
      return x;
    });
  }, []);
  const restablecer = useCallback(() => { setRecibidos({}); try { localStorage.removeItem(CLAVE); } catch { /* nada */ } }, []);
  return { recibidos, recibir, restablecer };
}

export const ORIGEN: Record<Origen, string> = { estructura: "Estructura modificada", movimiento: "Montaje o desmontaje" };
