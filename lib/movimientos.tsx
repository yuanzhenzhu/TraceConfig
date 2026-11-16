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
/** Una fila del movimiento: un activo con su antes y su después (y sus horas o ciclos, si es motor o puerta). */
export type FilaMov = { serie: string; categoria: string; antes: Lugar; despues: Lugar; conPadre?: boolean; horas?: number | null; ciclos?: number | null };

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
  motivo?: string; // fin de vida
  principal?: { serie: string; categoria: string }; // rotación: el bogie que gira; montaje/desmontaje en almacén: el padre (sus filas son solo los hijos)
  /** Montaje/desmontaje en almacén: lo que lleva montado el padre (después del montaje; antes del desmontaje), para ver el padre con sus hijos. */
  montados?: { pos: string; serie: string; categoria: string }[];
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


/* ---------- Artículos ---------- */
/** Categorías femeninas: la primera palabra acaba en "a" (Rueda, Reductora, Puerta, Tarjeta Electrónica; no Motor Puerta). */
export const femenina = (categoria?: string) => /a$/i.test((categoria ?? "").split(" ")[0]);
/** "el eje" / "la rueda" (o "del eje" / "de la rueda", "al eje" / "a la rueda", "un eje" / "una rueda"). */
export function art(categoria: string | undefined, forma: "el" | "del" | "al" | "un" = "el", mayuscula = false) {
  const f = femenina(categoria);
  const a = { el: f ? "la" : "el", del: f ? "de la" : "del", al: f ? "a la" : "al", un: f ? "una" : "un" }[forma];
  const t = `${a} ${(categoria ?? "").replace(/^./, (c) => c.toLowerCase())}`;
  return mayuscula ? t.replace(/^./, (c) => c.toUpperCase()) : t;
}

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
  if (A.categoria !== B.categoria) return { filas: [], error: `Categorías diferentes: no se puede intercambiar ${art(A.categoria, "un")} con ${art(B.categoria, "un")}` };
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
  if (choque) return { filas: [], error: `${art(B.categoria, "el", true)} ${B.serie} trae un activo en ${relB[choque.a.serie]}, que se queda ocupado en la unidad: elige otro o marca también ese activo` };
  // Lo que se queda necesita a su padre: si su padre sale, el que entra tiene que traer otro en esa posición
  const posEntran = new Set(dB.map((d) => relB[d.a.serie]));
  const huerfano = dA.find((d) => {
    if (!quedan.has(d.a.serie)) return false;
    const p = padreRuta(d.rel);
    return !!p && !posQuedan.has(p) && !posEntran.has(p);
  });
  if (huerfano) {
    const p = padreRuta(huerfano.rel);
    return { filas: [], error: `${huerfano.a.categoria} ${huerfano.a.serie} (${huerfano.rel}) se quedaría sin su padre: ${p} se desmonta y ${art(B.categoria, "el")} ${B.serie} no trae otro en esa posición. Marca también lo que cuelga de ${p} o desmarca ${p}` };
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
  if (A.categoria !== B.categoria) return { filas: [], error: `Categorías diferentes: no se puede intercambiar ${art(A.categoria, "un")} con ${art(B.categoria, "un")}` };
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
    if (choque) return `${art(quien.categoria, "el", true)} ${quien.serie} trae un activo en ${llega.nueva[choque.a.serie]}, que se queda ocupado junto ${art(donde.categoria, "al")} ${donde.serie}`;
    const huerf = destino.d.find((e) => destino.posQuedan.has(e.rel) && padreRuta(e.rel) && !destino.posQuedan.has(padreRuta(e.rel)) && !llega.posLlegan.has(padreRuta(e.rel)));
    if (huerf) return `${huerf.a.categoria} ${huerf.a.serie} (${huerf.rel}) se quedaría sin su padre: ${padreRuta(huerf.rel)} se desmonta y ${art(quien.categoria, "el")} ${quien.serie} no trae otro en esa posición`;
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
  if (fuera) return { filas: [], error: `${art(B.categoria, "el", true)} ${B.serie} trae ${fuera.a.categoria.replace(/^./, (c) => c.toLowerCase())} ${fuera.a.serie} en ${fuera.rel}, una posición que no existe en la estructura de la unidad` };
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
  if (H.lugar.padre) return { filas: [], error: `${art(H.categoria, "el", true)} ${H.serie} ya está montado en ${H.lugar.padre}` };
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
  if (A.lugar.padre) return { filas: [], error: `${art(A.categoria, "el", true)} ${A.serie} está montado en ${A.lugar.padre}: desmóntalo antes` };
  if (A.lugar.almacenId === destino) return { filas: [], error: "Elige un almacén de destino distinto del de origen" };
  const d = descendientes(activos, A);
  return { filas: [fila(A, { tipo: "almacen", almacenId: destino }, false), ...d.map((e) => fila(e.a, { ...(e.a.lugar as Extract<Lugar, { tipo: "almacen" }>), almacenId: destino }, true))] };
}

/** Fin de vida: un activo suelto de un almacén queda De baja; sus activos montados, también o sueltos en el almacén. */
export function planBaja(activos: Record<string, ActivoM>, serie: string, incluirHijos: boolean): PlanIntercambio {
  const A = activos[serie];
  if (!A || A.lugar.tipo !== "almacen") return { filas: [] };
  if (A.lugar.padre) return { filas: [], error: `${art(A.categoria, "el", true)} ${A.serie} está montado en ${A.lugar.padre}: desmóntalo antes` };
  const alm = A.lugar.almacenId;
  const d = descendientes(activos, A);
  return { filas: [fila(A, { tipo: "baja" }, false), ...d.map((e) => fila(e.a, incluirHijos ? { tipo: "baja" }
    : e.rel.includes(SEP) ? (e.a.lugar as Extract<Lugar, { tipo: "almacen" }>) : { tipo: "almacen", almacenId: alm }, true)).filter((x) => JSON.stringify(x.antes) !== JSON.stringify(x.despues))] };
}

/* ---------- Estado inicial ---------- */
type UnidadInfo = { serie: string; flotaId: string; configId: string; estructuraId: string };

function inicial(activosBase: ReturnType<typeof generarActivos>, unidades: (UnidadInfo & { raiz?: Nodo })[]): Estado {
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
      // Km de cada unidad: el de la fila en la que es el origen o, si no, el destino (columna Km de la hoja)
      registros: us.map((u) => ({ unidad: u, km: (filas.find((f) => f.origen === u) ?? filas.find((f) => f.destino === u))?.km ?? null })),
      almacenes: [...new Set(sitios.filter((s) => !us.includes(s)).map(idAlmacen))],
      filas: filas.map((f) => ({ serie: f.serie, categoria: f.categoria, antes: lugarDe(f.origen, f.huecoOrigen), despues: lugarDe(f.destino, f.huecoDestino) })),
    };
  });
  movimientos.forEach((m) => m.registros.forEach((r) => { if (r.km !== null) km[r.unidad] = [...(km[r.unidad] ?? []), { fecha: m.fecha, km: r.km, mov: m.id }]; }));
  return ejemplos({ activos, movimientos, km }, unidades);
}

/* ---------- Registrar un movimiento sobre el estado ---------- */
type NuevoMov = Omit<Movimiento, "id" | "estado" | "por">;
function aplicar(s: Estado, m: NuevoMov, por: string = USUARIO): { s: Estado; mov: Movimiento } {
  const n = Math.max(0, ...s.movimientos.map((x) => Number(x.id.replace(/\D/g, "")) || 0)) + 1;
  const activos = { ...s.activos };
  m.filas.forEach((f) => { activos[f.serie] = { ...activos[f.serie], lugar: f.despues, ...(f.horas != null ? { horas: f.horas } : {}), ...(f.ciclos != null ? { ciclos: f.ciclos } : {}) }; });
  // Montaje/desmontaje en almacén: foto de lo que lleva montado el padre (después del montaje, antes del desmontaje)
  let montados = m.montados;
  if (!montados && m.principal && (m.tipo === TIPOS.montajeAlmacen || m.tipo === TIPOS.desmontajeAlmacen)) {
    const de = m.tipo === TIPOS.montajeAlmacen ? activos : s.activos;
    montados = Object.values(de).filter((a) => a.lugar.tipo === "almacen" && a.lugar.padre === m.principal!.serie)
      .map((a) => ({ pos: (a.lugar as { enHueco?: string }).enHueco ?? a.categoria, serie: a.serie, categoria: a.categoria }))
      .sort((x, y) => x.pos.localeCompare(y.pos, "es", { numeric: true }));
  }
  const mov: Movimiento = { ...m, ...(montados ? { montados } : {}), id: `M-${String(n).padStart(4, "0")}`, estado: "registrado", por };
  const km = { ...s.km };
  m.registros.forEach((r) => { if (r.km !== null) km[r.unidad] = [...(km[r.unidad] ?? []), { fecha: m.fecha, km: r.km, mov: mov.id }]; });
  return { s: { activos, km, movimientos: [...s.movimientos, mov] }, mov };
}

/* ---------- Ejemplos de partida: todos los tipos de movimiento, varios con padre e hijos ---------- */
/**
 * Se generan aplicando las mismas reglas que las pantallas sobre los activos del Excel, así que cuadran con dónde
 * está cada activo. Si faltan datos para un ejemplo, se omite.
 */
function ejemplos(inicio: Estado, unidades: (UnidadInfo & { raiz?: Nodo })[]): Estado {
  let s = inicio;
  const usados = new Set<string>();
  const lista = () => Object.values(s.activos).sort((a, b) => a.serie.localeCompare(b.serie, "es", { numeric: true }));
  const hijos = (a: ActivoM) => descendientes(s.activos, a);
  const libre = (a: ActivoM) => !usados.has(a.serie) && hijos(a).every((d) => !usados.has(d.a.serie));
  const enUnidad = (cat: string) => lista().filter((a) => a.lugar.tipo === "unidad" && a.categoria === cat && libre(a));
  const enAlmacen = (cat: string) => lista().filter((a) => a.lugar.tipo === "almacen" && !a.lugar.padre && a.categoria === cat && libre(a));
  const unidadDe = (a: ActivoM) => (a.lugar.tipo === "unidad" ? a.lugar.unidad : "");
  const almacenDe = (a: ActivoM) => (a.lugar.tipo === "almacen" ? a.lugar.almacenId : "");
  const kmEn = (u: string, fecha: string) => {
    const previo = (s.km[u] ?? []).filter((p) => p.fecha <= fecha).sort((a, b) => a.fecha.localeCompare(b.fecha)).pop()?.km ?? 120000;
    return previo + 640 + (Number(u.replace(/\D/g, "")) % 7) * 133;
  };
  const reg = (m: NuevoMov, por: string = USUARIO) => {
    if (!m.filas.length) return null;
    const r = aplicar(s, m, por); s = r.s;
    m.filas.forEach((f) => usados.add(f.serie));
    return r.mov;
  };
  const intento = (f: () => void) => { try { f(); } catch { /* sin datos para este ejemplo */ } };
  const huecosDe = (u: string) => {
    const set = new Set<string>();
    const raiz = unidades.find((x) => x.serie === u)?.raiz;
    const ir = (n: Nodo, ruta: string) => { if (ruta) set.add(ruta); n.hijos.forEach((h) => ir(h, ruta ? `${ruta}${SEP}${h.nombre}` : h.nombre)); };
    if (raiz) ir(raiz, "");
    return set;
  };
  const almacenes = [...new Set(lista().map(almacenDe).filter(Boolean))];

  // 1. Intercambio entre unidad y almacén: un bogie con sus ejes y ruedas
  intento(() => {
    const B = enAlmacen("Bogie").find((a) => hijos(a).length >= 2);
    const A = B && enUnidad("Bogie").find((a) => hijos(a).length >= 2);
    if (!A || !B) return;
    const p = planIntercambioUA(s.activos, A.serie, B.serie, new Set(), false);
    if (p.error) return;
    const f = "2026-09-02T08:15";
    reg({ tipo: TIPOS.intercambioUA, fecha: f, almacenes: [almacenDe(B)], filas: p.filas, registros: [{ unidad: unidadDe(A), km: kmEn(unidadDe(A), f) }] });
  });
  // 2. Intercambio entre unidad y almacén: un eje con sus ruedas, girado 180° al montarlo
  intento(() => {
    const B = enAlmacen("Eje").find((a) => hijos(a).length >= 2);
    if (!B) return;
    for (const A of enUnidad("Eje").filter((a) => hijos(a).length >= 2)) {
      const p = planIntercambioUA(s.activos, A.serie, B.serie, new Set(), true);
      if (p.error) continue;
      const f = "2026-09-04T11:40";
      reg({ tipo: TIPOS.intercambioUA, fecha: f, almacenes: [almacenDe(B)], filas: p.filas, registros: [{ unidad: unidadDe(A), km: kmEn(unidadDe(A), f) }] });
      return;
    }
  });
  // 3. Intercambio entre unidad y almacén: un activo sin hijos (reductora)
  intento(() => {
    const B = enAlmacen("Reductora")[0];
    const A = enUnidad("Reductora")[0];
    if (!A || !B) return;
    const p = planIntercambioUA(s.activos, A.serie, B.serie, new Set(), false);
    const f = "2026-09-08T09:05";
    reg({ tipo: TIPOS.intercambioUA, fecha: f, almacenes: [almacenDe(B)], filas: p.filas, registros: [{ unidad: unidadDe(A), km: kmEn(unidadDe(A), f) }] });
  });
  // 4. Intercambio entre unidades: un bogie con sus ejes y ruedas entre dos unidades de la misma estructura
  intento(() => {
    const bogies = enUnidad("Bogie").filter((a) => hijos(a).length >= 2);
    const estr = (a: ActivoM) => unidades.find((u) => u.serie === unidadDe(a))?.estructuraId;
    for (const A of bogies) {
      const B = bogies.find((b) => unidadDe(b) !== unidadDe(A) && estr(b) === estr(A));
      if (!B) continue;
      const p = planIntercambioUU(s.activos, { serie: A.serie, quedan: new Set(), rotar: false }, { serie: B.serie, quedan: new Set(), rotar: false });
      if (p.error) continue;
      const f = "2026-09-12T07:30";
      reg({ tipo: TIPOS.intercambioUU, fecha: f, almacenes: [], filas: p.filas, registros: [unidadDe(A), unidadDe(B)].map((u) => ({ unidad: u, km: kmEn(u, f) })) });
      return;
    }
  });
  // 5. Intercambio dentro de la unidad: dos ejes con sus ruedas de bogies distintos
  intento(() => {
    const ejes = enUnidad("Eje").filter((a) => hijos(a).length >= 2);
    for (const A of ejes) {
      const B = ejes.find((b) => b.serie !== A.serie && unidadDe(b) === unidadDe(A) && padreRuta((b.lugar as { hueco: string }).hueco) !== padreRuta((A.lugar as { hueco: string }).hueco));
      if (!B) continue;
      const p = planIntercambioUU(s.activos, { serie: A.serie, quedan: new Set(), rotar: false }, { serie: B.serie, quedan: new Set(), rotar: false });
      if (p.error) continue;
      const f = "2026-09-15T13:20";
      reg({ tipo: TIPOS.intercambioMU, fecha: f, almacenes: [], filas: p.filas, registros: [{ unidad: unidadDe(A), km: kmEn(unidadDe(A), f) }] });
      return;
    }
  });
  // 6. Rotación de bogies
  intento(() => {
    for (const B of enUnidad("Bogie")) {
      const p = planRotacion(s.activos, B.serie);
      if (p.error) continue;
      const f = "2026-09-19T10:00";
      reg({ tipo: TIPOS.rotacionBogie, fecha: f, almacenes: [], filas: p.filas, registros: [{ unidad: unidadDe(B), km: kmEn(unidadDe(B), f) }], principal: { serie: B.serie, categoria: B.categoria } });
      usados.add(B.serie);
      return;
    }
  });
  // 7-11. Un eje sale de la unidad, entra otro en su hueco; en el almacén se desmontan sus ruedas, se vuelven a montar y se envía
  intento(() => {
    const A = enUnidad("Eje").find((a) => hijos(a).length >= 2);
    if (!A || !almacenes.length) return;
    const u = unidadDe(A), hueco = (A.lugar as { hueco: string }).hueco, alm = almacenes[0];
    let f = "2026-09-23T08:45";
    const pD = planDesmontajeUnidad(s.activos, A.serie, { almacenId: alm }, false, "");
    if (pD.error) return;
    reg({ tipo: TIPOS.desmontajeUnidad, fecha: f, almacenes: [alm], filas: pD.filas, registros: [{ unidad: u, km: kmEn(u, f) }] });
    // Montaje en unidad: otro eje del almacén (con sus ruedas) en el hueco que ha quedado libre
    const huecos = huecosDe(u);
    for (const B of enAlmacen("Eje").sort((x, y) => hijos(y).length - hijos(x).length)) {
      const p = planMontajeUnidad(s.activos, u, hueco, B.serie, huecos);
      if (p.error) continue;
      f = "2026-09-24T16:10";
      reg({ tipo: TIPOS.montajeUnidad, fecha: f, almacenes: [almacenDe(B)], filas: p.filas, registros: [{ unidad: u, km: kmEn(u, f) }] });
      break;
    }
    // Desmontaje en almacén: las ruedas del eje que ha salido, una a una (un movimiento por rueda; la rueda es el participante y el eje, su padre, se ve en el detalle)
    const ruedas = hijosDirectos(s.activos, s.activos[A.serie]).filter((h) => h.categoria === "Rueda").slice(0, 2);
    const posiciones = ruedas.map((r) => (r.lugar.tipo === "almacen" ? r.lugar.enHueco ?? "" : ""));
    const P = { serie: A.serie, categoria: A.categoria };
    ruedas.forEach((r, i) => reg({ tipo: TIPOS.desmontajeAlmacen, fecha: `2026-09-29T09:${30 + i * 5}`, almacenes: [alm], filas: planDesmontajeAlmacen(s.activos, r.serie).filas, registros: [], principal: P }));
    // Montaje en almacén: las mismas ruedas, torneadas, vuelven a su posición, una a una
    ruedas.forEach((r, i) => reg({ tipo: TIPOS.montajeAlmacen, fecha: `2026-10-06T12:${String(i * 5).padStart(2, "0")}`, almacenes: [alm], filas: planMontajeAlmacen(s.activos, A.serie, posiciones[i], r.serie).filas.map((x) => ({ ...x, conPadre: true })), registros: [], principal: P }));
    // Envío entre almacenes: el eje con sus ruedas
    const destino = almacenes.find((x) => x !== alm);
    if (destino) reg({ tipo: TIPOS.envio, fecha: "2026-10-09T15:25", almacenes: [alm, destino], filas: planEnvio(s.activos, A.serie, destino).filas, registros: [] });
  });
  // 12. Fin de vida: un bogie del almacén con todo lo que lleva montado
  intento(() => {
    const A = enAlmacen("Bogie").find((a) => hijos(a).length >= 1) ?? enAlmacen("Eje").find((a) => hijos(a).length >= 1);
    if (!A) return;
    reg({ tipo: TIPOS.finVida, fecha: "2026-10-14T10:50", almacenes: [almacenDe(A)], filas: planBaja(s.activos, A.serie, true).filas, registros: [], motivo: "Grietas en el bastidor detectadas en la inspección" });
  });
  // 13. Desmontaje de unidad a baja: un eje de baja y sus ruedas al almacén
  intento(() => {
    const A = enUnidad("Eje").find((a) => hijos(a).length >= 2);
    if (!A || !almacenes.length) return;
    const p = planDesmontajeUnidad(s.activos, A.serie, "baja", false, almacenes[0]);
    if (p.error) return;
    const f = "2026-10-20T07:55";
    reg({ tipo: TIPOS.desmontajeUnidad, fecha: f, almacenes: [almacenes[0]], filas: p.filas, registros: [{ unidad: unidadDe(A), km: kmEn(unidadDe(A), f) }] });
  });
  // 14. Un intercambio anulado (sigue en el historial, tachado)
  intento(() => {
    const B = enAlmacen("Reductora")[0];
    const A = enUnidad("Reductora")[0];
    if (!A || !B) return;
    const f = "2026-10-27T18:05";
    const m = reg({ tipo: TIPOS.intercambioUA, fecha: f, almacenes: [almacenDe(B)], filas: planIntercambioUA(s.activos, A.serie, B.serie, new Set(), false).filas, registros: [{ unidad: unidadDe(A), km: kmEn(unidadDe(A), f) }] });
    if (!m) return;
    const activos = { ...s.activos };
    m.filas.forEach((x) => { activos[x.serie] = { ...activos[x.serie], lugar: x.antes }; });
    s = {
      activos, km: Object.fromEntries(Object.entries(s.km).map(([u, l]) => [u, l.filter((p) => p.mov !== m.id)])),
      movimientos: s.movimientos.map((x) => (x.id === m.id ? { ...x, estado: "anulado", anulado: { fecha: "2026-10-28T08:10", por: USUARIO } } : x)),
    };
  });
  return s;
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
  // Al cambiar los ejemplos se cambia la clave: así nunca se mezclan con lo guardado antes en el navegador
  const clave = `lm-trace-movimientos-v8-${DATOS.version}`;
  const [estado, setEstado] = useState<Estado | null>(null);
  const [claveCargada, setClaveCargada] = useState("");

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
    if (!store.listo || claveCargada === clave) return;
    try {
      const raw = localStorage.getItem(clave);
      setEstado(raw ? JSON.parse(raw) : crear());
    } catch { setEstado(crear()); }
    setClaveCargada(clave);
  }, [store.listo, claveCargada, clave, crear]);

  useEffect(() => {
    if (!estado || claveCargada !== clave) return;
    try { localStorage.setItem(clave, JSON.stringify(estado)); } catch { /* sin almacenamiento: el prototipo sigue funcionando */ }
  }, [estado, clave, claveCargada]);

  const ref = useRef<Estado | null>(null);
  ref.current = estado;
  const registrar = useCallback((m: Omit<Movimiento, "id" | "estado" | "por">) => {
    const { s: siguiente, mov: nuevo } = aplicar(ref.current!, m);
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
/**
 * Huecos libres de una unidad donde se puede montar algo: sin activo y con su padre ocupado
 * (si cuelgan huecos vacíos de un hueco vacío, solo cuenta el de arriba: al montar, el activo trae los suyos).
 */
export function huecosLibres(raiz: Nodo, unidad: string, activos: Record<string, ActivoM>): { ruta: string; categoria: string }[] {
  const ocupados = new Set(Object.values(activos).filter((a) => a.lugar.tipo === "unidad" && a.lugar.unidad === unidad).map((a) => (a.lugar as { hueco: string }).hueco));
  const out: { ruta: string; categoria: string }[] = [];
  const ir = (n: Nodo, ruta: string) => n.hijos.forEach((h) => {
    const r = ruta ? `${ruta}${SEP}${h.nombre}` : h.nombre;
    if (ocupados.has(r)) ir(h, r); else out.push({ ruta: r, categoria: h.categoria });
  });
  ir(raiz, "");
  return out;
}

export function huecosConActivo(raiz: Nodo, unidad: string, activos: Record<string, ActivoM>) {
  const porHueco = new Map<string, ActivoM>();
  Object.values(activos).forEach((a) => { if (a.lugar.tipo === "unidad" && a.lugar.unidad === unidad) porHueco.set(a.lugar.hueco, a); });
  const rutas = new Map<string, string>();
  recorrer(raiz, (n, nivel, padre) => { rutas.set(n.id, nivel === 1 ? "" : padre && rutas.get(padre.id) ? `${rutas.get(padre.id)}${SEP}${n.nombre}` : n.nombre); });
  return { activoDe: (n: Nodo) => porHueco.get(rutas.get(n.id) ?? ""), rutaDe: (n: Nodo) => rutas.get(n.id) ?? "" };
}
