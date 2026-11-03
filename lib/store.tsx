"use client";

// Estado del prototipo: vive en el navegador (localStorage) y se puede restablecer.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ESTRUCTURAS, categoriasDe, driversPorDefecto, nuevoId, plantillasIniciales, sincronizarConEstructura,
  type Configuracion, type Estructura, type Flota,
} from "./model";

type Estado = { flotas: Flota[]; configs: Configuracion[]; estructuras: Estructura[] };
const CLAVE = "lm-trace-prototipo-v2";

function base(flotaId: string, extra: Partial<Configuracion>): Configuracion {
  return {
    id: nuevoId("cfg"), flotaId, nombre: "", descripcion: "", estructuraId: null, unidades: null,
    drivers: {}, plantillas: {}, intentosPlantilla: {},
    pasosOmitidos: [], pasoActual: 1, pasoMax: 1, estado: "en-configuracion", guardada: false,
    actualizada: new Date().toISOString(), ...extra,
    ...(extra.pasoActual && !extra.pasoMax ? { pasoMax: extra.pasoActual } : {}),
  };
}

const flota = (f: Omit<Flota, "propsCategoria" | "propsHueco" | "sms"> & Partial<Flota>): Flota =>
  ({ propsCategoria: {}, propsHueco: {}, sms: null, ...f });

function semilla(): Estado {
  const estructuras = ESTRUCTURAS.map((e) => ({ ...e, actualizada: "2026-05-20T08:00:00Z" }));
  const [e1, e2] = estructuras;
  const todas = (raiz: typeof e1.raiz) => Object.fromEntries(categoriasDe(raiz).map((c) => [c.categoria, "cargada" as const]));
  const flotas: Flota[] = [
    flota({
      id: "f1000", codigo: "F1000", nombre: "Metro Línea 1", descripcion: "Flota de metro de la línea 1", usaSms: true,
      propsCategoria: { Rueda: [{ propId: "diametro", historico: true }, { propId: "fabricante", historico: false }] },
      sms: { ambito: "flota", driver: "km", calculo: "real" },
    }),
    flota({ id: "f2000", codigo: "F2000", nombre: "Tranvía Norte", descripcion: "Tranvía de la red norte", usaSms: false }),
    flota({ id: "f3000", codigo: "F3000", nombre: "Cercanías Sur", descripcion: "Cercanías del corredor sur", usaSms: true }),
  ];
  const parcial = plantillasIniciales(e2.raiz);
  parcial["Tren"] = "cargada"; parcial["Coche"] = "cargada"; parcial["Puerta"] = "cargada"; parcial["Rueda"] = "errores";
  const configs: Configuracion[] = [
    base("f1000", {
      id: "cfg-serie-a", nombre: "Serie A", descripcion: "Unidades de 3 coches", estructuraId: e1.id, unidades: 16,
      drivers: driversPorDefecto(e1.raiz), plantillas: todas(e1.raiz), pasoActual: 8,
      estado: "activa", guardada: true, actualizada: "2026-09-14T10:00:00Z",
    }),
    base("f1000", {
      id: "cfg-serie-b", nombre: "Serie B", descripcion: "Unidades de 2 coches, ampliación 2026", estructuraId: e2.id, unidades: 8,
      drivers: driversPorDefecto(e2.raiz), plantillas: parcial, intentosPlantilla: { Rueda: 1 }, pasoActual: 7,
      pasosOmitidos: [5], guardada: true, actualizada: "2026-10-28T16:30:00Z",
    }),
    base("f2000", {
      id: "cfg-tranvia", nombre: "Serie única", descripcion: "Todas las unidades del tranvía", estructuraId: e1.id, unidades: 12,
      drivers: driversPorDefecto(e1.raiz), plantillas: todas(e1.raiz), pasoActual: 8,
      estado: "activa", guardada: true, actualizada: "2026-06-02T09:15:00Z",
    }),
  ];
  return { flotas, configs, estructuras };
}

type Api = {
  listo: boolean;
  flotas: Flota[];
  configs: Configuracion[];
  estructuras: Estructura[]; // sin borradores de asistentes
  estructura: (id: string | null | undefined) => Estructura | undefined;
  usosDe: (estructuraId: string) => Configuracion[];
  crearFlota: (f: Pick<Flota, "codigo" | "nombre" | "descripcion">) => Flota;
  actualizarFlota: (id: string, cambios: Partial<Flota>) => void;
  iniciarConfig: (flotaId: string) => string;
  actualizarConfig: (id: string, cambios: Partial<Configuracion>) => void;
  descartarConfig: (id: string) => void;
  guardarEstructura: (e: Estructura) => void; // crea o modifica; propaga el cambio a todas las configuraciones que la usan
  eliminarEstructura: (id: string) => void;
  restablecer: () => void;
};

const Ctx = createContext<Api | null>(null);
export const useStore = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore fuera de StoreProvider");
  return c;
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ flotas: [], configs: [], estructuras: [] });
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

  const crearFlota = useCallback((f: Pick<Flota, "codigo" | "nombre" | "descripcion">) => {
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
      return { ...s, estructuras, configs };
    });
  }, []);

  const eliminarEstructura = useCallback((id: string) => {
    setEstado((s) => ({ ...s, estructuras: s.estructuras.filter((e) => e.id !== id) }));
  }, []);

  const restablecer = useCallback(() => setEstado(semilla()), []);

  const api = useMemo<Api>(() => ({
    listo, flotas: estado.flotas, configs: estado.configs,
    estructuras: estado.estructuras.filter((e) => !e.borradorDe),
    estructura: (id) => estado.estructuras.find((e) => e.id === id),
    usosDe: (eid) => estado.configs.filter((c) => c.guardada && c.estructuraId === eid),
    crearFlota, actualizarFlota, iniciarConfig, actualizarConfig, descartarConfig, guardarEstructura, eliminarEstructura, restablecer,
  }), [listo, estado, crearFlota, actualizarFlota, iniciarConfig, actualizarConfig, descartarConfig, guardarEstructura, eliminarEstructura, restablecer]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
