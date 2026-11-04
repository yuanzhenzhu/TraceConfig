"use client";

// Estado del prototipo: vive en el navegador (localStorage) y se puede restablecer.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ESTRUCTURAS, categoriasDe, driversIniciales, nombreLibre, nuevoId, propiedadesVacias, plantillasIniciales, recorrer, sincronizarConEstructura, sincronizarDrivers,
  type Configuracion, type Estructura, type Flota, type PerfilDrivers, type PerfilPropiedades,
} from "./model";

type Estado = { flotas: Flota[]; configs: Configuracion[]; estructuras: Estructura[]; perfiles: PerfilDrivers[]; perfilesProps: PerfilPropiedades[] };
const CLAVE = "lm-trace-prototipo-v9c";

/**
 * Cada estructura del catálogo tiene siempre su perfil por defecto («Estándar · <estructura>») de drivers,
 * de propiedades de categoría y de propiedades de hueco. Se crean solos al dar de alta la estructura
 * y desaparecen con ella. Devuelve el mismo estado si no falta nada.
 */
function conPerfilesPorDefecto(s: Estado): Estado {
  const vivas = s.estructuras.filter((e) => !e.borradorDe);
  const ids = new Set(s.estructuras.map((e) => e.id));
  let perfiles = s.perfiles.filter((p) => !p.porDefecto || ids.has(p.estructuraId));
  let perfilesProps = s.perfilesProps.filter((p) => !p.porDefecto || ids.has(p.estructuraId));
  let cambio = perfiles.length !== s.perfiles.length || perfilesProps.length !== s.perfilesProps.length;
  for (const e of vivas) {
    if (!perfiles.some((p) => p.porDefecto && p.estructuraId === e.id)) {
      perfiles = [...perfiles, {
        id: nuevoId("drv"), nombre: nombreLibre(`Estándar · ${e.nombre}`, perfiles), estructuraId: e.id, porDefecto: true,
        descripcion: "Perfil por defecto: kilometraje en todo, heredable salvo la unidad", ...driversIniciales(e.raiz), actualizada: new Date().toISOString(),
      }];
      cambio = true;
    }
    for (const tipo of ["categoria", "hueco"] as const) {
      if (!perfilesProps.some((p) => p.porDefecto && p.tipo === tipo && p.estructuraId === e.id)) {
        perfilesProps = [...perfilesProps, {
          id: nuevoId(tipo === "categoria" ? "pc" : "ph"), tipo, nombre: nombreLibre(`Estándar · ${e.nombre}`, perfilesProps.filter((p) => p.tipo === tipo)),
          estructuraId: e.id, porDefecto: true, descripcion: "Perfil por defecto de la estructura", ...propiedadesVacias(), actualizada: new Date().toISOString(),
        }];
        cambio = true;
      }
    }
  }
  return cambio ? { ...s, perfiles, perfilesProps } : s;
}

function base(flotaId: string, extra: Partial<Configuracion>): Configuracion {
  return {
    id: nuevoId("cfg"), flotaId, nombre: "", descripcion: "", estructuraId: null, unidades: null,
    perfilDriversId: null, perfilPropsCategoriaId: null, perfilPropsHuecoId: null, plantillas: {}, intentosPlantilla: {},
    pasosOmitidos: [], pasoActual: 1, pasoMax: 1, estado: "en-configuracion", guardada: false, unica: false,
    actualizada: new Date().toISOString(), ...extra,
    ...(extra.pasoActual && !extra.pasoMax ? { pasoMax: extra.pasoActual } : {}),
  };
}

const flota = (f: Omit<Flota, "sms"> & Partial<Flota>): Flota => ({ sms: null, ...f });

function semilla(): Estado {
  const estructuras = ESTRUCTURAS.map((e) => ({ ...e, actualizada: "2026-05-20T08:00:00Z" }));
  const [e1, e2, e3] = estructuras;
  const todas = (raiz: typeof e1.raiz) => Object.fromEntries(categoriasDe(raiz).map((c) => [c.categoria, "cargada" as const]));

  // Perfil con ciclos en las puertas: la categoría Puerta tiene ciclos y sus categorías hijas lo heredan de ella.
  const conCiclos = driversIniciales(e2.raiz);
  conCiclos.drivers["Puerta"] = { ...conCiclos.drivers["Puerta"], ciclos: true };
  for (const hija of ["Motor Puerta", "Tarjeta Electrónica"]) {
    conCiclos.drivers[hija] = { ...conCiclos.drivers[hija], ciclos: true };
    conCiclos.heredables[hija] = { ...conCiclos.heredables[hija], ciclos: true };
  }
  const fecha = "2026-05-22T08:00:00Z";
  const perfiles: PerfilDrivers[] = [
    { id: "drv-1", nombre: "Estándar · Estructura 1", porDefecto: true, descripcion: "Perfil por defecto: kilometraje en todo, heredable salvo la unidad", estructuraId: e1.id, ...driversIniciales(e1.raiz), actualizada: fecha },
    { id: "drv-2", nombre: "Km y ciclos de puertas · Estructura 2", descripcion: "Kilometraje en todo y ciclos en las puertas", estructuraId: e2.id, ...conCiclos, actualizada: fecha },
    { id: "drv-3", nombre: "Estándar · Estructura 3", porDefecto: true, descripcion: "Perfil por defecto: kilometraje en todo, heredable salvo la unidad", estructuraId: e3.id, ...driversIniciales(e3.raiz), actualizada: fecha },
  ];

  const flotas: Flota[] = [
    flota({
      id: "f1000", nombre: "Metro Línea 1", descripcion: "Flota de metro de la línea 1", usaSms: true,
      sms: { ambito: "flota", driver: "km", calculo: "real" },
    }),
    flota({ id: "f2000", nombre: "Tranvía Norte", descripcion: "Tranvía de la red norte", usaSms: false }),
    flota({ id: "f3000", nombre: "Cercanías Sur", descripcion: "Cercanías del corredor sur", usaSms: true }),
  ];
  const parcial = plantillasIniciales(e2.raiz);
  parcial["Tren"] = "cargada"; parcial["Coche"] = "cargada"; parcial["Puerta"] = "cargada"; parcial["Rueda"] = "errores";
  const configs: Configuracion[] = [
    base("f1000", {
      id: "cfg-serie-a", nombre: "Serie A", descripcion: "", estructuraId: e1.id, unidades: 16,
      perfilDriversId: "drv-1", perfilPropsCategoriaId: "pc-1", perfilPropsHuecoId: "ph-1", plantillas: todas(e1.raiz), pasoActual: 8,
      estado: "activa", guardada: true, actualizada: "2026-09-14T10:00:00Z",
    }),
    base("f1000", {
      id: "cfg-serie-b", nombre: "Serie B", descripcion: "", estructuraId: e2.id, unidades: 8,
      perfilDriversId: "drv-2", perfilPropsCategoriaId: "pc-2", perfilPropsHuecoId: null, plantillas: parcial, intentosPlantilla: { Rueda: 1 }, pasoActual: 7,
      pasosOmitidos: [5], guardada: true, actualizada: "2026-10-28T16:30:00Z",
    }),
    base("f2000", {
      id: "cfg-tranvia", nombre: "", descripcion: "", unica: true, estructuraId: e1.id, unidades: 12,
      perfilDriversId: "drv-1", perfilPropsCategoriaId: "pc-1", perfilPropsHuecoId: "ph-1", plantillas: todas(e1.raiz), pasoActual: 8,
      estado: "activa", guardada: true, actualizada: "2026-06-02T09:15:00Z",
    }),
  ];
  // Propiedades de ejemplo: en las ruedas, diámetro (con histórico) y fabricante; y el lado de cada rueda como propiedad de hueco.
  const ladoRuedas = (raiz: typeof e1.raiz) => {
    const m: Record<string, Record<string, string>> = {};
    recorrer(raiz, (n) => { if (n.categoria === "Rueda") m[n.id] = { lado: n.nombre === "Rueda 1" ? "Izquierdo" : "Derecho" }; });
    return m;
  };
  const ruedas = { Rueda: [{ propId: "diametro", historico: true }, { propId: "fabricante", historico: false }] };
  const perfilesProps: PerfilPropiedades[] = [
    { id: "pc-1", tipo: "categoria", nombre: "Estándar · Estructura 1", porDefecto: true, descripcion: "Diámetro (con histórico) y fabricante de las ruedas", estructuraId: e1.id, propsCategoria: ruedas, propsHueco: {}, actualizada: fecha },
    { id: "pc-2", tipo: "categoria", nombre: "Estándar · Estructura 2", porDefecto: true, descripcion: "Diámetro (con histórico) y fabricante de las ruedas", estructuraId: e2.id, propsCategoria: ruedas, propsHueco: {}, actualizada: fecha },
    { id: "ph-1", tipo: "hueco", nombre: "Estándar · Estructura 1", porDefecto: true, descripcion: "Lado izquierdo o derecho de cada rueda", estructuraId: e1.id, propsCategoria: {}, propsHueco: ladoRuedas(e1.raiz), actualizada: fecha },
  ];
  return conPerfilesPorDefecto({ flotas, configs, estructuras, perfiles, perfilesProps });
}

type Api = {
  listo: boolean;
  flotas: Flota[];
  configs: Configuracion[];
  estructuras: Estructura[]; // sin borradores de asistentes
  perfiles: PerfilDrivers[];
  perfilesProps: PerfilPropiedades[];
  estructura: (id: string | null | undefined) => Estructura | undefined;
  perfil: (id: string | null | undefined) => PerfilDrivers | undefined;
  perfilProps: (id: string | null | undefined) => PerfilPropiedades | undefined;
  /** Cómo se nombra una configuración fuera de su flota: «Flota · Configuración», o solo la flota si tiene una sola estructura. */
  etiqueta: (c: Configuracion) => string;
  usosDe: (estructuraId: string) => Configuracion[];
  usosDePerfil: (perfilId: string) => Configuracion[];
  usosDePerfilProps: (perfilId: string) => Configuracion[];
  crearFlota: (f: Pick<Flota, "nombre" | "descripcion">) => Flota;
  actualizarFlota: (id: string, cambios: Partial<Flota>) => void;
  iniciarConfig: (flotaId: string) => string;
  actualizarConfig: (id: string, cambios: Partial<Configuracion>) => void;
  descartarConfig: (id: string) => void;
  guardarEstructura: (e: Estructura) => void; // crea o modifica; propaga el cambio a configuraciones y perfiles que la usan
  eliminarEstructura: (id: string) => void;
  guardarPerfil: (p: PerfilDrivers) => void; // crea o modifica; afecta a todas las configuraciones que lo usan
  eliminarPerfil: (id: string) => void;
  guardarPerfilProps: (p: PerfilPropiedades) => void; // crea o modifica; afecta a todas las configuraciones que lo usan
  eliminarPerfilProps: (id: string) => void;
  restablecer: () => void;
};

const Ctx = createContext<Api | null>(null);
export const useStore = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore fuera de StoreProvider");
  return c;
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ flotas: [], configs: [], estructuras: [], perfiles: [], perfilesProps: [] });
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

  // Toda estructura nueva (del catálogo o creada en un asistente) recibe sus perfiles por defecto.
  useEffect(() => {
    if (!listo) return;
    const completo = conPerfilesPorDefecto(estado);
    if (completo !== estado) setEstado(completo);
  }, [estado, listo]);

  useEffect(() => {
    if (!listo) return;
    try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch { /* sin almacenamiento: el prototipo sigue funcionando */ }
  }, [estado, listo]);

  const crearFlota = useCallback((f: Pick<Flota, "nombre" | "descripcion">) => {
    const nueva = flota({ ...f, id: nuevoId("flota"), usaSms: true });
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
      const configs = s.configs.map((c) => (c.estructuraId === e.id ? { ...c, ...sincronizarConEstructura(c, e.raiz) } : c));
      // Los perfiles de drivers de esa estructura se adaptan: los huecos nuevos tienen y heredan los drivers de su padre.
      const perfiles = s.perfiles.map((p) => (p.estructuraId === e.id ? { ...p, ...sincronizarDrivers(p, e.raiz) } : p));
      return { ...s, estructuras, configs, perfiles };
    });
  }, []);

  const eliminarEstructura = useCallback((id: string) => {
    setEstado((s) => ({ ...s, estructuras: s.estructuras.filter((e) => e.id !== id) }));
  }, []);

  const guardarPerfil = useCallback((p: PerfilDrivers) => {
    setEstado((s) => {
      const nuevo = { ...p, actualizada: new Date().toISOString() };
      const existe = s.perfiles.some((x) => x.id === p.id);
      return { ...s, perfiles: existe ? s.perfiles.map((x) => (x.id === p.id ? nuevo : x)) : [...s.perfiles, nuevo] };
    });
  }, []);

  const eliminarPerfil = useCallback((id: string) => {
    setEstado((s) => ({ ...s, perfiles: s.perfiles.filter((p) => p.id !== id) }));
  }, []);

  const guardarPerfilProps = useCallback((p: PerfilPropiedades) => {
    setEstado((s) => {
      const nuevo = { ...p, actualizada: new Date().toISOString() };
      const existe = s.perfilesProps.some((x) => x.id === p.id);
      return { ...s, perfilesProps: existe ? s.perfilesProps.map((x) => (x.id === p.id ? nuevo : x)) : [...s.perfilesProps, nuevo] };
    });
  }, []);

  const eliminarPerfilProps = useCallback((id: string) => {
    setEstado((s) => ({ ...s, perfilesProps: s.perfilesProps.filter((p) => p.id !== id) }));
  }, []);

  const restablecer = useCallback(() => setEstado(semilla()), []);

  // Si la flota tiene una sola estructura, su configuración se llama como la flota.
  const configs = useMemo(() => estado.configs.map((c) => (c.unica ? { ...c, nombre: estado.flotas.find((f) => f.id === c.flotaId)?.nombre ?? "", descripcion: "" } : c)), [estado.configs, estado.flotas]);

  const api = useMemo<Api>(() => ({
    listo, flotas: estado.flotas, configs, perfiles: estado.perfiles, perfilesProps: estado.perfilesProps,
    estructuras: estado.estructuras.filter((e) => !e.borradorDe),
    estructura: (id) => estado.estructuras.find((e) => e.id === id),
    perfil: (id) => estado.perfiles.find((p) => p.id === id),
    perfilProps: (id) => estado.perfilesProps.find((p) => p.id === id),
    etiqueta: (c) => { const f = estado.flotas.find((x) => x.id === c.flotaId)?.nombre ?? ""; return c.unica ? f : `${f} · ${c.nombre}`; },
    usosDe: (eid) => configs.filter((c) => c.guardada && c.estructuraId === eid),
    usosDePerfil: (pid) => configs.filter((c) => c.guardada && c.perfilDriversId === pid),
    usosDePerfilProps: (pid) => configs.filter((c) => c.guardada && (c.perfilPropsCategoriaId === pid || c.perfilPropsHuecoId === pid)),
    crearFlota, actualizarFlota, iniciarConfig, actualizarConfig, descartarConfig,
    guardarEstructura, eliminarEstructura, guardarPerfil, eliminarPerfil, guardarPerfilProps, eliminarPerfilProps, restablecer,
  }), [listo, estado, configs, crearFlota, actualizarFlota, iniciarConfig, actualizarConfig, descartarConfig, guardarEstructura, eliminarEstructura, guardarPerfil, eliminarPerfil, guardarPerfilProps, eliminarPerfilProps, restablecer]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
