"use client";

// Estado del prototipo: vive en el navegador (localStorage) y se puede restablecer.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CATEGORIAS, ESTRUCTURAS, LINEAS, categoriasDe, claveMedia, driversIniciales, nuevoId, plantillasIniciales, recorrer, sincronizarConEstructura, sincronizarDrivers,
  type Almacen, type CalculoMedia, type Configuracion, type Estructura, type Flota, type PropsCategoria,
} from "./model";
import { ALMACENES, DATOS, PROPS_POR_CATEGORIA, idConfig, idEstructura, idFlota } from "./datos";

/** Datos del cliente: catálogo de estructuras (con sus propiedades de hueco), propiedades de categoría únicas y flotas. */
type Estado = { flotas: Flota[]; configs: Configuracion[]; estructuras: Estructura[]; propsCategoria: PropsCategoria; almacenes: Almacen[]; media: Record<string, CalculoMedia[]> };
// Cambia con el Excel: al editar datos/datos.xlsx, el prototipo vuelve a sus datos.
const CLAVE = `lm-trace-prototipo-v28-${DATOS.version}`;

function base(flotaId: string, extra: Partial<Configuracion>): Configuracion {
  return {
    id: nuevoId("cfg"), flotaId, nombre: "", descripcion: "", estructuraId: null, unidades: null,
    drivers: null, plantillas: {}, intentosPlantilla: {},
    pasosOmitidos: [], pasoActual: 1, pasoMax: 1, estado: "en-configuracion", guardada: false, unica: false,
    actualizada: new Date().toISOString(), ...extra,
    ...(extra.pasoActual && !extra.pasoMax ? { pasoMax: extra.pasoActual } : {}),
  };
}

const flota = (f: Flota): Flota => f;

function semilla(): Estado {
  // Punto de partida: el Excel común (datos/datos.xlsx). Flotas, estructuras, propiedades, configuraciones y almacenes vienen de ahí.
  // Lo que se configura dentro del prototipo (drivers por hueco, cálculo de media, avance del asistente) se fija aquí.
  const estructuras = ESTRUCTURAS.map((e) => ({ ...e, raiz: clonarConIds(e.raiz) }));
  const flotas: Flota[] = DATOS.flotas.map((f) => flota({ id: idFlota(f.nombre), nombre: f.nombre, descripcion: f.descripcion, usaSms: true }));
  const estDe = (nombre: string) => estructuras.find((e) => e.id === idEstructura(nombre))!;
  const todas = (raiz: Estructura["raiz"]) => Object.fromEntries(categoriasDe(raiz).map((c) => [c.categoria, "cargada" as const]));
  const configs: Configuracion[] = DATOS.configuraciones.map((x, i) => {
    const e = estDe(x.estructura);
    const activa = x.estado === "Activa";
    return base(idFlota(x.flota), {
      id: idConfig(x.flota, x.nombre), nombre: x.nombre, descripcion: x.descripcion, unica: !x.nombre,
      estructuraId: e.id, unidades: x.unidades, guardada: true,
      drivers: { ...driversIniciales(e.raiz), estructuraId: e.id },
      plantillas: activa ? todas(e.raiz) : { ...plantillasIniciales(e.raiz), [e.raiz.categoria]: "cargada" },
      pasoActual: activa ? 8 : 3, estado: activa ? "activa" : "en-configuracion",
      actualizada: new Date(Date.UTC(2026, 5 + (i % 5), 2 + i * 3, 9)).toISOString(),
    });
  });

  // Ejemplos de prototipo sobre los datos del Excel (solo si existen con esos nombres)
  const cfg = (flota: string, nombre: string) => configs.find((c) => c.id === idConfig(flota, nombre));
  const serieA = cfg("Metro Línea 1", "Serie A");
  const e1 = serieA && estructuras.find((e) => e.id === serieA.estructuraId);
  if (serieA && e1) { // valores de LOCATION en los coches
    const v: Record<string, Record<string, string>> = {};
    recorrer(e1.raiz, (n) => { if (e1.propsHueco?.[n.id]?.LOCATION !== undefined) v[n.id] = { LOCATION: `ML1-${n.nombre.replace("Coche ", "C")}` }; });
    serieA.valoresHueco = v;
  }
  const serieB = cfg("Metro Línea 1", "Serie B");
  const e2 = serieB && estructuras.find((e) => e.id === serieB.estructuraId);
  if (serieB && e2) { // asistente a medias: ciclos en las puertas, plantillas en parte cargadas y una con errores
    const conCiclos = driversIniciales(e2.raiz);
    recorrer(e2.raiz, (n) => {
      if (n.categoria !== "Puerta") return;
      conCiclos.drivers[n.id] = { ...conCiclos.drivers[n.id], ciclos: true };
      n.hijos.forEach((hija) => recorrer(hija, (x) => {
        conCiclos.drivers[x.id] = { ...conCiclos.drivers[x.id], ciclos: true };
        conCiclos.heredables[x.id] = { ...conCiclos.heredables[x.id], ciclos: true };
      }));
    });
    const parcial = plantillasIniciales(e2.raiz);
    ["Tren", "Coche", "Puerta"].forEach((c) => { if (c in parcial) parcial[c] = "cargada"; });
    if ("Rueda" in parcial) parcial["Rueda"] = "errores";
    Object.assign(serieB, { drivers: { ...conCiclos, estructuraId: e2.id }, plantillas: parcial, intentosPlantilla: { Rueda: 1 }, pasoActual: 7, pasoMax: 7 });
  }

  const media: Record<string, CalculoMedia[]> = {};
  const mediaFlota = (nombre: string, l: CalculoMedia[]) => { if (flotas.some((f) => f.nombre === nombre)) media[claveMedia("flota", idFlota(nombre))] = l; };
  const cat = (c: string) => (CATEGORIAS.includes(c) ? c : CATEGORIAS[0]);
  mediaFlota("Metro Línea 1", [{ driver: "km", forma: "flota", periodo: 180 }, { driver: "ciclos", forma: "flota-categoria", periodo: 180, categoria: cat("Puerta") }, { driver: "ciclos", forma: "flota-categoria-posicion", periodo: 180, categoria: cat("Motor Puerta") }]);
  mediaFlota("Tranvía Norte", [{ driver: "km", forma: "flota", periodo: 90 }]);
  if (LINEAS[0]) media[claveMedia("linea", LINEAS[0].id)] = [{ driver: "km", forma: "linea", periodo: 180 }, { driver: "horas", forma: "linea-categoria-posicion", periodo: 180, categoria: cat("Rueda") }];

  return { flotas, configs, estructuras, propsCategoria: structuredClone(PROPS_POR_CATEGORIA), almacenes: structuredClone(ALMACENES), media };
}

/** Copia del árbol de una estructura del Excel (mismos ids) para que el estado no comparta objetos con el catálogo. */
function clonarConIds(n: Estructura["raiz"]): Estructura["raiz"] {
  return { ...n, hijos: n.hijos.map(clonarConIds) };
}

type Api = {
  listo: boolean;
  flotas: Flota[];
  configs: Configuracion[];
  estructuras: Estructura[]; // sin borradores de asistentes
  propsCategoria: PropsCategoria; // únicas para todo el cliente
  estructura: (id: string | null | undefined) => Estructura | undefined;
  /** Cómo se nombra una configuración fuera de su flota: «Flota · Configuración», o solo la flota si tiene una sola estructura. */
  etiqueta: (c: Configuracion) => string;
  usosDe: (estructuraId: string) => Configuracion[];
  crearFlota: (f: Pick<Flota, "nombre" | "descripcion">) => Flota;
  actualizarFlota: (id: string, cambios: Partial<Flota>) => void;
  iniciarConfig: (flotaId: string) => string;
  actualizarConfig: (id: string, cambios: Partial<Configuracion>) => void;
  descartarConfig: (id: string) => void;
  guardarEstructura: (e: Estructura) => void; // crea o modifica; propaga el cambio a las configuraciones que la usan
  eliminarEstructura: (id: string) => void;
  guardarPropsCategoria: (p: PropsCategoria) => void; // afecta a todas las flotas
  almacenes: Almacen[];
  guardarAlmacen: (a: Almacen) => void; // crea o modifica
  eliminarAlmacen: (id: string) => void;
  media: Record<string, CalculoMedia[]>; // cálculo de media por flota o por línea (clave de claveMedia)
  guardarMedia: (clave: string, m: CalculoMedia[]) => void;
  restablecer: () => void;
};

const Ctx = createContext<Api | null>(null);
export const useStore = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore fuera de StoreProvider");
  return c;
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ flotas: [], configs: [], estructuras: [], propsCategoria: {}, almacenes: [], media: {} });
  const [listo, setListo] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CLAVE);
      setEstado(raw ? JSON.parse(raw) : semilla());
    } catch {
      setEstado(semilla());
    }
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch { /* sin almacenamiento: el prototipo sigue funcionando */ }
  }, [estado, listo]);

  const crearFlota = useCallback((f: Pick<Flota, "nombre" | "descripcion">) => {
    const nueva = flota({ ...f, id: nuevoId("flota"), usaSms: true }); // de momento, en el prototipo todas las flotas usan SMS
    setEstado((s) => ({ ...s, flotas: [...s.flotas, nueva] }));
    return nueva;
  }, []);

  const actualizarFlota = useCallback((id: string, cambios: Partial<Flota>) => {
    setEstado((s) => ({ ...s, flotas: s.flotas.map((f) => (f.id === id ? { ...f, ...cambios } : f)) }));
  }, []);

  const iniciarConfig = useCallback((flotaId: string) => {
    const c = base(flotaId, {});
    setEstado((s) => ({ ...s, configs: [...s.configs, c] }));
    return c.id;
  }, []);

  const actualizarConfig = useCallback((id: string, cambios: Partial<Configuracion>) => {
    setEstado((s) => {
      const configs = s.configs.map((c) => (c.id === id ? { ...c, ...cambios, actualizada: new Date().toISOString() } : c));
      // Al guardarse la configuración, su estructura nueva deja de ser borrador y pasa al catálogo.
      const estructuras = cambios.guardada
        ? s.estructuras.map((e) => (e.borradorDe === id ? { ...e, borradorDe: undefined } : e))
        : s.estructuras;
      return { ...s, configs, estructuras };
    });
  }, []);

  const descartarConfig = useCallback((id: string) => {
    setEstado((s) => ({
      ...s,
      configs: s.configs.filter((c) => c.id !== id),
      estructuras: s.estructuras.filter((e) => e.borradorDe !== id),
    }));
  }, []);

  const guardarEstructura = useCallback((e: Estructura) => {
    setEstado((s) => {
      const existe = s.estructuras.some((x) => x.id === e.id);
      const nueva = { ...e, actualizada: new Date().toISOString() };
      const estructuras = existe ? s.estructuras.map((x) => (x.id === e.id ? nueva : x)) : [...s.estructuras, nueva];
      // Las configuraciones que la usan se adaptan: plantillas y drivers (las categorías nuevas tienen y heredan los drivers de su padre).
      const configs = s.configs.map((c) => (c.estructuraId === e.id ? {
        ...c, ...sincronizarConEstructura(c, e.raiz),
        drivers: c.drivers ? { ...sincronizarDrivers(c.drivers, e.raiz), estructuraId: e.id } : c.drivers,
      } : c));
      return { ...s, estructuras, configs };
    });
  }, []);

  const eliminarEstructura = useCallback((id: string) => {
    setEstado((s) => ({ ...s, estructuras: s.estructuras.filter((e) => e.id !== id) }));
  }, []);

  const guardarPropsCategoria = useCallback((propsCategoria: PropsCategoria) => {
    setEstado((s) => ({ ...s, propsCategoria }));
  }, []);

  const guardarAlmacen = useCallback((a: Almacen) => {
    setEstado((s) => ({ ...s, almacenes: s.almacenes.some((x) => x.id === a.id) ? s.almacenes.map((x) => (x.id === a.id ? a : x)) : [...s.almacenes, a] }));
  }, []);
  const guardarMedia = useCallback((clave: string, m: CalculoMedia[]) => {
    setEstado((s) => ({ ...s, media: { ...s.media, [clave]: m } }));
  }, []);
  const eliminarAlmacen = useCallback((id: string) => {
    setEstado((s) => ({ ...s, almacenes: s.almacenes.filter((x) => x.id !== id) }));
  }, []);

  const restablecer = useCallback(() => setEstado(semilla()), []);

  // Si la flota tiene una sola estructura, su configuración se llama como la flota.
  const configs = useMemo(() => estado.configs.map((c) => (c.unica ? { ...c, nombre: estado.flotas.find((f) => f.id === c.flotaId)?.nombre ?? "", descripcion: "" } : c)), [estado.configs, estado.flotas]);

  const api = useMemo<Api>(() => ({
    listo, flotas: estado.flotas, configs, propsCategoria: estado.propsCategoria, almacenes: estado.almacenes ?? [], media: estado.media ?? {}, guardarMedia,
    guardarAlmacen, eliminarAlmacen,
    estructuras: estado.estructuras.filter((e) => !e.borradorDe),
    estructura: (id) => estado.estructuras.find((e) => e.id === id),
    etiqueta: (c) => { const f = estado.flotas.find((x) => x.id === c.flotaId)?.nombre ?? ""; return c.unica ? f : `${f} · ${c.nombre}`; },
    usosDe: (eid) => configs.filter((c) => c.guardada && c.estructuraId === eid),
    crearFlota, actualizarFlota, iniciarConfig, actualizarConfig, descartarConfig,
    guardarEstructura, eliminarEstructura, guardarPropsCategoria, restablecer,
  }), [listo, estado, configs, crearFlota, actualizarFlota, iniciarConfig, actualizarConfig, descartarConfig, guardarEstructura, eliminarEstructura, guardarPropsCategoria, guardarAlmacen, eliminarAlmacen, guardarMedia, restablecer]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
