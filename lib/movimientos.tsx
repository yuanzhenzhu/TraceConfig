"use client";

// Movimientos: dónde está cada activo y el historial de movimientos (ver documentos/movimientos/historias/HU-M00).
// Punto de partida: los activos de lib/activos.ts (Excel común + generados) y la hoja Movimientos del Excel.
// Lo que se registra en el prototipo se guarda en el navegador (localStorage), como en Configuración.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DATOS, SEP, idAlmacen } from "./datos";
import { generarActivos, unidadesDe } from "./activos";
import { recorrer, type Nodo } from "./model";
import { useStore } from "./store";

/* ---------- Tipos ---------- */
/** Dónde está un activo: en un hueco de una unidad, en un almacén (suelto o montado en otro activo) o de baja. */
export type Lugar =
  | { tipo: "unidad"; unidad: string; hueco: string }
  | { tipo: "almacen"; almacenId: string; padre?: string; enHueco?: string }
  | { tipo: "baja" };

export type ActivoM = {
  serie: string; categoria: string; lugar: Lugar;
  km?: number | null; horas?: number | null; ciclos?: number | null; gmao?: string; tag?: string;
};

/** Una fila del movimiento: un activo con su antes y su después. */
export type FilaMov = { serie: string; categoria: string; antes: Lugar; despues: Lugar; conPadre?: boolean };

export type Registro = { unidad: string; km: number | null; horas?: number | null; ciclos?: number | null };

export type Movimiento = {
  id: string; // M-0142
  tipo: string;
  fecha: string; // aaaa-mm-ddThh:mm (para ordenar); se muestra como dd-mm-aaaa hh:mm
  registros: Registro[]; // km (y horas o ciclos) de cada unidad que interviene
  almacenes: string[]; // ids de almacén
  filas: FilaMov[];
  estado: "registrado" | "anulado";
  anulado?: { fecha: string; por: string };
  grupo?: string; // movimientos seguidos: mismo grupo
  motivo?: string; // fin de vida
  principal?: { serie: string; categoria: string }; // rotación: el bogie que gira (sus filas son solo los hijos)
  por: string;
};

/** Km de cada unidad a lo largo del tiempo (alta y movimientos). */
export type PuntoKm = { fecha: string; km: number; mov?: string };

type Estado = { activos: Record<string, ActivoM>; movimientos: Movimiento[]; km: Record<string, PuntoKm[]> };

export const USUARIO = "JM"; // usuario del prototipo
export const TIPOS = {
  intercambioUA: "Intercambio entre unidad y almacén",
  intercambioUU: "Intercambio entre unidades",
  intercambioMU: "Intercambio dentro de la unidad",
  rotacionBogie: "Rotación de bogies",
  montajeUnidad: "Montaje en unidad",
  montajeAlmacen: "Montaje en almacén",
  desmontajeUnidad: "Desmontaje de unidad",
  desmontajeAlmacen: "Desmontaje en almacén",
  envio: "Envío entre almacenes",
  finVida: "Fin de vida",
} as const;

/** Id de un grupo de movimientos seguidos (montaje de varios hijos en una sola acción). */
export const nuevoGrupo = () => `G-${Date.now().toString(36)}`;

/* ---------- Fechas ---------- */
const p2 = (n: number) => String(n).padStart(2, "0");
/** "20-08-2026 12:09" o "20-08-2026" -> "2026-08-20T12:09". */
export const isoDe = (t: string) => {
  const m = t.match(/^(\d{2})-(\d{2})-(\d{4})(?: (\d{2}):(\d{2}))?$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}T${m[4] ?? "00"}:${m[5] ?? "00"}` : t;
};
/** "2026-08-20T12:09" -> "20-08-2026 12:09". */
export const textoFecha = (iso: string) => `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)} ${iso.slice(11, 16)}`;
export const ahoraIso = () => { const d = new Date(); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}`; };
export const formatoKm = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toLocaleString("es-ES"));

/* ---------- Árbol de posiciones ---------- */
const nombreFinal = (ruta: string) => ruta.split(SEP).pop() ?? ruta;
const padreRuta = (ruta: string) => ruta.split(SEP).slice(0, -1).join(SEP);
const numero = (nombre: string) => Number(nombre.match(/(\d+)$/)?.[1] ?? 0);

/** Hijos directos de un activo (en su unidad o en su almacén). */
export function hijosDirectos(activos: Record<string, ActivoM>, a: ActivoM): ActivoM[] {
  const l = a.lugar;
  if (l.tipo === "unidad") {
    return Object.values(activos).filter((x) => x.lugar.tipo === "unidad" && x.lugar.unidad === l.unidad && padreRuta(x.lugar.hueco) === l.hueco);
  }
  if (l.tipo === "almacen") return Object.values(activos).filter((x) => x.lugar.tipo === "almacen" && x.lugar.padre === a.serie);
  return [];
}
/** Todos los descendientes de un activo, con su ruta relativa al activo ("Eje 1 › Rueda 2"). */
export function descendientes(activos: Record<string, ActivoM>, a: ActivoM): { a: ActivoM; rel: string }[] {
  const out: { a: ActivoM; rel: string }[] = [];
  const ir = (x: ActivoM, base: string) => hijosDirectos(activos, x)
    .sort((m, n) => relDe(m).localeCompare(relDe(n), "es", { numeric: true }))
    .forEach((h) => { const rel = base ? `${base}${SEP}${relDe(h)}` : relDe(h); out.push({ a: h, rel }); ir(h, rel); });
  const relDe = (h: ActivoM) => (h.lugar.tipo === "unidad" ? nombreFinal(h.lugar.hueco) : h.lugar.tipo === "almacen" ? h.lugar.enHueco ?? h.categoria : h.categoria);
  ir(a, "");
  return out;
}

/** Rotar 180°: en cada nivel se invierte el orden de los hijos de la misma categoría (1 ⇄ n). Devuelve rel antigua -> rel nueva. */
export function espejo(rels: { rel: string; categoria: string }[]): Record<string, string> {
  const porPadre = new Map<string, { nombre: string; categoria: string }[]>();
  rels.forEach(({ rel, categoria }) => {
    const p = padreRuta(rel);
    porPadre.set(p, [...(porPadre.get(p) ?? []), { nombre: nombreFinal(rel), categoria }]);
  });
  const cambioNombre = new Map<string, string>(); // "padre|nombre" -> nombre nuevo
  porPadre.forEach((hijos, p) => {
    const porCat = new Map<string, string[]>();
    hijos.forEach((h) => porCat.set(h.categoria, [...(porCat.get(h.categoria) ?? []), h.nombre]));
    porCat.forEach((nombres) => {
      const orden = [...nombres].sort((x, y) => numero(x) - numero(y));
      orden.forEach((n, i) => cambioNombre.set(`${p}|${n}`, orden[orden.length - 1 - i]));
    });
  });
  const out: Record<string, string> = {};
  rels.forEach(({ rel }) => {
    const partes = rel.split(SEP);
    out[rel] = partes.map((n, i) => cambioNombre.get(`${partes.slice(0, i).join(SEP)}|${n}`) ?? n).join(SEP);
  });
  return out;
}

/* ---------- Plan del intercambio entre unidad y almacén (HU-M03) ---------- */
export type PlanIntercambio = { filas: FilaMov[]; error?: string };

/**
 * Plan del intercambio. quedan: activos montados en el que sale que se QUEDAN en la unidad (el resto viaja con él).
 * Lo que se queda sigue en sus huecos y pasa a estar montado en el que entra; por eso el que entra no puede traer
 * activos en esas mismas posiciones.
 */
export function planIntercambioUA(activos: Record<string, ActivoM>, serieUnidad: string, serieAlmacen: string, quedan: Set<string>, rotar: boolean): PlanIntercambio {
  const A = activos[serieUnidad], B = activos[serieAlmacen];
  if (!A || !B || A.lugar.tipo !== "unidad" || B.lugar.tipo !== "almacen") return { filas: [] };
  if (A.categoria !== B.categoria) return { filas: [], error: `Categorías diferentes: no se puede intercambiar un ${A.categoria} con un ${B.categoria}` };
  const dA = descendientes(activos, A), dB = descendientes(activos, B);
  const nuevo: Record<string, Lugar> = {};
  const lA = A.lugar, lB = B.lugar;

  // Rotación del activo del almacén: sus hijos cambian de posición (ruta relativa)
  const relB: Record<string, string> = Object.fromEntries(dB.map((d) => [d.a.serie, d.rel]));
  if (rotar) {
    const m = espejo(dB.map((d) => ({ rel: d.rel, categoria: d.a.categoria })));
    dB.forEach((d) => { relB[d.a.serie] = m[d.rel]; });
  }
  // Lo que se queda ocupa sus posiciones: el que entra no puede traer activos en ellas
  const posQuedan = new Set(dA.filter((d) => quedan.has(d.a.serie)).map((d) => d.rel));
  const choque = dB.find((d) => posQuedan.has(relB[d.a.serie]));
  if (choque) return { filas: [], error: `El ${B.categoria.replace(/^./, (c) => c.toLowerCase())} ${B.serie} trae un activo en ${relB[choque.a.serie]}, que se queda ocupado en la unidad: elige otro o marca también ese activo` };
  // Lo que se queda necesita a su padre: si su padre sale, el que entra tiene que traer otro en esa posición
  const posEntran = new Set(dB.map((d) => relB[d.a.serie]));
  const huerfano = dA.find((d) => {
    if (!quedan.has(d.a.serie)) return false;
    const p = padreRuta(d.rel);
    return !!p && !posQuedan.has(p) && !posEntran.has(p);
  });
  if (huerfano) {
    const p = padreRuta(huerfano.rel);
    return { filas: [], error: `${huerfano.a.categoria} ${huerfano.a.serie} (${huerfano.rel}) se quedaría sin su padre: ${p} sale y el ${B.categoria.replace(/^./, (c) => c.toLowerCase())} ${B.serie} no trae otro en esa posición. Marca también lo que cuelga de ${p} o desmarca ${p}` };
  }

  // A y los que viajan pasan al sitio de B en el almacén; B y sus hijos, al hueco de A.
  nuevo[A.serie] = { ...lB };
  dA.filter((d) => !quedan.has(d.a.serie)).forEach((d) => {
    const padreHueco = padreRuta(d.a.lugar.tipo === "unidad" ? d.a.lugar.hueco : "");
    const padre = Object.values(activos).find((x) => x.lugar.tipo === "unidad" && x.lugar.unidad === lA.unidad && x.lugar.hueco === padreHueco);
    nuevo[d.a.serie] = { tipo: "almacen", almacenId: lB.almacenId, padre: padre?.serie ?? A.serie, enHueco: nombreFinal(d.rel) };
  });
  nuevo[B.serie] = { ...lA };
  dB.forEach((d) => { nuevo[d.a.serie] = { tipo: "unidad", unidad: lA.unidad, hueco: `${lA.hueco}${SEP}${relB[d.a.serie]}` }; });
  const filas: FilaMov[] = [];
  const add = (a: ActivoM, conPadre: boolean) => {
    const despues = nuevo[a.serie];
    if (despues && JSON.stringify(despues) !== JSON.stringify(a.lugar)) filas.push({ serie: a.serie, categoria: a.categoria, antes: a.lugar, despues, conPadre });
  };
  add(A, false); dA.forEach((d) => add(d.a, true)); add(B, false); dB.forEach((d) => add(d.a, true));
  return { filas };
}

/* ---------- Plan del intercambio entre dos posiciones de unidad (HU-M04 y HU-M05) ---------- */
/** Un lado del intercambio: el activo marcado, los activos montados que se quedan y si se rota (180°). */
export type Lado = { serie: string; quedan: Set<string>; rotar: boolean };

export function planIntercambioUU(activos: Record<string, ActivoM>, l1: Lado, l2: Lado): PlanIntercambio {
  const A = activos[l1.serie], B = activos[l2.serie];
  if (!A || !B || A.lugar.tipo !== "unidad" || B.lugar.tipo !== "unidad") return { filas: [] };
  if (A.serie === B.serie) return { filas: [], error: "Elige dos activos distintos" };
  if (A.categoria !== B.categoria) return { filas: [], error: `Categorías diferentes: no se puede intercambiar un ${A.categoria} con un ${B.categoria}` };
  const hA = A.lugar.hueco, hB = B.lugar.hueco, uA = A.lugar.unidad, uB = B.lugar.unidad;
  if (uA === uB && (hA.startsWith(hB + SEP) || hB.startsWith(hA + SEP))) return { filas: [], error: "No se puede intercambiar un activo con otro que lleva montado o en el que está montado" };

  // Para cada lado: posiciones que viajan (con la rotación aplicada) y posiciones que se quedan
  const datos = (x: ActivoM, l: Lado) => {
    const d = descendientes(activos, x);
    const viajan = d.filter((e) => !l.quedan.has(e.a.serie));
    const nueva: Record<string, string> = Object.fromEntries(viajan.map((e) => [e.a.serie, e.rel]));
    if (l.rotar) { const m = espejo(viajan.map((e) => ({ rel: e.rel, categoria: e.a.categoria }))); viajan.forEach((e) => { nueva[e.a.serie] = m[e.rel]; }); }
    return { d, viajan, nueva, posQuedan: new Set(d.filter((e) => l.quedan.has(e.a.serie)).map((e) => e.rel)), posLlegan: new Set(viajan.map((e) => nueva[e.a.serie])) };
  };
  const dA = datos(A, l1), dB = datos(B, l2);
  // Lo que llega a una posición no puede chocar con lo que se queda allí, ni dejar a nadie sin su padre
  const comprobar = (llega: typeof dA, destino: typeof dA, quien: ActivoM, donde: ActivoM) => {
    const choque = llega.viajan.find((e) => destino.posQuedan.has(llega.nueva[e.a.serie]));
    if (choque) return `El ${quien.categoria.replace(/^./, (c) => c.toLowerCase())} ${quien.serie} trae un activo en ${llega.nueva[choque.a.serie]}, que se queda ocupado junto al ${donde.categoria.replace(/^./, (c) => c.toLowerCase())} ${donde.serie}`;
    const huerf = destino.d.find((e) => destino.posQuedan.has(e.rel) && padreRuta(e.rel) && !destino.posQuedan.has(padreRuta(e.rel)) && !llega.posLlegan.has(padreRuta(e.rel)));
    if (huerf) return `${huerf.a.categoria} ${huerf.a.serie} (${huerf.rel}) se quedaría sin su padre: ${padreRuta(huerf.rel)} sale y el ${quien.categoria.replace(/^./, (c) => c.toLowerCase())} ${quien.serie} no trae otro en esa posición`;
    return "";
  };
  const e1 = comprobar(dB, dA, B, A) || comprobar(dA, dB, A, B);
  if (e1) return { filas: [], error: e1 };

  const nuevo: Record<string, Lugar> = {};
  nuevo[A.serie] = { tipo: "unidad", unidad: uB, hueco: hB };
  dA.viajan.forEach((e) => { nuevo[e.a.serie] = { tipo: "unidad", unidad: uB, hueco: `${hB}${SEP}${dA.nueva[e.a.serie]}` }; });
  nuevo[B.serie] = { tipo: "unidad", unidad: uA, hueco: hA };
  dB.viajan.forEach((e) => { nuevo[e.a.serie] = { tipo: "unidad", unidad: uA, hueco: `${hA}${SEP}${dB.nueva[e.a.serie]}` }; });
  const filas: FilaMov[] = [];
  const add = (a: ActivoM, conPadre: boolean) => {
    const despues = nuevo[a.serie];
    if (despues && JSON.stringify(despues) !== JSON.stringify(a.lugar)) filas.push({ serie: a.serie, categoria: a.categoria, antes: a.lugar, despues, conPadre });
  };
  add(A, false); dA.viajan.forEach((e) => add(e.a, true)); add(B, false); dB.viajan.forEach((e) => add(e.a, true));
  return { filas };
}

/* ---------- Rotación de bogies (HU-M06) ---------- */
/** Giro de 180° de un bogie en su posición: no cambia de padre ningún activo, pero sí la posición de todos sus activos montados. */
export function planRotacion(activos: Record<string, ActivoM>, serie: string): PlanIntercambio {
  const B = activos[serie];
  if (!B || B.lugar.tipo !== "unidad") return { filas: [] };
  if (B.categoria !== "Bogie") return { filas: [], error: "Solo se pueden rotar bogies" };
  const d = descendientes(activos, B);
  if (d.length < 2) return { filas: [], error: `El bogie ${B.serie} no tiene activos montados que cambien de posición` };
  const m = espejo(d.map((e) => ({ rel: e.rel, categoria: e.a.categoria })));
  const { unidad, hueco } = B.lugar;
  const filas: FilaMov[] = d.filter((e) => m[e.rel] !== e.rel).map((e) => ({
    serie: e.a.serie, categoria: e.a.categoria, antes: e.a.lugar, despues: { tipo: "unidad", unidad, hueco: `${hueco}${SEP}${m[e.rel]}` }, conPadre: true,
  }));
  return filas.length ? { filas } : { filas: [], error: "Al rotar no cambia la posición de ningún activo" };
}

/* ---------- Montajes y desmontajes (HU-M07, HU-M08, HU-M10, HU-M11) ---------- */
const fila = (a: ActivoM, despues: Lugar, conPadre: boolean): FilaMov => ({ serie: a.serie, categoria: a.categoria, antes: a.lugar, despues, conPadre });

/** Montaje en unidad: un activo del almacén (con lo que lleva montado) entra en un hueco libre. huecos: rutas de la estructura de la unidad. */
export function planMontajeUnidad(activos: Record<string, ActivoM>, unidad: string, hueco: string, serie: string, huecos: Set<string>): PlanIntercambio {
  const B = activos[serie];
  if (!B || B.lugar.tipo !== "almacen") return { filas: [] };
  const d = descendientes(activos, B);
  const fuera = d.find((e) => !huecos.has(`${hueco}${SEP}${e.rel}`));
  if (fuera) return { filas: [], error: `El ${B.categoria.replace(/^./, (c) => c.toLowerCase())} ${B.serie} trae ${fuera.a.categoria.replace(/^./, (c) => c.toLowerCase())} ${fuera.a.serie} en ${fuera.rel}, una posición que no existe en la estructura de la unidad` };
  return { filas: [fila(B, { tipo: "unidad", unidad, hueco }, false), ...d.map((e) => fila(e.a, { tipo: "unidad", unidad, hueco: `${hueco}${SEP}${e.rel}` }, true))] };
}

/** Desmontaje de unidad: el activo sale con todo lo que lleva montado, a un almacén (suelto) o de baja. */
export function planDesmontajeUnidad(activos: Record<string, ActivoM>, serie: string, destino: { almacenId: string } | "baja", hijosDeBaja: boolean, almacenHijos: string): PlanIntercambio {
  const A = activos[serie];
  if (!A || A.lugar.tipo !== "unidad") return { filas: [] };
  const d = descendientes(activos, A);
  const { unidad } = A.lugar;
  const padreDe = (h: string) => Object.values(activos).find((x) => x.lugar.tipo === "unidad" && x.lugar.unidad === unidad && x.lugar.hueco === h)?.serie;
  if (destino === "baja") {
    if (!hijosDeBaja && d.length && !almacenHijos) return { filas: [], error: "Elige el almacén al que van sus activos montados, o dalos de baja también" };
    return { filas: [fila(A, { tipo: "baja" }, false), ...d.map((e) => fila(e.a, hijosDeBaja ? { tipo: "baja" }
      : e.rel.includes(SEP) ? { tipo: "almacen", almacenId: almacenHijos, padre: padreDe(padreRuta((e.a.lugar as { hueco: string }).hueco)), enHueco: nombreFinal(e.rel) }
        : { tipo: "almacen", almacenId: almacenHijos }, true))] };
  }
  return { filas: [fila(A, { tipo: "almacen", almacenId: destino.almacenId }, false), ...d.map((e) => fila(e.a, {
    tipo: "almacen", almacenId: destino.almacenId, padre: padreDe(padreRuta((e.a.lugar as { hueco: string }).hueco)) ?? A.serie, enHueco: nombreFinal(e.rel),
  }, true))] };
}

/** Montaje en almacén: un activo suelto se monta en una posición libre de otro activo del mismo almacén. */
export function planMontajeAlmacen(activos: Record<string, ActivoM>, padre: string, posicion: string, serie: string): PlanIntercambio {
  const P = activos[padre], H = activos[serie];
  if (!P || !H || P.lugar.tipo !== "almacen" || H.lugar.tipo !== "almacen") return { filas: [] };
  if (H.lugar.padre) return { filas: [], error: `El ${H.categoria.replace(/^./, (c) => c.toLowerCase())} ${H.serie} ya está montado en ${H.lugar.padre}` };
  return { filas: [fila(H, { tipo: "almacen", almacenId: P.lugar.almacenId, padre: P.serie, enHueco: posicion }, false)] };
}

/** Desmontaje en almacén: un activo montado en otro queda suelto en el mismo almacén (con lo que lleva montado). */
export function planDesmontajeAlmacen(activos: Record<string, ActivoM>, serie: string): PlanIntercambio {
  const A = activos[serie];
  if (!A || A.lugar.tipo !== "almacen" || !A.lugar.padre) return { filas: [] };
  return { filas: [fila(A, { tipo: "almacen", almacenId: A.lugar.almacenId }, false)] };
}

/** Posiciones que puede tener montadas un activo de una categoría, según las estructuras (p. ej. Eje: Rueda 1, Rueda 2…). */
export function posicionesDe(raices: Nodo[], categoria: string): { nombre: string; categoria: string }[] {
  let mejor: Nodo | null = null;
  raices.forEach((r) => recorrer(r, (n) => { if (n.categoria === categoria && (!mejor || n.hijos.length > mejor.hijos.length)) mejor = n; }));
  return mejor ? (mejor as Nodo).hijos.map((h) => ({ nombre: h.nombre, categoria: h.categoria })) : [];
}

/* ---------- Envío entre almacenes (HU-M09) y fin de vida (HU-M12) ---------- */
/** Envío: un activo suelto va a otro almacén con todo lo que lleva montado (siguen montados en él). */
export function planEnvio(activos: Record<string, ActivoM>, serie: string, destino: string): PlanIntercambio {
  const A = activos[serie];
  if (!A || A.lugar.tipo !== "almacen") return { filas: [] };
  if (A.lugar.padre) return { filas: [], error: `El ${A.categoria.replace(/^./, (c) => c.toLowerCase())} ${A.serie} está montado en ${A.lugar.padre}: desmóntalo antes` };
  if (A.lugar.almacenId === destino) return { filas: [], error: "Elige un almacén de destino distinto del de origen" };
  const d = descendientes(activos, A);
  return { filas: [fila(A, { tipo: "almacen", almacenId: destino }, false), ...d.map((e) => fila(e.a, { ...(e.a.lugar as Extract<Lugar, { tipo: "almacen" }>), almacenId: destino }, true))] };
}

/** Fin de vida: un activo suelto de un almacén queda De baja; sus activos montados, también o sueltos en el almacén. */
export function planBaja(activos: Record<string, ActivoM>, serie: string, incluirHijos: boolean): PlanIntercambio {
  const A = activos[serie];
  if (!A || A.lugar.tipo !== "almacen") return { filas: [] };
  if (A.lugar.padre) return { filas: [], error: `El ${A.categoria.replace(/^./, (c) => c.toLowerCase())} ${A.serie} está montado en ${A.lugar.padre}: desmóntalo antes` };
  const alm = A.lugar.almacenId;
  const d = descendientes(activos, A);
  return { filas: [fila(A, { tipo: "baja" }, false), ...d.map((e) => fila(e.a, incluirHijos ? { tipo: "baja" }
    : e.rel.includes(SEP) ? (e.a.lugar as Extract<Lugar, { tipo: "almacen" }>) : { tipo: "almacen", almacenId: alm }, true)).filter((x) => JSON.stringify(x.antes) !== JSON.stringify(x.despues))] };
}

/* ---------- Estado inicial ---------- */
type UnidadInfo = { serie: string; flotaId: string; configId: string; estructuraId: string };

function inicial(activosBase: ReturnType<typeof generarActivos>, unidades: UnidadInfo[]): Estado {
  const activos: Record<string, ActivoM> = {};
  activosBase.forEach((a) => {
    activos[a.serie] = {
      serie: a.serie, categoria: a.categoria,
      lugar: a.donde === "unidad" ? { tipo: "unidad", unidad: a.unidad!, hueco: a.hueco! } : { tipo: "almacen", almacenId: a.almacenId!, padre: a.montadoEn },
      km: a.km, horas: a.horas, ciclos: a.ciclos, gmao: a.gmao, tag: a.tag,
    };
  });
  // En el almacén, el Excel solo dice en qué activo está montado: el hueco se numera por categoría ("Eje 1", "Eje 2")
  const cuenta = new Map<string, number>();
  Object.values(activos).forEach((a) => {
    if (a.lugar.tipo !== "almacen" || !a.lugar.padre) return;
    const k = `${a.lugar.padre}|${a.categoria}`;
    const n = (cuenta.get(k) ?? 0) + 1; cuenta.set(k, n);
    a.lugar = { ...a.lugar, enHueco: `${a.categoria} ${n}` };
  });
  // Movimientos de la hoja Movimientos (ya aplicados: los activos están en su sitio actual)
  const lugarDe = (sitio: string, hueco: string): Lugar =>
    unidades.some((u) => u.serie === sitio) ? { tipo: "unidad", unidad: sitio, hueco } : { tipo: "almacen", almacenId: idAlmacen(sitio) };
  const grupos = new Map<string, typeof DATOS.movimientos>();
  DATOS.movimientos.forEach((m) => grupos.set(m.numero, [...(grupos.get(m.numero) ?? []), m]));
  const km: Record<string, PuntoKm[]> = {};
  DATOS.unidades.forEach((u) => { if (u.km !== null) km[u.serie] = [{ fecha: isoDe(u.fechaAlta), km: u.km }]; });
  const movimientos: Movimiento[] = [...grupos.entries()].map(([numero, filas]) => {
    const f0 = filas[0];
    const sitios = filas.flatMap((f) => [f.origen, f.destino]);
    const us = [...new Set(sitios.filter((s) => unidades.some((u) => u.serie === s)))];
    return {
      id: numero, tipo: f0.tipo, fecha: isoDe(f0.fecha), estado: "registrado", por: "Importado del Excel",
      registros: us.map((u) => ({ unidad: u, km: null })),
      almacenes: [...new Set(sitios.filter((s) => !us.includes(s)).map(idAlmacen))],
      filas: filas.map((f) => ({ serie: f.serie, categoria: f.categoria, antes: lugarDe(f.origen, f.huecoOrigen), despues: lugarDe(f.destino, f.huecoDestino) })),
    };
  });
  return { activos, movimientos, km };
}

/* ---------- Contexto ---------- */
type Api = {
  listo: boolean;
  activos: Record<string, ActivoM>;
  movimientos: Movimiento[];
  unidades: (UnidadInfo & { raiz: Nodo })[];
  /** Último km de la unidad antes de una fecha y el primero después (para validar). */
  rangoKm: (unidad: string, fecha: string) => { antes?: PuntoKm; despues?: PuntoKm };
  historialKm: (unidad: string) => PuntoKm[];
  registrar: (m: Omit<Movimiento, "id" | "estado" | "por">) => Movimiento;
  /** Movimientos posteriores (registrados) de los activos de un movimiento: si hay, no se puede anular. */
  posteriores: (id: string) => Movimiento[];
  anular: (id: string) => void;
  restablecer: () => void;
};
const Ctx = createContext<Api | null>(null);
export const useMovimientos = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useMovimientos fuera de MovimientosProvider");
  return c;
};

export function MovimientosProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const clave = `lm-trace-movimientos-v1-${DATOS.version}`;
  const [estado, setEstado] = useState<Estado | null>(null);

  const unidades = useMemo(() => {
    if (!store.listo) return [];
    return unidadesDe(store.configs, store.estructuras).flatMap(({ c, series }) => {
      const raiz = store.estructuras.find((e) => e.id === c.estructuraId)!.raiz;
      return series.map((serie) => ({ serie, flotaId: c.flotaId, configId: c.id, estructuraId: c.estructuraId!, raiz }));
    });
  }, [store.listo, store.configs, store.estructuras]);

  const crear = useCallback(() => inicial(generarActivos(store.flotas, store.configs, store.estructuras, store.almacenes), unidades),
    [store.flotas, store.configs, store.estructuras, store.almacenes, unidades]);

  useEffect(() => {
    if (!store.listo || estado) return;
    try {
      const raw = localStorage.getItem(clave);
      setEstado(raw ? JSON.parse(raw) : crear());
    } catch { setEstado(crear()); }
  }, [store.listo, estado, clave, crear]);

  useEffect(() => {
    if (!estado) return;
    try { localStorage.setItem(clave, JSON.stringify(estado)); } catch { /* sin almacenamiento: el prototipo sigue funcionando */ }
  }, [estado, clave]);

  const ref = useRef<Estado | null>(null);
  ref.current = estado;
  const registrar = useCallback((m: Omit<Movimiento, "id" | "estado" | "por">) => {
    const s = ref.current!;
    const n = Math.max(0, ...s.movimientos.map((x) => Number(x.id.replace(/\D/g, "")) || 0)) + 1;
    const nuevo: Movimiento = { ...m, id: `M-${String(n).padStart(4, "0")}`, estado: "registrado", por: USUARIO };
    const activos = { ...s.activos };
    m.filas.forEach((f) => { activos[f.serie] = { ...activos[f.serie], lugar: f.despues }; });
    const km = { ...s.km };
    m.registros.forEach((r) => { if (r.km !== null) km[r.unidad] = [...(km[r.unidad] ?? []), { fecha: m.fecha, km: r.km, mov: nuevo.id }]; });
    const siguiente: Estado = { activos, km, movimientos: [...s.movimientos, nuevo] };
    ref.current = siguiente;
    setEstado(siguiente);
    return nuevo;
  }, []);

  const posteriores = useCallback((id: string) => {
    if (!estado) return [];
    const m = estado.movimientos.find((x) => x.id === id);
    if (!m) return [];
    const series = new Set(m.filas.map((f) => f.serie));
    return estado.movimientos
      .filter((x) => x.id !== id && x.estado === "registrado" && (x.fecha > m.fecha || (x.fecha === m.fecha && x.id > id)) && x.filas.some((f) => series.has(f.serie)))
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
  }, [estado]);

  const anular = useCallback((id: string) => {
    setEstado((s) => {
      if (!s) return s;
      const m = s.movimientos.find((x) => x.id === id);
      if (!m || m.estado === "anulado") return s;
      const activos = { ...s.activos };
      m.filas.forEach((f) => { activos[f.serie] = { ...activos[f.serie], lugar: f.antes }; });
      const km = Object.fromEntries(Object.entries(s.km).map(([u, l]) => [u, l.filter((p) => p.mov !== id)]));
      return { activos, km, movimientos: s.movimientos.map((x) => (x.id === id ? { ...x, estado: "anulado", anulado: { fecha: ahoraIso(), por: USUARIO } } : x)) };
    });
  }, []);

  const api = useMemo<Api>(() => ({
    listo: !!estado,
    activos: estado?.activos ?? {},
    movimientos: estado?.movimientos ?? [],
    unidades,
    historialKm: (u) => [...(estado?.km[u] ?? [])].sort((a, b) => a.fecha.localeCompare(b.fecha)),
    rangoKm: (u, fecha) => {
      const l = [...(estado?.km[u] ?? [])].sort((a, b) => a.fecha.localeCompare(b.fecha));
      return { antes: [...l].reverse().find((p) => p.fecha <= fecha), despues: l.find((p) => p.fecha > fecha) };
    },
    registrar, posteriores, anular,
    restablecer: () => setEstado(crear()),
  }), [estado, unidades, registrar, posteriores, anular, crear]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

/* ---------- Textos ---------- */
export function useTextos() {
  const store = useStore();
  const { unidades } = useMovimientos();
  const nombreAlmacen = (id: string) => store.almacenes.find((a) => a.id === id)?.nombre ?? id;
  const flotaDeUnidad = (u: string) => store.flotas.find((f) => f.id === unidades.find((x) => x.serie === u)?.flotaId)?.nombre ?? "";
  const lugar = (l: Lugar) =>
    l.tipo === "unidad" ? `${l.unidad} › ${l.hueco}`
      : l.tipo === "almacen" ? `${nombreAlmacen(l.almacenId)} · ${l.padre ? `en ${l.padre}${l.enHueco ? ` › ${l.enHueco}` : ""}` : "suelto"}`
        : "De baja";
  return { nombreAlmacen, flotaDeUnidad, lugar };
}

/** Recorre el árbol de una unidad con el activo de cada hueco. */
export function huecosConActivo(raiz: Nodo, unidad: string, activos: Record<string, ActivoM>) {
  const porHueco = new Map<string, ActivoM>();
  Object.values(activos).forEach((a) => { if (a.lugar.tipo === "unidad" && a.lugar.unidad === unidad) porHueco.set(a.lugar.hueco, a); });
  const rutas = new Map<string, string>();
  recorrer(raiz, (n, nivel, padre) => { rutas.set(n.id, nivel === 1 ? "" : padre && rutas.get(padre.id) ? `${rutas.get(padre.id)}${SEP}${n.nombre}` : n.nombre); });
  return { activoDe: (n: Nodo) => porHueco.get(rutas.get(n.id) ?? ""), rutaDe: (n: Nodo) => rutas.get(n.id) ?? "" };
}
