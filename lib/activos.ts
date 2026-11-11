// Activos con nº de serie de las unidades y de los almacenes.
// Vienen de la hoja Activos del Excel común (datos/datos.xlsx). Los huecos de una unidad que no tienen activo en el Excel,
// y los almacenes sin ningún activo en él, se rellenan con activos generados (ficticios), para no escribir cientos de filas.

import { DATOS, SEP, idAlmacen, idConfig, unidadesExcel } from "./datos";
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
  montadoEn?: string; // en un almacén: nº de serie del activo en el que está montado
  km?: number | null; ciclos?: number | null; horas?: number | null; gmao?: string; tag?: string;
  generado: boolean; // true si no viene del Excel
};

const PREFIJO: Record<string, string> = {
  Coche: "CO", "Motor Coche": "MC", Puerta: "PU", "Motor Puerta": "MP", "Tarjeta Electrónica": "TE",
  Bogie: "BO", "Motor Bogie": "MB", Eje: "EJ", Rueda: "RU", Pantógrafo: "PA", Freno: "FR", Compresor: "CP", Climatizador: "CL",
};
const prefijo = (c: string) => PREFIJO[c] ?? c.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();

/** Nº de serie de las unidades dadas de alta de cada configuración: las del Excel y, si tiene más, generadas a continuación. */
export function unidadesDe(configs: Configuracion[], estructuras: Estructura[]) {
  const usadas = new Set(DATOS.unidades.map((u) => u.serie));
  return configs
    .filter((c) => c.guardada && c.unidades && primerNivelCargado(c, estructuras.find((e) => e.id === c.estructuraId)?.raiz))
    .map((c, k) => {
      const delExcel = DATOS.configuraciones.find((x) => idConfig(x.flota, x.nombre) === c.id);
      const series = delExcel ? unidadesExcel(delExcel.flota, delExcel.nombre).map((u) => u.serie) : [];
      for (let n = (k + 1) * 1000 + 1 + series.length; series.length < (c.unidades ?? 0); n++) {
        const s = String(n % 10000).padStart(4, "0");
        if (!usadas.has(s)) { series.push(s); usadas.add(s); }
      }
      return { c, series: series.slice(0, c.unidades ?? 0) };
    });
}

export function generarActivos(flotas: Flota[], configs: Configuracion[], estructuras: Estructura[], almacenes: Almacen[]): Activo[] {
  const out: Activo[] = [];
  const delExcel = new Map(DATOS.activos.filter((a) => a.unidad).map((a) => [`${a.unidad}|${a.hueco}`, a]));
  unidadesDe(configs, estructuras).forEach(({ c, series }) => {
    const raiz = estructuras.find((e) => e.id === c.estructuraId)!.raiz;
    series.forEach((u) => {
      let k = 0;
      recorrer(raiz, (n, nivel) => {
        if (nivel === 1) return; // la propia unidad se identifica por su nº de serie
        k++;
        const hueco = rutaDe(raiz, n.id).join(SEP);
        const x = delExcel.get(`${u}|${hueco}`);
        const comun = { id: `${c.id}-${u}-${n.id}`, categoria: n.categoria, donde: "unidad" as const, flotaId: c.flotaId, configId: c.id, unidad: u, hueco };
        out.push(x
          ? { ...comun, serie: x.serie, km: x.km, ciclos: x.ciclos, horas: x.horas, gmao: x.gmao, tag: x.tag, generado: false }
          : { ...comun, serie: `${prefijo(n.categoria)}-${u}-${String(k).padStart(3, "0")}`, generado: true });
      });
    });
  });
  // Almacenes: los activos del Excel; si un almacén no tiene ninguno, repuestos generados
  const repuestos = ["Rueda", "Rueda", "Eje", "Bogie", "Motor Coche", "Motor Puerta", "Tarjeta Electrónica", "Pantógrafo", "Compresor", "Freno"];
  almacenes.forEach((a, i) => {
    const suyos = DATOS.activos.filter((x) => x.almacen && idAlmacen(x.almacen) === a.id);
    if (suyos.length) {
      suyos.forEach((x) => out.push({
        id: `${a.id}-${x.serie}`, serie: x.serie, categoria: x.categoria, donde: "almacen", almacenId: a.id, montadoEn: x.montadoEn || undefined,
        km: x.km, ciclos: x.ciclos, horas: x.horas, gmao: x.gmao, tag: x.tag, generado: false,
      }));
    } else {
      repuestos.forEach((cat, j) => {
        out.push({ id: `${a.id}-${j}`, serie: `${prefijo(cat)}-A${i + 1}-${String(j + 1).padStart(3, "0")}`, categoria: cat, donde: "almacen", almacenId: a.id, generado: true });
      });
    }
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
