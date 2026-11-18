"use client";

// (Prueba, 18-11-2026) Recepción en unidad: huecos de configuraciones ya terminadas (Activas) que aún no tienen datos.
// Dos orígenes:
// - Estructura modificada: se añadió una categoría nueva en los extremos de la estructura después del alta.
// - Unidad nueva: se añadieron unidades a la configuración después del alta.
// Cada hueco necesita al menos nº de serie y km, y los valores de sus propiedades de categoría o de hueco si las tiene.
// Los huecos pendientes son FICTICIOS (ejemplo sobre las configuraciones Activas) y lo recibido se guarda en el navegador.

import { useCallback, useEffect, useState } from "react";
import { unidadesDe } from "@/lib/activos";
import { recorrer, rutaDe, type Configuracion, type Estructura, type Nodo, type PropsCategoria } from "@/lib/model";

export type Origen = "estructura" | "unidad";
export type HuecoPendiente = {
  id: string; configId: string; flotaId: string; unidad: string; hueco: string; categoria: string; origen: Origen;
  propsCategoria: string[]; propsHueco: string[];
};
export type Recibido = { serie: string; km: string; props: Record<string, string>; fecha: string };

const SEP = " › ";
const CLAVE = "lm-prueba-recepcion-unidad";

/** Huecos pendientes de ejemplo: una categoría nueva en los extremos de la primera configuración Activa y dos unidades nuevas en la segunda. */
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

  // 2. Unidad nueva: dos unidades añadidas a la segunda configuración Activa, con todos sus huecos
  const b = activas[1];
  if (b) {
    const est = estructuras.find((e) => e.id === b.c.estructuraId)!;
    const ultima = Math.max(...b.series.map(Number));
    [ultima + 1, ultima + 2].map((n) => String(n).padStart(4, "0")).forEach((u) => {
      recorrer(est.raiz, (n, nivel) => {
        if (nivel === 1) return; // la unidad se da de alta con su nº de serie al añadirla
        out.push({
          id: `rec-${b.c.id}-${u}-${n.id}`, configId: b.c.id, flotaId: b.c.flotaId, unidad: u, hueco: rutaDe(est.raiz, n.id).join(SEP),
          categoria: n.categoria, origen: "unidad", propsCategoria: pc(n.categoria), propsHueco: Object.keys(est.propsHueco?.[n.id] ?? {}),
        });
      });
    });
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

export const ORIGEN: Record<Origen, string> = { estructura: "Estructura modificada", unidad: "Unidad nueva" };
