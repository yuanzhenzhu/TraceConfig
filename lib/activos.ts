// Activos con nº de serie (ficticios) para el prototipo de Cambio de número de serie.
// Se generan a partir de las configuraciones con unidades dadas de alta y de los almacenes del cliente.

import { primerNivelCargado, recorrer, rutaDe, type Almacen, type Configuracion, type Estructura, type Flota } from "./model";

export type Activo = {
  id: string;
  serie: string; // nº de serie actual
  categoria: string;
  donde: "unidad" | "almacen";
  flotaId?: string;
  configId?: string;
  unidad?: string; // nº de serie de la unidad, por ejemplo 1001
  hueco?: string; // posición dentro de la unidad, por ejemplo Coche 1 › Bogie 1 › Eje 1 › Rueda 1
  almacenId?: string;
};

const PREFIJO: Record<string, string> = {
  Coche: "CO", "Motor Coche": "MC", Puerta: "PU", "Motor Puerta": "MP", "Tarjeta Electrónica": "TE",
  Bogie: "BO", "Motor Bogie": "MB", Eje: "EJ", Rueda: "RU", Pantógrafo: "PA", Freno: "FR", Compresor: "CP", Climatizador: "CL",
};
const prefijo = (c: string) => PREFIJO[c] ?? c.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();

/** Unidades dadas de alta de cada configuración (nº de serie 1001, 2001…). */
export function unidadesDe(configs: Configuracion[], estructuras: Estructura[]) {
  return configs
    .filter((c) => c.guardada && c.unidades && primerNivelCargado(c, estructuras.find((e) => e.id === c.estructuraId)?.raiz))
    .map((c, k) => ({ c, series: Array.from({ length: c.unidades ?? 0 }, (_, i) => String((k + 1) * 1000 + 1 + i)) }));
}

export function generarActivos(flotas: Flota[], configs: Configuracion[], estructuras: Estructura[], almacenes: Almacen[]): Activo[] {
  const out: Activo[] = [];
  unidadesDe(configs, estructuras).forEach(({ c, series }) => {
    const raiz = estructuras.find((e) => e.id === c.estructuraId)!.raiz;
    series.forEach((u) => {
      let k = 0;
      recorrer(raiz, (n, nivel) => {
        if (nivel === 1) return; // la propia unidad se identifica por su nº de serie
        k++;
        out.push({
          id: `${c.id}-${u}-${n.id}`, serie: `${prefijo(n.categoria)}-${u}-${String(k).padStart(3, "0")}`, categoria: n.categoria,
          donde: "unidad", flotaId: c.flotaId, configId: c.id, unidad: u, hueco: rutaDe(raiz, n.id).join(" › "),
        });
      });
    });
  });
  // Repuestos en almacén
  const repuestos = ["Rueda", "Rueda", "Eje", "Bogie", "Motor Coche", "Motor Puerta", "Tarjeta Electrónica", "Pantógrafo", "Compresor", "Freno"];
  almacenes.forEach((a, i) => {
    repuestos.forEach((cat, j) => {
      out.push({ id: `${a.id}-${j}`, serie: `${prefijo(cat)}-A${i + 1}-${String(j + 1).padStart(3, "0")}`, categoria: cat, donde: "almacen", almacenId: a.id });
    });
  });
  void flotas;
  return out;
}

/** CSV (separador ;) con los activos y una columna para el nº de serie nuevo. */
export function descargarCsv(nombre: string, activos: Activo[], etiquetaDonde: (a: Activo) => string) {
  const cab = ["Ubicación", "Categoría", "Nº de serie actual", "Nº de serie nuevo"];
  const filas = activos.map((a) => [etiquetaDonde(a), a.categoria, a.serie, ""]);
  const csv = "﻿" + [cab, ...filas].map((f) => f.map((v) => `"${v.replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const el = document.createElement("a");
  el.href = url; el.download = `${nombre}.csv`.toLowerCase().replace(/\s+/g, "-");
  el.click(); URL.revokeObjectURL(url);
}
