"use client";

// (Prueba) Números de serie cambiados en el prototipo de Cambio de número de serie. Los activos son ficticios
// (lib/activos.ts) y se generan a partir de las configuraciones; aquí se guardan los cambios para que se vean
// igual en el listado y tras el asistente con plantilla. Se guardan en el navegador (comodidad del prototipo).

import { useCallback, useEffect, useState } from "react";

const CLAVE = "lm-prueba-cambios-serie";

function leer(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(CLAVE) ?? "{}"); } catch { return {}; }
}

export function useCambiosSerie() {
  const [cambios, setCambios] = useState<Record<string, string>>({});
  useEffect(() => { setCambios(leer()); }, []);
  const aplicar = useCallback((nuevos: Record<string, string>) => {
    setCambios((m) => {
      const r = { ...m, ...nuevos };
      try { localStorage.setItem(CLAVE, JSON.stringify(r)); } catch { /* sin almacenamiento: solo en esta vista */ }
      return r;
    });
  }, []);
  return { cambios, aplicar };
}
