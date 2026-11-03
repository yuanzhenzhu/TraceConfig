// Modelo de dominio de Leadmind Trace (ver contexto/producto.md) y catálogos de ejemplo.
// Todos los datos de este archivo son FICTICIOS: la carpeta datos/ todavía está vacía.

export type Nodo = { id: string; categoria: string; nombre: string; hijos: Nodo[] };
/** Estructura del catálogo común del cliente. `borradorDe` marca una estructura que se está creando dentro de un asistente aún sin guardar. */
export type Estructura = { id: string; nombre: string; descripcion: string; raiz: Nodo; actualizada?: string; borradorDe?: string };

export type DriverId = "km" | "ciclos" | "horas";
export type Drivers = Record<string, Partial<Record<DriverId, boolean>>>; // por id de hueco
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
  drivers: Drivers;
  plantillas: Record<string, EstadoPlantilla>; // por categoría
  intentosPlantilla: Record<string, number>;
  pasosOmitidos: number[];
  pasoActual: number;
  pasoMax: number; // paso más avanzado al que se ha llegado
  estado: EstadoConfig;
  guardada: boolean; // se guarda al completar el paso Unidades
  actualizada: string; // ISO
};

/** Las propiedades y el SMS son de la flota: los comparten todas sus configuraciones. */
export type Flota = {
  id: string; codigo: string; nombre: string; descripcion: string; usaSms: boolean;
  propsCategoria: Record<string, PropAsignada[]>; // por categoría
  propsHueco: Record<string, Record<string, string>>; // hueco -> propiedad -> valor ("" = sin valor)
  sms: Sms | null;
};

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

/* ---------- Drivers por defecto ---------- */
/** Km marcado en todos los huecos y heredable, salvo en la unidad (raíz). */
export function driversPorDefecto(raiz: Nodo): Drivers {
  const d: Drivers = {};
  recorrer(raiz, (n, nivel) => { d[n.id] = { km: nivel > 1 }; });
  return d;
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

/** Sincroniza plantillas y drivers de una configuración con la estructura actual (tras un cambio en el catálogo). */
export function sincronizarConEstructura(c: Configuracion, raiz: Nodo): Pick<Configuracion, "plantillas" | "drivers"> {
  const plantillas: Record<string, EstadoPlantilla> = {};
  categoriasDe(raiz).forEach(({ categoria }) => { plantillas[categoria] = c.plantillas[categoria] ?? "pendiente"; });
  const drivers: Drivers = {};
  recorrer(raiz, (n, _l, padre) => {
    // Un hueco nuevo hereda los drivers de su padre
    drivers[n.id] = c.drivers[n.id] ?? (padre ? { ...drivers[padre.id] } : {});
  });
  return { plantillas, drivers };
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
  { n: 1, titulo: "Datos y estructura", obligatorio: true },
  { n: 2, titulo: "Unidades", obligatorio: true },
  { n: 3, titulo: "Drivers", obligatorio: false },
  { n: 4, titulo: "Propiedades de categoría", obligatorio: false },
  { n: 5, titulo: "Propiedades de hueco", obligatorio: false },
  { n: 6, titulo: "Cálculos en SMS", obligatorio: false },
  { n: 7, titulo: "Carga de datos", obligatorio: true },
  { n: 8, titulo: "Resumen y finalizar", obligatorio: true },
];

export function fecha(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
