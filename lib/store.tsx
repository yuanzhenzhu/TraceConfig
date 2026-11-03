"use client";

// Estado del prototipo: vive en el navegador (localStorage) y se puede restablecer.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ESTRUCTURAS, categoriasDe, driversPorDefecto, plantillasIniciales, nuevoId,
  type Configuracion, type Flota,
} from "./model";

type Estado = { flotas: Flota[]; configs: Configuracion[] };
const CLAVE = "lm-trace-prototipo-v1";

function base(flotaId: string, extra: Partial<Configuracion>): Configuracion {
  return {
    id: nuevoId("cfg"), flotaId, nombre: "", descripcion: "", estructura: null, unidades: null,
    drivers: {}, propsCategoria: {}, propsHueco: {}, sms: null, plantillas: {}, intentosPlantilla: {},
    pasosOmitidos: [], pasoActual: 1, pasoMax: 1, estado: "en-configuracion", guardada: false,
    actualizada: new Date().toISOString(), ...extra,
    ...(extra.pasoActual && !extra.pasoMax ? { pasoMax: extra.pasoActual } : {}),
  };
}

function semilla(): Estado {
  const e1 = ESTRUCTURAS[0], e2 = ESTRUCTURAS[1], e3 = ESTRUCTURAS[2];
  const todas = (raiz: typeof e1.raiz) => Object.fromEntries(categoriasDe(raiz).map((c) => [c.categoria, "cargada" as const]));
  const flotas: Flota[] = [
    { id: "f1000", codigo: "F1000", nombre: "Metro Línea 1", descripcion: "Flota de metro de la línea 1", usaSms: true },
    { id: "f2000", codigo: "F2000", nombre: "Tranvía Norte", descripcion: "Tranvía de la red norte", usaSms: false },
    { id: "f3000", codigo: "F3000", nombre: "Cercanías Sur", descripcion: "Cercanías del corredor sur", usaSms: true },
  ];
  const parcial = plantillasIniciales(e2.raiz);
  parcial["Tren"] = "cargada"; parcial["Coche"] = "cargada"; parcial["Puerta"] = "cargada"; parcial["Rueda"] = "errores";
  const configs: Configuracion[] = [
    base("f1000", {
      id: "cfg-serie-a", nombre: "Serie A", descripcion: "Unidades de 3 coches", estructura: e1, unidades: 16,
      drivers: driversPorDefecto(e1.raiz), plantillas: todas(e1.raiz), pasoActual: 8,
      estado: "activa", guardada: true, actualizada: "2026-09-14T10:00:00Z",
      propsCategoria: { Rueda: [{ propId: "diametro", historico: true }, { propId: "fabricante", historico: false }] },
    }),
    base("f1000", {
      id: "cfg-serie-b", nombre: "Serie B", descripcion: "Unidades de 2 coches, ampliación 2026", estructura: e2, unidades: 8,
      drivers: driversPorDefecto(e2.raiz), plantillas: parcial, intentosPlantilla: { Rueda: 1 }, pasoActual: 7,
      pasosOmitidos: [5, 6], guardada: true, actualizada: "2026-10-28T16:30:00Z",
    }),
    base("f2000", {
      id: "cfg-tranvia", nombre: "Serie única", descripcion: "Todas las unidades del tranvía", estructura: e3, unidades: 12,
      drivers: driversPorDefecto(e3.raiz), plantillas: todas(e3.raiz), pasoActual: 8,
      estado: "activa", guardada: true, actualizada: "2026-06-02T09:15:00Z",
    }),
  ];
  return { flotas, configs };
}

type Api = {
  listo: boolean;
  flotas: Flota[];
  configs: Configuracion[];
  crearFlota: (f: Omit<Flota, "id" | "usaSms">) => Flota;
  iniciarConfig: (flotaId: string) => string;
  actualizarConfig: (id: string, cambios: Partial<Configuracion>) => void;
  descartarConfig: (id: string) => void;
  restablecer: () => void;
};

const Ctx = createContext<Api | null>(null);
export const useStore = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore fuera de StoreProvider");
  return c;
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ flotas: [], configs: [] });
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

  const crearFlota = useCallback((f: Omit<Flota, "id" | "usaSms">) => {
    const nueva: Flota = { ...f, id: nuevoId("flota"), usaSms: true };
    setEstado((s) => ({ ...s, flotas: [...s.flotas, nueva] }));
    return nueva;
  }, []);

  const iniciarConfig = useCallback((flotaId: string) => {
    const c = base(flotaId, {});
    setEstado((s) => ({ ...s, configs: [...s.configs, c] }));
    return c.id;
  }, []);

  const actualizarConfig = useCallback((id: string, cambios: Partial<Configuracion>) => {
    setEstado((s) => ({
      ...s,
      configs: s.configs.map((c) => (c.id === id ? { ...c, ...cambios, actualizada: new Date().toISOString() } : c)),
    }));
  }, []);

  const descartarConfig = useCallback((id: string) => {
    setEstado((s) => ({ ...s, configs: s.configs.filter((c) => c.id !== id) }));
  }, []);

  const restablecer = useCallback(() => setEstado(semilla()), []);

  const api = useMemo<Api>(() => ({
    listo, flotas: estado.flotas, configs: estado.configs,
    crearFlota, iniciarConfig, actualizarConfig, descartarConfig, restablecer,
  }), [listo, estado, crearFlota, iniciarConfig, actualizarConfig, descartarConfig, restablecer]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
