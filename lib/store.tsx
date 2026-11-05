"use client";

// Estado del prototipo: vive en el navegador (localStorage) y se puede restablecer.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ESTRUCTURAS, categoriasDe, driversIniciales, nuevoId, plantillasIniciales, recorrer, sincronizarConEstructura, sincronizarDrivers,
  type Configuracion, type Estructura, type Flota, type PropsCategoria,
} from "./model";

/** Datos del cliente: catálogo de estructuras (con sus propiedades de hueco), propiedades de categoría únicas y flotas. */
type Estado = { flotas: Flota[]; configs: Configuracion[]; estructuras: Estructura[]; propsCategoria: PropsCategoria };
const CLAVE = "lm-trace-prototipo-v20";

function base(flotaId: string, extra: Partial<Configuracion>): Configuracion {
  return {
    id: nuevoId("cfg"), flotaId, nombre: "", descripcion: "", estructuraId: null, unidades: null,
    drivers: null, sms: [], plantillas: {}, intentosPlantilla: {},
    pasosOmitidos: [], pasoActual: 1, pasoMax: 1, estado: "en-configuracion", guardada: false, unica: false,
    actualizada: new Date().toISOString(), ...extra,
    ...(extra.pasoActual && !extra.pasoMax ? { pasoMax: extra.pasoActual } : {}),
  };
}

const flota = (f: Flota): Flota => f;

function semilla(): Estado {
  // Propiedades de ejemplo: Estructura 1 tiene seleccionada LOCATION en todos los coches (propiedad de hueco);
  // cada configuración le da su valor. Y, en las ruedas, diámetro y fabricante (propiedades de categoría).
  const defCoches = (raiz: Estructura["raiz"]) => {
    const m: Record<string, Record<string, string>> = {};
    recorrer(raiz, (n) => { if (n.categoria === "Coche") m[n.id] = { LOCATION: "" }; });
    return m;
  };
  const codigosCoches = (raiz: Estructura["raiz"], prefijo: string) => {
    const m: Record<string, Record<string, string>> = {};
    recorrer(raiz, (n) => { if (n.categoria === "Coche") m[n.id] = { LOCATION: `${prefijo}-${n.nombre.replace("Coche ", "C")}` }; });
    return m;
  };
  const estructuras = ESTRUCTURAS.map((e, i) => ({ ...e, propsHueco: i === 0 ? defCoches(e.raiz) : {}, actualizada: "2026-05-20T08:00:00Z" }));
  // Propiedades de categoría por defecto: 13 categorías con entre 2 y 5 propiedades cada una (h = guarda histórico).
  const pc = (...l: [string, boolean?][]) => l.map(([propId, h]) => ({ propId, historico: !!h }));
  const propsCategoria: PropsCategoria = {
    Tren: pc(["client"], ["attr-sms-start-date"], ["amortization-date"], ["person-responsible"]),
    Coche: pc(["fabricante"], ["oh-date"], ["oh-km", true]),
    "Motor Coche": pc(["potencia"], ["tension"], ["attr-hrs", true], ["lubricant"]),
    Puerta: pc(["fabricante"], ["attr-cyc", true]),
    "Tarjeta Electrónica": pc(["firmware", true], ["hard-drive"], ["host"]),
    Bogie: pc(["fabricante"], ["modelo"], ["oh-date"], ["oh-km", true], ["attr-kms", true]),
    Eje: pc(["serie-fab"], ["material"], ["measuring-point", true]),
    Rueda: pc(["diametro", true], ["fabricante"], ["sd-mm", true], ["sh-mm", true], ["qr-mm", true]),
    Pantógrafo: pc(["fabricante"], ["last-calibration"], ["attr-kms", true]),
    Compresor: pc(["attr-hrs", true], ["lubricant"], ["lubrication-date"]),
    Gearbox: pc(["lubricant"], ["lubrication-km", true], ["lubrication-date"], ["oh-km", true]),
    Engine: pc(["potencia"], ["attr-hrs", true], ["nem-warranty-start"]),
    SIV: pc(["tension"], ["provider-warranty-start"], ["repair-sn"]),
  };
  const [e1, e2] = estructuras;
  const todas = (raiz: typeof e1.raiz) => Object.fromEntries(categoriasDe(raiz).map((c) => [c.categoria, "cargada" as const]));

  // Drivers de Serie B: ciclos en todas las puertas; cada puerta tiene ciclos y los huecos que cuelgan de ella lo heredan.
  const conCiclos = driversIniciales(e2.raiz);
  recorrer(e2.raiz, (n) => {
    if (n.categoria !== "Puerta") return;
    conCiclos.drivers[n.id] = { ...conCiclos.drivers[n.id], ciclos: true };
    n.hijos.forEach((hija) => recorrer(hija, (x) => {
      conCiclos.drivers[x.id] = { ...conCiclos.drivers[x.id], ciclos: true };
      conCiclos.heredables[x.id] = { ...conCiclos.heredables[x.id], ciclos: true };
    }));
  });
  const flotas: Flota[] = [
    flota({
      id: "f1000", nombre: "Metro Línea 1", descripcion: "Flota de metro de la línea 1", usaSms: true,
    }),
    flota({ id: "f2000", nombre: "Tranvía Norte", descripcion: "Tranvía de la red norte", usaSms: true }),
    flota({ id: "f3000", nombre: "Cercanías Sur", descripcion: "Cercanías del corredor sur", usaSms: true }), // de momento, en el prototipo todas las flotas usan SMS
  ];
  const parcial = plantillasIniciales(e2.raiz);
  parcial["Tren"] = "cargada"; parcial["Coche"] = "cargada"; parcial["Puerta"] = "cargada"; parcial["Rueda"] = "errores";
  const configs: Configuracion[] = [
    base("f1000", {
      id: "cfg-serie-a", nombre: "Serie A", descripcion: "Trenes de 3 coches entregados en 2019", estructuraId: e1.id, unidades: 16,
      drivers: { ...driversIniciales(e1.raiz), estructuraId: e1.id }, plantillas: todas(e1.raiz), pasoActual: 8,
      valoresHueco: codigosCoches(e1.raiz, "ML1"), sms: [{ driver: "km", forma: "flota" }], estado: "activa", guardada: true, actualizada: "2026-09-14T10:00:00Z",
    }),
    base("f1000", {
      id: "cfg-serie-b", nombre: "Serie B", descripcion: "Trenes de 2 coches para refuerzo en hora punta", estructuraId: e2.id, unidades: 8,
      drivers: { ...conCiclos, estructuraId: e2.id }, sms: [{ driver: "km", forma: "flota" }, { driver: "ciclos", forma: "categoria" }], plantillas: parcial, intentosPlantilla: { Rueda: 1 }, pasoActual: 7,
      guardada: true, actualizada: "2026-10-28T16:30:00Z",
    }),
    base("f2000", {
      id: "cfg-tranvia", nombre: "", descripcion: "", unica: true, estructuraId: e1.id, unidades: 12,
      drivers: { ...driversIniciales(e1.raiz), estructuraId: e1.id }, plantillas: todas(e1.raiz), pasoActual: 8,
      estado: "activa", guardada: true, actualizada: "2026-06-02T09:15:00Z",
    }),
  ];
  return { flotas, configs, estructuras, propsCategoria };
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
  restablecer: () => void;
};

const Ctx = createContext<Api | null>(null);
export const useStore = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore fuera de StoreProvider");
  return c;
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ flotas: [], configs: [], estructuras: [], propsCategoria: {} });
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

  const restablecer = useCallback(() => setEstado(semilla()), []);

  // Si la flota tiene una sola estructura, su configuración se llama como la flota.
  const configs = useMemo(() => estado.configs.map((c) => (c.unica ? { ...c, nombre: estado.flotas.find((f) => f.id === c.flotaId)?.nombre ?? "", descripcion: "" } : c)), [estado.configs, estado.flotas]);

  const api = useMemo<Api>(() => ({
    listo, flotas: estado.flotas, configs, propsCategoria: estado.propsCategoria,
    estructuras: estado.estructuras.filter((e) => !e.borradorDe),
    estructura: (id) => estado.estructuras.find((e) => e.id === id),
    etiqueta: (c) => { const f = estado.flotas.find((x) => x.id === c.flotaId)?.nombre ?? ""; return c.unica ? f : `${f} · ${c.nombre}`; },
    usosDe: (eid) => configs.filter((c) => c.guardada && c.estructuraId === eid),
    crearFlota, actualizarFlota, iniciarConfig, actualizarConfig, descartarConfig,
    guardarEstructura, eliminarEstructura, guardarPropsCategoria, restablecer,
  }), [listo, estado, configs, crearFlota, actualizarFlota, iniciarConfig, actualizarConfig, descartarConfig, guardarEstructura, eliminarEstructura, guardarPropsCategoria, restablecer]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
