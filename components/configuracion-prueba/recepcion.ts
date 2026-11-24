"use client";

// (Prueba, 18-11-2026) Recepción en unidad: huecos de configuraciones ya terminadas (Activas) que aún no tienen datos.
// (24-11-2026) Solo hay un origen: la estructura se modificó después del alta (se añadió una categoría nueva en sus extremos).
// - No hay caso de alta de unidad: al añadir unidades todas las plantillas son obligatorias, así que no dejan huecos pendientes.
// - Los huecos que deja vacíos un montaje o desmontaje de unidad no aparecen aquí.
// Cada hueco necesita al menos nº de serie y km, y los valores de sus propiedades de categoría o de hueco si las tiene.
// Los huecos pendientes son FICTICIOS (ejemplo sobre las configuraciones Activas) y lo recibido se guarda en el navegador.

import { useCallback, useEffect, useState } from "react";
import { unidadesDe } from "@/lib/activos";
import { contarHuecos, recorrer, rutaDe, type Configuracion, type Estructura, type Nodo, type PropsCategoria } from "@/lib/model";

export type HuecoPendiente = {
  id: string; configId: string; flotaId: string; unidad: string; hueco: string; categoria: string;
  propsCategoria: string[]; propsHueco: string[];
};
export type Recibido = { serie: string; km: string; props: Record<string, string>; fecha: string };

const SEP = " › ";
const CLAVE = "lm-prueba-recepcion-unidad";

/** Huecos pendientes de ejemplo, todos por estructura modificada: «Sensor» nuevo en la primera configuración en uso y «Cámara» en la segunda. */
export function huecosPendientes(configs: Configuracion[], estructuras: Estructura[], propsCategoria: PropsCategoria): HuecoPendiente[] {
  const activas = unidadesDe(configs, estructuras).filter(({ c }) => c.estado === "activa");
  const out: HuecoPendiente[] = [];
  const pc = (cat: string) => (propsCategoria[cat] ?? []).map((p) => p.propId);

  // Categoría nueva debajo de los primeros extremos (huecos sin hijos) de la estructura, en cada unidad de la configuración
  const nueva = (x: (typeof activas)[number] | undefined, categoria: string, cuantos: number) => {
    if (!x) return;
    const raiz = estructuras.find((e) => e.id === x.c.estructuraId)!.raiz;
    const extremos: Nodo[] = [];
    recorrer(raiz, (n) => { if (!n.hijos.length && extremos.length < cuantos) extremos.push(n); });
    x.series.forEach((u) => extremos.forEach((n, i) => {
      const hueco = [...rutaDe(raiz, n.id), `${categoria} ${i + 1}`].join(SEP);
      out.push({ id: `rec-${x.c.id}-${u}-${n.id}-${categoria}`, configId: x.c.id, flotaId: x.c.flotaId, unidad: u, hueco, categoria, propsCategoria: pc(categoria), propsHueco: [] });
    }));
  };
  nueva(activas[0], "Sensor", 2);
  nueva(activas[1], "Cámara", 1);
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
      // Total = huecos de la estructura + los de categorías nuevas que aún no están en ella
      const nuevos = huecos.filter((x) => x.configId === h.configId && x.unidad === h.unidad).length;
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
      const nuevos = huecos.filter((x) => x.flotaId === h.flotaId && x.categoria === h.categoria).length;
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
