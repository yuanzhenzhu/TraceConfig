"use client";

// Motivo de cambio: texto opcional que se escribe en la confirmación, justo antes de registrar (HU-M00 §2).
// Se guarda en Movimiento.motivo y se ve en el detalle del historial. Se vacía al cerrar la confirmación.

import { useEffect, useState } from "react";
import { Field } from "@/components/ds";

export function useMotivoCambio(abierto: boolean) {
  const [v, setV] = useState("");
  useEffect(() => { if (!abierto) setV(""); }, [abierto]);
  const campo = (
    <div style={{ marginTop: "var(--lm-space-15)" }}>
      <Field label="Motivo de cambio" htmlFor="motivo-cambio" support="Opcional. Por ejemplo: desgaste de la pestaña, avería, revisión programada">
        <textarea id="motivo-cambio" className="lm-input" rows={2} maxLength={300} value={v} onChange={(e) => setV(e.target.value)} />
      </Field>
    </div>
  );
  return { campo, valor: v.trim() || undefined };
}
