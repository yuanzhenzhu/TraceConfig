// Modelo de dominio de Leadmind Trace (ver contexto/producto.md) y catálogos de ejemplo.
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
export type Drivers = Record<string, Partial<Record<DriverId, boolean>>>; // por categoría
export type PropAsignada = { propId: string; historico: boolean };
export type EstadoPlantilla = "pendiente" | "cargada" | "errores";
export type Sms = { ambito: "flota" | "linea"; driver: DriverId; calculo: string };

export type EstadoConfig = "en-configuracion" | "activa";

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
  sms: Sms | null;
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

export const CATEGORIAS = [
  "Tren", "Coche", "Motor Coche", "Puerta", "Motor Puerta", "Tarjeta Electrónica",
  "Bogie", "Motor Bogie", "Eje", "Rueda", "Pantógrafo", "Freno", "Compresor", "Climatizador",
];

export const PROPS_CATEGORIA: { id: string; nombre: string; tipo: string }[] = [
  { id: "fabricante", nombre: "Fabricante", tipo: "Texto" },
  { id: "modelo", nombre: "Modelo", tipo: "Texto" },
  { id: "serie-fab", nombre: "Nº de serie de fabricante", tipo: "Texto" },
  { id: "fecha-fab", nombre: "Fecha de fabricación", tipo: "Fecha" },
  { id: "garantia", nombre: "Fin de garantía", tipo: "Fecha" },
  { id: "peso", nombre: "Peso (kg)", tipo: "Número" },
  { id: "diametro", nombre: "Diámetro (mm)", tipo: "Número" },
  { id: "pestana", nombre: "Espesor de pestaña (mm)", tipo: "Número" },
  { id: "firmware", nombre: "Versión de firmware", tipo: "Texto" },
  { id: "potencia", nombre: "Potencia (kW)", tipo: "Número" },
  { id: "tension", nombre: "Tensión nominal (V)", tipo: "Número" },
  { id: "lote", nombre: "Lote", tipo: "Texto" },
];

export const PROPS_HUECO: { id: string; nombre: string; tipo: string; ejemplo: string }[] = [
  { id: "lado", nombre: "Lado", tipo: "Lista", ejemplo: "Izquierdo" },
  { id: "codigo-pos", nombre: "Código de posición", tipo: "Texto", ejemplo: "C1-B1-E2-R1" },
  { id: "par-apriete", nombre: "Par de apriete (Nm)", tipo: "Número", ejemplo: "450" },
  { id: "orientacion", nombre: "Orientación", tipo: "Lista", ejemplo: "Sentido de la marcha" },
  { id: "plano", nombre: "Referencia de plano", tipo: "Texto", ejemplo: "PL-2231-04" },
];

export const FORMAS_CALCULO = [
  { id: "real", nombre: "Valor real", desc: "Usa los valores registrados del driver" },
  { id: "media", nombre: "Media diaria", desc: "Estima con la media diaria de la flota o línea" },
  { id: "planificado", nombre: "Planificado", desc: "Usa el valor previsto en el plan de servicio" },
];

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

/**
 * Árbol de categorías de una estructura: cada categoría aparece una vez, colgando de la categoría de su padre.
 * Los drivers se marcan por categoría, así que se editan sobre este árbol. El id de cada nodo es el nombre de la categoría.
 */
export function arbolCategorias(raiz: Nodo): Nodo {
  const nodos = new Map<string, Nodo>();
  const top: Nodo = { id: raiz.categoria, categoria: raiz.categoria, nombre: raiz.categoria, hijos: [] };
  nodos.set(raiz.categoria, top);
  recorrer(raiz, (n, _l, padre) => {
    if (!padre || nodos.has(n.categoria)) return;
    const nuevo: Nodo = { id: n.categoria, categoria: n.categoria, nombre: n.categoria, hijos: [] };
    nodos.set(n.categoria, nuevo);
    nodos.get(padre.categoria)?.hijos.push(nuevo);
  });
  return top;
}

/* ---------- Drivers por defecto ---------- */
// Los drivers dependen de la categoría: se guardan por nombre de categoría.
/** Tener un driver y que sea heredable son cosas distintas. Por defecto, el km lo tienen todas las categorías. */
export function driversPorDefecto(raiz: Nodo): Drivers {
  const d: Drivers = {};
  recorrer(arbolCategorias(raiz), (n) => { d[n.id] = { km: true }; });
  return d;
}

/** Por defecto, el km es heredable en todas las categorías menos en la unidad (raíz), que no tiene padre del que heredar. */
export function heredablesPorDefecto(raiz: Nodo): Drivers {
  const d: Drivers = {};
  recorrer(arbolCategorias(raiz), (n, nivel) => { d[n.id] = { km: nivel > 1 }; });
  return d;
}

/** Valores por defecto de los drivers de una configuración. */
export const driversIniciales = (raiz: Nodo): DriversConfig => ({ drivers: driversPorDefecto(raiz), heredables: heredablesPorDefecto(raiz) });

/** Drivers que aplican a una configuración: los suyos o, si aún no tiene, los valores por defecto. */
export function driversEfectivos(d: DriversConfig | null | undefined, raiz: Nodo): DriversConfig {
  return d && Object.keys(d.drivers).length ? d : driversIniciales(raiz);
}

/** Adapta unos drivers a la estructura actual: las categorías nuevas tienen los drivers de su categoría padre y los heredan de ella. */
export function sincronizarDrivers(d: DriversConfig, raiz: Nodo): DriversConfig {
  const drivers: Drivers = {};
  const heredables: Drivers = {};
  recorrer(arbolCategorias(raiz), (n, _l, padre) => {
    drivers[n.id] = d.drivers[n.id] ?? (padre ? { ...drivers[padre.id] } : {});
    heredables[n.id] = d.heredables?.[n.id] ?? (padre ? { ...drivers[padre.id] } : {});
  });
  return { drivers, heredables };
}

/* ---------- Estructuras existentes (ficticias) ---------- */
function coche(i: number, puertas = 2, bogies = 2): Nodo {
  const p = `c${i}`;
  return nodo("Coche", `Coche ${i}`, [
    nodo("Motor Coche", "Motor Coche", [], `${p}-mc`),
    ...Array.from({ length: puertas }, (_, k) =>
      nodo("Puerta", `Puerta ${k + 1}`, [
        nodo("Motor Puerta", "Motor Puerta", [], `${p}-p${k + 1}-m`),
        nodo("Tarjeta Electrónica", "Tarjeta Electrónica", [], `${p}-p${k + 1}-t`),
      ], `${p}-p${k + 1}`)),
    ...Array.from({ length: bogies }, (_, b) =>
      nodo("Bogie", `Bogie ${b + 1}`, [
        nodo("Motor Bogie", "Motor Bogie", [], `${p}-b${b + 1}-m`),
        ...[1, 2].map((e) =>
          nodo("Eje", `Eje ${e}`, [
            nodo("Rueda", "Rueda 1", [], `${p}-b${b + 1}-e${e}-r1`),
            nodo("Rueda", "Rueda 2", [], `${p}-b${b + 1}-e${e}-r2`),
          ], `${p}-b${b + 1}-e${e}`)),
      ], `${p}-b${b + 1}`)),
  ], p);
}

export const ESTRUCTURAS: Estructura[] = [
  {
    id: "est-1", nombre: "Estructura 1", descripcion: "Tren de 3 coches, 2 puertas y 2 bogies por coche",
    raiz: nodo("Tren", "Tren", [coche(1), coche(2), coche(3)], "e1-tren"),
  },
  {
    id: "est-2", nombre: "Estructura 2", descripcion: "Tren de 2 coches, 3 puertas y 2 bogies por coche",
    raiz: nodo("Tren", "Tren", [coche(1, 3), coche(2, 3)], "e2-tren"),
  },
  {
    id: "est-3", nombre: "Estructura 3", descripcion: "Tren de 4 coches, 2 puertas y 2 bogies por coche",
    raiz: nodo("Tren", "Tren", [coche(1), coche(2), coche(3), coche(4)], "e3-tren"),
  },
];

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
  { n: 6, titulo: "Cálculos en SMS", obligatorio: false },
  { n: 7, titulo: "Carga de datos", obligatorio: true },
  { n: 8, titulo: "Resumen y finalizar", obligatorio: true },
];

export function fecha(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
