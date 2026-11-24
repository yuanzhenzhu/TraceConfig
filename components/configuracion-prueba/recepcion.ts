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
import { contarHuecos, recorrer, rutaDe, type Configuracion, type Estructura, type Nodo, type PropsCategoria } from "@/lib/model";

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

// (Prueba, 24-11-2026) Vistas de Recepción en unidad: por unidad y por categoría, con el porcentaje de rellenado.

const huecosDeCategoria = (raiz: Nodo, categoria: string) => { let n = 0; recorrer(raiz, (x) => { if (x.categoria === categoria) n++; }); return n; };

export type FilaUnidad = { configId: string; flotaId: string; estructuraId: string; unidad: string; total: number; pendientes: HuecoPendiente[] };
export type FilaCategoria = { categoria: string; flotaId: string; total: number; pendientes: HuecoPendiente[] };

/** Unidades con algún hueco vacío (o ya recibido en esta prueba): total de huecos de la unidad y los que siguen vacíos. */
export function porUnidad(huecos: HuecoPendiente[], recibidos: Record<string, Recibido>, configs: Configuracion[], estructuras: Estructura[]): FilaUnidad[] {
  const m = new Map<string, FilaUnidad>();
  huecos.forEach((h) => {
    const k = `${h.configId}|${h.unidad}`;
    if (!m.has(k)) {
      const c = configs.find((x) => x.id === h.configId)!;
      const raiz = estructuras.find((e) => e.id === c.estructuraId)!.raiz;
      // Total = huecos de la estructura + los de categorías nuevas que aún no están en ella (Sensor)
      const nuevos = huecos.filter((x) => x.configId === h.configId && x.unidad === h.unidad && x.origen === "estructura").length;
      m.set(k, { configId: h.configId, flotaId: h.flotaId, estructuraId: c.estructuraId!, unidad: h.unidad, total: contarHuecos(raiz) + nuevos, pendientes: [] });
    }
    if (!recibidos[h.id]) m.get(k)!.pendientes.push(h);
  });
  return [...m.values()];
}

/** Categorías con algún hueco vacío, por flota: total de huecos de esa categoría en las unidades de la flota y los vacíos. */
export function porCategoria(huecos: HuecoPendiente[], recibidos: Record<string, Recibido>, configs: Configuracion[], estructuras: Estructura[]): FilaCategoria[] {
  const m = new Map<string, FilaCategoria>();
  huecos.forEach((h) => {
    const k = `${h.categoria}|${h.flotaId}`;
    if (!m.has(k)) {
      const deFlota = configs.filter((c) => c.flotaId === h.flotaId && c.estado === "activa");
      const enEstructura = deFlota.reduce((s, c) => s + huecosDeCategoria(estructuras.find((e) => e.id === c.estructuraId)!.raiz, h.categoria) * (c.unidades ?? 0), 0);
      const nuevos = huecos.filter((x) => x.flotaId === h.flotaId && x.categoria === h.categoria && x.origen === "estructura").length;
      m.set(k, { categoria: h.categoria, flotaId: h.flotaId, total: enEstructura + nuevos, pendientes: [] });
    }
    if (!recibidos[h.id]) m.get(k)!.pendientes.push(h);
  });
  return [...m.values()];
}

export const porcentaje = (total: number, vacios: number) => (total ? Math.floor(((total - vacios) / total) * 100) : 100);

/** Simula la carga de una plantilla: todos los huecos indicados quedan recibidos. */
export function recibirTodos(hs: HuecoPendiente[]): Record<string, Recibido> {
  const ahora = new Date().toISOString();
  return Object.fromEntries(hs.map((h, i) => [h.id, { serie: `${h.categoria.slice(0, 2).toUpperCase()}-${h.unidad}-${String(900 + i)}`, km: String(120000 + i * 350), props: {}, fecha: ahora }]));
}
