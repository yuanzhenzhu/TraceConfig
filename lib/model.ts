// Modelo de dominio de Leadmind Trace (ver documentos/contexto/producto.md) y catálogos de ejemplo.
// Todos los datos de este archivo son FICTICIOS: la carpeta datos/ todavía está vacía.

export type Nodo = { id: string; categoria: string; nombre: string; hijos: Nodo[] };
/**
 * Estructura del catálogo común del cliente: la puede usar cualquier flota.
 * Cada estructura tiene sus propiedades de hueco (por hueco: propiedad -> valor, "" = sin valor).
 * `borradorDe` marca una estructura que se está creando dentro de un asistente aún sin guardar.
 */
export type Estructura = { id: string; nombre: string; descripcion: string; raiz: Nodo; propsHueco?: PropsHueco; actualizada?: string; borradorDe?: string };
export type PropsHueco = Record<string, Record<string, string>>;
/** Propiedades de categoría: un único juego para todo el cliente, que se aplica a todas las flotas. */
export type PropsCategoria = Record<string, PropAsignada[]>;

export type DriverId = "km" | "ciclos" | "horas";
export type Drivers = Record<string, Partial<Record<DriverId, boolean>>>; // por hueco (id del nodo de la estructura)
export type PropAsignada = { propId: string; historico: boolean };
export type EstadoPlantilla = "pendiente" | "cargada" | "errores";
/** Cálculo de media de un driver: primero el driver y después su forma de cálculo. "" = aún sin elegir. */
export type FormaMedia = "flota" | "flota-categoria" | "flota-categoria-posicion" | "linea" | "linea-categoria" | "linea-categoria-posicion";
export type CalculoMedia = { driver: DriverId | ""; forma: FormaMedia | "" };

export type EstadoConfig = "en-configuracion" | "activa";

/** Almacén del cliente (Configuración › Almacenes). Uso: para qué se utiliza; al menos uno. */
export type UsoAlmacen = "almacen" | "mantenimiento";
export const USOS_ALMACEN: { id: UsoAlmacen; nombre: string }[] = [
  { id: "almacen", nombre: "Almacén" },
  { id: "mantenimiento", nombre: "Mantenimiento" },
];
export type Almacen = { id: string; nombre: string; ubicacion: string; contacto: string; telefono: string; usos: UsoAlmacen[] };

export type Configuracion = {
  id: string;
  flotaId: string;
  nombre: string;
  descripcion: string;
  estructuraId: string | null; // referencia al catálogo común
  unidades: number | null;
  /** Drivers propios de esta configuración (flota + estructura): otra flota con la misma estructura puede tener otros. */
  drivers: DriversConfigEst | null;
  /** Valores de las propiedades de hueco que define su estructura (opcionales). Por hueco y propiedad. */
  valoresHueco?: PropsHueco;
  plantillas: Record<string, EstadoPlantilla>; // por categoría
  intentosPlantilla: Record<string, number>;
  pasosOmitidos: number[];
  pasoActual: number;
  pasoMax: number; // paso más avanzado al que se ha llegado
  estado: EstadoConfig;
  guardada: boolean; // se guarda al completar el paso Estructura y unidades
  unica: boolean; // la flota tiene una sola estructura: la configuración se llama como la flota
  /** (Prueba) La estructura se creó en Estructuras desde el asistente: queda fijada y no se puede elegir una existente. */
  estructuraNueva?: boolean;
  actualizada: string; // ISO
};

/** (Prueba) Datos básicos de cada configuración al crear la flota (dialog Nueva flota). */
export type FilaConfig = { nombre: string; descripcion: string; estructuraId: string | null; unidades: number | null };
export const filaVacia = (): FilaConfig => ({ nombre: "", descripcion: "", estructuraId: null, unidades: null });

/** Errores de las filas de varias estructuras (vacío si todo está bien). La estructura y las unidades se indican después, en el paso 1. */
export function erroresFilas(filas: FilaConfig[], nombresOcupados: string[] = []) {
  return filas.map((f, i) => {
    const nom = f.nombre.trim().toLowerCase();
    const repetido = !!nom && (nombresOcupados.includes(nom) || filas.some((g, j) => j !== i && g.nombre.trim().toLowerCase() === nom));
    return {
      nombre: !nom ? "Indica el nombre" : repetido ? "Nombre repetido" : "",
    };
  });
}

/** El SMS es de la flota: lo comparten todas sus configuraciones. */
export type Flota = {
  id: string; nombre: string; descripcion: string; usaSms: boolean;
};

/** Propiedades de categoría (por categoría) y de hueco (por hueco: propiedad -> valor, "" = sin valor). */
export type PropiedadesConfig = { propsCategoria: PropsCategoria; propsHueco: PropsHueco };

export const propiedadesVacias = (): PropiedadesConfig => ({ propsCategoria: {}, propsHueco: {} });

/** Qué drivers tiene cada hueco y en cuáles es heredable (su valor viene del padre). */
export type DriversConfig = { drivers: Drivers; heredables: Drivers };

/** Drivers de una configuración, con la estructura para la que se marcaron. */
export type DriversConfigEst = DriversConfig & { estructuraId: string };

export const DRIVERS: { id: DriverId; nombre: string; corto: string }[] = [
  { id: "km", nombre: "Kilometraje", corto: "Km" },
  { id: "ciclos", nombre: "Ciclos", corto: "Ciclos" },
  { id: "horas", nombre: "Horas", corto: "Horas" },
];

/** Catálogos del cliente, estructuras y líneas: vienen del Excel común (datos/datos.xlsx, ver lib/datos.ts). */
export { CATEGORIAS, PROPS_CATEGORIA, PROPS_HUECO, LINEAS, ESTRUCTURAS } from "./datos";
export type NivelMedia = "flota" | "linea";
/** Clave del cálculo de media guardado: "flota:<id>" o "linea:<id>". */
export const claveMedia = (nivel: NivelMedia, id: string) => `${nivel}:${id}`;

/** Formas de calcular la media de un driver: por flota o por línea, y en cada caso, también por categoría y por posición. */
export const FORMAS_MEDIA: { id: FormaMedia; nombre: string; desc: string; grupo: NivelMedia }[] = [
  { id: "flota", grupo: "flota", nombre: "Flota", desc: "Una media para toda la flota" },
  { id: "flota-categoria", grupo: "flota", nombre: "Flota y categoría", desc: "Una media por categoría en la flota, por ejemplo, todas las ruedas" },
  { id: "flota-categoria-posicion", grupo: "flota", nombre: "Flota, categoría y posición", desc: "Una media por categoría y posición en la flota, por ejemplo, la rueda 1 del eje 2" },
  { id: "linea", grupo: "linea", nombre: "Línea", desc: "Una media para toda la línea" },
  { id: "linea-categoria", grupo: "linea", nombre: "Línea y categoría", desc: "Una media por categoría en cada línea" },
  { id: "linea-categoria-posicion", grupo: "linea", nombre: "Línea, categoría y posición", desc: "Una media por categoría y posición en cada línea" },
];

/** Los cálculos de media están completos si todos tienen driver y forma de cálculo (o no hay ninguno). */
export const mediaCompleta = (lista: CalculoMedia[] | undefined) => (lista ?? []).every((x) => x.driver && x.forma);

/* ---------- Utilidades de árbol ---------- */
let seq = 0;
export const nuevoId = (p = "n") => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export function nodo(categoria: string, nombre: string, hijos: Nodo[] = [], id?: string): Nodo {
  return { id: id ?? nuevoId(), categoria, nombre, hijos };
}

export function recorrer(n: Nodo, fn: (n: Nodo, nivel: number, padre: Nodo | null) => void, nivel = 1, padre: Nodo | null = null) {
  fn(n, nivel, padre);
  n.hijos.forEach((h) => recorrer(h, fn, nivel + 1, n));
}

export function contarHuecos(n: Nodo): number {
  let c = 0; recorrer(n, () => c++); return c;
}

export function buscar(n: Nodo, id: string): Nodo | null {
  if (n.id === id) return n;
  for (const h of n.hijos) { const r = buscar(h, id); if (r) return r; }
  return null;
}

export function padreDe(raiz: Nodo, id: string): Nodo | null {
  let p: Nodo | null = null;
  recorrer(raiz, (n, _l, padre) => { if (n.id === id) p = padre; });
  return p;
}

export function rutaDe(raiz: Nodo, id: string): string[] {
  const camino: string[] = [];
  const ir = (n: Nodo): boolean => {
    camino.push(n.nombre);
    if (n.id === id) return true;
    for (const h of n.hijos) if (ir(h)) return true;
    camino.pop();
    return false;
  };
  ir(raiz);
  return camino.slice(1); // sin el tren
}

/** Copia profunda con ids nuevos (copiar/pegar y "partir de existente"). */
export function clonar(n: Nodo): Nodo {
  return { id: nuevoId(), categoria: n.categoria, nombre: n.nombre, hijos: n.hijos.map(clonar) };
}

export function mapear(n: Nodo, fn: (n: Nodo) => Nodo): Nodo {
  const r = fn(n);
  return { ...r, hijos: r.hijos.map((h) => mapear(h, fn)) };
}

export function quitar(raiz: Nodo, id: string): Nodo {
  return { ...raiz, hijos: raiz.hijos.filter((h) => h.id !== id).map((h) => quitar(h, id)) };
}

export function insertarHijo(raiz: Nodo, padreId: string, hijo: Nodo): Nodo {
  return mapear(raiz, (n) => (n.id === padreId ? { ...n, hijos: [...n.hijos, hijo] } : n));
}

/** Nombre siguiente para una categoría dentro de un padre: "Puerta 3". */
export function nombreSiguiente(padre: Nodo, categoria: string): string {
  const iguales = padre.hijos.filter((h) => h.categoria === categoria).length;
  const unicas = ["Motor Coche", "Motor Puerta", "Tarjeta Electrónica", "Motor Bogie", "Tren"];
  return unicas.includes(categoria) && iguales === 0 ? categoria : `${categoria} ${iguales + 1}`;
}

/** Categorías de la estructura con el nivel más alto en que aparecen y cuántos huecos tienen. */
export function categoriasDe(raiz: Nodo): { categoria: string; nivel: number; huecos: number }[] {
  const m = new Map<string, { nivel: number; huecos: number }>();
  recorrer(raiz, (n, nivel) => {
    const e = m.get(n.categoria);
    if (e) { e.huecos++; e.nivel = Math.min(e.nivel, nivel); } else m.set(n.categoria, { nivel, huecos: 1 });
  });
  return [...m.entries()].map(([categoria, v]) => ({ categoria, ...v })).sort((a, b) => a.nivel - b.nivel);
}

/* ---------- Drivers por defecto ---------- */
// Los drivers se marcan sobre la estructura entera de la unidad: se guardan por hueco (id del nodo).
/** Tener un driver y que sea heredable son cosas distintas. Por defecto, el km lo tienen todos los huecos. */
export function driversPorDefecto(raiz: Nodo): Drivers {
  const d: Drivers = {};
  recorrer(raiz, (n) => { d[n.id] = { km: true }; });
  return d;
}

/** Por defecto, el km es heredable en todos los huecos menos en la unidad (raíz), que no tiene padre del que heredar. */
export function heredablesPorDefecto(raiz: Nodo): Drivers {
  const d: Drivers = {};
  recorrer(raiz, (n, nivel) => { d[n.id] = { km: nivel > 1 }; });
  return d;
}

/** Valores por defecto de los drivers de una configuración. */
export const driversIniciales = (raiz: Nodo): DriversConfig => ({ drivers: driversPorDefecto(raiz), heredables: heredablesPorDefecto(raiz) });

/** Drivers que aplican a una configuración: los suyos o, si aún no tiene, los valores por defecto. */
export function driversEfectivos(d: DriversConfig | null | undefined, raiz: Nodo): DriversConfig {
  return d && Object.keys(d.drivers).length ? d : driversIniciales(raiz);
}

/** Adapta unos drivers a la estructura actual: los huecos nuevos tienen los drivers de su hueco padre y los heredan de él. */
export function sincronizarDrivers(d: DriversConfig, raiz: Nodo): DriversConfig {
  const drivers: Drivers = {};
  const heredables: Drivers = {};
  recorrer(raiz, (n, _l, padre) => {
    drivers[n.id] = d.drivers[n.id] ?? (padre ? { ...drivers[padre.id] } : {});
    heredables[n.id] = d.heredables?.[n.id] ?? (padre ? { ...drivers[padre.id] } : {});
  });
  return { drivers, heredables };
}

/* ---------- Estado derivado ---------- */
export function plantillasIniciales(raiz: Nodo): Record<string, EstadoPlantilla> {
  return Object.fromEntries(categoriasDe(raiz).map((c) => [c.categoria, "pendiente" as EstadoPlantilla]));
}

export function primerNivelCargado(c: Configuracion, raiz: Nodo | undefined): boolean {
  return !!raiz && c.plantillas[raiz.categoria] === "cargada";
}

/** Unidades con todos sus datos cargados (aproximación del prototipo). */
export function unidadesTerminadas(c: Configuracion, raiz: Nodo | undefined): number {
  if (!raiz || !c.unidades) return 0;
  const ps = Object.values(c.plantillas);
  if (ps.length && ps.every((p) => p === "cargada")) return c.unidades;
  if (c.estado === "activa") return 0; // un cambio de estructura dejó plantillas pendientes: todas sus unidades están incompletas
  if (!primerNivelCargado(c, raiz) || ps.length === 0) return 0;
  const cargadas = ps.filter((p) => p === "cargada").length;
  return Math.round((c.unidades * cargadas) / ps.length);
}

/** Sincroniza las plantillas de una configuración con la estructura actual (tras un cambio en el catálogo). */
export function sincronizarConEstructura(c: Configuracion, raiz: Nodo): Pick<Configuracion, "plantillas"> {
  const plantillas: Record<string, EstadoPlantilla> = {};
  categoriasDe(raiz).forEach(({ categoria }) => { plantillas[categoria] = c.plantillas[categoria] ?? "pendiente"; });
  return { plantillas };
}

/** Diferencia de huecos entre dos versiones de una estructura. */
export function diferencia(antes: Nodo, despues: Nodo) {
  const a = new Map<string, Nodo>(); recorrer(antes, (n) => a.set(n.id, n));
  const d = new Map<string, Nodo>(); recorrer(despues, (n) => d.set(n.id, n));
  return {
    anadidos: [...d.values()].filter((n) => !a.has(n.id)),
    eliminados: [...a.values()].filter((n) => !d.has(n.id)),
  };
}

export const PASOS = [
  { n: 1, titulo: "Estructura y unidades", obligatorio: true }, // (prueba) incluye el antiguo paso Unidades
  { n: 2, titulo: "Valores de propiedades de hueco", obligatorio: false }, // (prueba) las propiedades las define la estructura
  { n: 3, titulo: "Drivers", obligatorio: true },
  { n: 4, titulo: "Propiedades de categoría", obligatorio: false },
  { n: 7, titulo: "Carga de datos", obligatorio: true },
  { n: 8, titulo: "Resumen y finalizar", obligatorio: true },
];

export function fecha(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
