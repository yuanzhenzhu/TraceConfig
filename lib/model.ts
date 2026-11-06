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
  /** Cálculo de media de sus drivers (Configuración › Drivers; no está en el alta). Como los drivers, es de esta configuración. Opcional. */
  media?: CalculoMedia[];
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

/** Categorías del cliente (30). Las 14 primeras son las de las estructuras de ejemplo; el resto, de la lista del cliente. */
export const CATEGORIAS = [
  "Tren", "Coche", "Motor Coche", "Puerta", "Motor Puerta", "Tarjeta Electrónica",
  "Bogie", "Motor Bogie", "Eje", "Rueda", "Pantógrafo", "Freno", "Compresor", "Climatizador",
  "ACR Box", "Breaker", "Cabin HVAC", "Cabin HVAC compresor", "Caliper Brake Trailer", "Caliper Motor Brake",
  "Caliper spiral", "Condenser fan motor H", "Condenser fan motor P", "Electromagnetic Roller", "Engine",
  "Gearbox", "HPU", "Impulse motor fan HVAC", "Pantograph motor", "SIV",
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
  // De la lista del cliente (los tipos son una suposición)
  { id: "amortization-date", nombre: "Amortization date", tipo: "Fecha" },
  { id: "aurawheel-id", nombre: "AURAwheel Id", tipo: "Texto" },
  { id: "attr-cyc", nombre: "attr.cyc", tipo: "Número" },
  { id: "attr-gmao-part-code", nombre: "attr.gmao_part_code", tipo: "Texto" },
  { id: "attr-hrs", nombre: "attr.hrs", tipo: "Número" },
  { id: "attr-kms", nombre: "attr.kms", tipo: "Número" },
  { id: "attr-sms-start-date", nombre: "attr.sms_start_date", tipo: "Fecha" },
  { id: "charge-dock", nombre: "Charge dock", tipo: "Texto" },
  { id: "client", nombre: "Client", tipo: "Texto" },
  { id: "functionality", nombre: "Functionality", tipo: "Texto" },
  { id: "hard-drive", nombre: "Hard drive", tipo: "Texto" },
  { id: "host", nombre: "Host", tipo: "Texto" },
  { id: "keyholder-code", nombre: "Keyholder code", tipo: "Texto" },
  { id: "last-calibration", nombre: "Last calibration", tipo: "Fecha" },
  { id: "lubricant", nombre: "Lubricant", tipo: "Texto" },
  { id: "lubrication-date", nombre: "Lubrication date", tipo: "Fecha" },
  { id: "lubrication-km", nombre: "Lubrication km", tipo: "Número" },
  { id: "material", nombre: "Material", tipo: "Texto" },
  { id: "measuring-point", nombre: "Measuring point (mm)", tipo: "Número" },
  { id: "nem-warranty-start", nombre: "NEM warranty start date", tipo: "Fecha" },
  { id: "oh-date", nombre: "OH date", tipo: "Fecha" },
  { id: "oh-km", nombre: "OH km", tipo: "Número" },
  { id: "person-responsible", nombre: "Person responsible", tipo: "Texto" },
  { id: "provider-warranty-start", nombre: "Provider warranty start date", tipo: "Fecha" },
  { id: "qr-mm", nombre: "qR (mm)", tipo: "Número" },
  { id: "repair-sn", nombre: "Repair SN", tipo: "Texto" },
  { id: "riftek-sn", nombre: "Riftek SN", tipo: "Texto" },
  { id: "sap-mileage", nombre: "SAP Mileage", tipo: "Número" },
  { id: "sd-mm", nombre: "Sd (mm)", tipo: "Número" },
  { id: "sh-mm", nombre: "Sh (mm)", tipo: "Número" },
];

/** Propiedades de hueco del cliente. Los códigos son los reales; el tipo y el ejemplo de cada una son ficticios. */
export const PROPS_HUECO: { id: string; nombre: string; tipo: string; ejemplo: string }[] = [
  { id: "LOCATION", nombre: "LOCATION", tipo: "Texto", ejemplo: "C1-B1-E2-R1" },
  { id: "VISIBILITY", nombre: "VISIBILITY", tipo: "Lista", ejemplo: "Visible" },
  { id: "CAF-CODE", nombre: "CAF-CODE", tipo: "Texto", ejemplo: "CAF-30411" },
  { id: "AUX_POSITION", nombre: "AUX_POSITION", tipo: "Texto", ejemplo: "Lado izquierdo" },
  { id: "LABEL", nombre: "LABEL", tipo: "Texto", ejemplo: "Rueda delantera" },
  { id: "VAR_KMS", nombre: "VAR_KMS", tipo: "Número", ejemplo: "1,02" },
  { id: "VAR_CYC", nombre: "VAR_CYC", tipo: "Número", ejemplo: "1,00" },
  { id: "VAR_HRS", nombre: "VAR_HRS", tipo: "Número", ejemplo: "0,95" },
  { id: "CT_GMAO", nombre: "CT_GMAO", tipo: "Texto", ejemplo: "GM-1001-C1" },
  { id: "KNUCKLE", nombre: "KNUCKLE", tipo: "Texto", ejemplo: "K-04" },
];

/** Formas de calcular la media de un driver: por flota o por línea, y en cada caso, también por categoría y por posición. */
export const FORMAS_MEDIA: { id: FormaMedia; nombre: string; desc: string; grupo: "flota" | "linea" }[] = [
  { id: "flota", grupo: "flota", nombre: "Flota", desc: "Una media para toda la flota" },
  { id: "flota-categoria", grupo: "flota", nombre: "Flota y categoría", desc: "Una media por categoría en la flota, por ejemplo, todas las ruedas" },
  { id: "flota-categoria-posicion", grupo: "flota", nombre: "Flota, categoría y posición", desc: "Una media por categoría y posición en la flota, por ejemplo, la rueda 1 del eje 2" },
  { id: "linea", grupo: "linea", nombre: "Línea", desc: "Una media por cada línea en la que opera la flota" },
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
  { n: 7, titulo: "Carga de datos", obligatorio: true },
  { n: 8, titulo: "Resumen y finalizar", obligatorio: true },
];

export function fecha(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
