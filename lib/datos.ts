// Datos comunes de todos los módulos, leídos de datos/datos.json (que se genera desde datos/datos.xlsx con `npm run datos`).
// Aquí se pasan a los tipos de la app: ids estables a partir de los nombres, estructuras como árbol de huecos, etc.

import json from "@/datos/datos.json";
import type { Almacen, Estructura, Nodo, PropsCategoria, PropsHueco, UsoAlmacen } from "./model";

/* ---------- Tal como viene del Excel ---------- */
export type DatosExcel = {
  version: string;
  flotas: { nombre: string; descripcion: string }[];
  lineas: string[];
  estructuras: { nombre: string; descripcion: string; huecos: { ruta: string; categoria: string }[] }[];
  categorias: string[];
  propsCategoria: { nombre: string; tipo: string }[];
  propsPorCategoria: { categoria: string; propiedad: string; historico: boolean }[];
  propsHueco: { nombre: string; tipo: string; ejemplo: string }[];
  propsPorHueco: { estructura: string; hueco: string; propiedad: string }[];
  configuraciones: { flota: string; nombre: string; descripcion: string; estructura: string; unidades: number; estado: "Activa" | "En configuración" }[];
  almacenes: { nombre: string; ubicacion: string; contacto: string; telefono: string; usos: string[] }[];
  unidades: { serie: string; flota: string; configuracion: string; km: number | null; fechaAlta: string }[];
  activos: ActivoExcel[];
  valores: { serie: string; propiedad: string; valor: string; fecha: string }[];
  movimientos: MovimientoExcel[];
  tiposMovimiento: { nombre: string; icono: string }[];
};
export type ActivoExcel = {
  serie: string; categoria: string; unidad: string; hueco: string; almacen: string; montadoEn: string;
  km: number | null; ciclos: number | null; horas: number | null; gmao: string; tag: string;
};
export type MovimientoExcel = {
  numero: string; fecha: string; tipo: string; serie: string; categoria: string;
  origen: string; huecoOrigen: string; destino: string; huecoDestino: string;
  km: number | null; // km de la unidad de origen o, si el origen es un almacén, de la de destino
};

export const DATOS = json as DatosExcel;
export const SEP = " › ";

/* ---------- Ids estables a partir de los nombres ---------- */
export const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const idFlota = (nombre: string) => `flota-${slug(nombre)}`;
export const idEstructura = (nombre: string) => `est-${slug(nombre)}`;
export const idAlmacen = (nombre: string) => `alm-${slug(nombre)}`;
export const idConfig = (flota: string, nombre: string) => `cfg-${slug(flota)}${nombre ? "-" + slug(nombre) : ""}`;
export const idPropCategoria = (nombre: string) => slug(nombre);
/** Id de un hueco: estructura + ruta. La raíz es "<estructura>:tren". */
export const idHueco = (estId: string, ruta: string) => `${estId}:${ruta ? slug(ruta) : "tren"}`;

/* ---------- Catálogos ---------- */
export const CATEGORIAS: string[] = DATOS.categorias;
export const PROPS_CATEGORIA: { id: string; nombre: string; tipo: string }[] =
  DATOS.propsCategoria.map((p) => ({ id: idPropCategoria(p.nombre), nombre: p.nombre, tipo: p.tipo }));
export const PROPS_HUECO: { id: string; nombre: string; tipo: string; ejemplo: string }[] =
  DATOS.propsHueco.map((p) => ({ id: p.nombre, nombre: p.nombre, tipo: p.tipo, ejemplo: p.ejemplo }));
export const LINEAS: { id: string; nombre: string }[] = DATOS.lineas.map((l) => ({ id: `linea-${slug(l)}`, nombre: l }));

/* ---------- Estructuras ---------- */
function arbol(estId: string, huecos: { ruta: string; categoria: string }[]): Nodo {
  const raiz: Nodo = { id: idHueco(estId, ""), categoria: "Tren", nombre: "Tren", hijos: [] };
  const porRuta = new Map<string, Nodo>([["", raiz]]);
  for (const h of huecos) {
    const partes = h.ruta.split(SEP);
    const n: Nodo = { id: idHueco(estId, h.ruta), categoria: h.categoria, nombre: partes[partes.length - 1], hijos: [] };
    porRuta.get(partes.slice(0, -1).join(SEP))?.hijos.push(n); // el Excel garantiza que el padre va antes
    porRuta.set(h.ruta, n);
  }
  return raiz;
}

export const ESTRUCTURAS: Estructura[] = DATOS.estructuras.map((e) => {
  const id = idEstructura(e.nombre);
  const propsHueco: PropsHueco = {};
  DATOS.propsPorHueco.filter((p) => p.estructura === e.nombre).forEach((p) => {
    const h = idHueco(id, p.hueco === "Tren" ? "" : p.hueco);
    propsHueco[h] = { ...propsHueco[h], [p.propiedad]: "" };
  });
  return { id, nombre: e.nombre, descripcion: e.descripcion, raiz: arbol(id, e.huecos), propsHueco, actualizada: "2026-05-20T08:00:00Z" };
});

export const PROPS_POR_CATEGORIA: PropsCategoria = {};
DATOS.propsPorCategoria.forEach((p) => {
  (PROPS_POR_CATEGORIA[p.categoria] ??= []).push({ propId: idPropCategoria(p.propiedad), historico: p.historico });
});

export const ALMACENES: Almacen[] = DATOS.almacenes.map((a) => ({
  id: idAlmacen(a.nombre), nombre: a.nombre, ubicacion: a.ubicacion, contacto: a.contacto, telefono: a.telefono,
  usos: a.usos.map((u) => (u === "Mantenimiento" ? "mantenimiento" : "almacen") as UsoAlmacen),
}));

/** Unidades del Excel de una configuración (por nombres de flota y configuración). */
export const unidadesExcel = (flota: string, configuracion: string) =>
  DATOS.unidades.filter((u) => u.flota === flota && u.configuracion === configuracion);
