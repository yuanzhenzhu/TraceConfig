"use client";

// Pasos 4 (Propiedades de categoría) y 6 (Cálculos en SMS).
// - Propiedades de categoría: únicas para todo el cliente; se editan aquí o en su apartado.
// - Propiedades de hueco: de cada estructura; se editan en el paso 1, junto a la estructura.

import Link from "next/link";
import { Banner, Field } from "./ds";
import { EditorPropsCategoria } from "./propiedades";
import { DRIVERS, FORMAS_CALCULO, type DriverId, type Flota } from "@/lib/model";
import { useStore } from "@/lib/store";
import type { PasoProps } from "./pasos-1-3";

function AvisoFlota({ flota }: { flota: Flota }) {
  return (
    <Banner type="info" title={`Se aplica a toda la flota ${flota.nombre}`}>
      Esta información es de la flota y la comparten todas sus configuraciones. Si cambias algo aquí, cambia para todas ellas.
    </Banner>
  );
}

/* ---------- Paso 4 ---------- */
/** Propiedades de categoría: un único juego para todo el cliente. Se editan aquí (las categorías de esta estructura) y en su apartado. */
export function Paso4({ est }: PasoProps) {
  const store = useStore();
  const flotas = new Set(store.configs.filter((x) => x.guardada).map((x) => x.flotaId)).size;
  return (
    <section className="lm-surface lm-surface--p24 stack gap-20">
      <h2 className="lm-title-medium" style={{ margin: 0 }}>Propiedades de categoría</h2>
      <Banner type="attention" title="Son comunes a todo el cliente">
        Lo que cambies aquí se aplica a todas las flotas ({flotas}). Aquí solo ves las categorías de {est!.nombre}; todas las categorías están en <Link href="/configuracion/propiedades-categoria">Configuración › Propiedades de categoría</Link>.
      </Banner>
      <EditorPropsCategoria raiz={est!.raiz} valor={store.propsCategoria} onChange={(v) => store.guardarPropsCategoria(v)} />
    </section>
  );
}

/* ---------- Paso 6 ---------- */
export function Paso6({ flota, setFlota }: PasoProps) {
  if (!flota.usaSms) {
    return (
      <section className="lm-surface lm-surface--p24">
        <Banner type="info" title="Este cliente no usa SMS">Este paso no aplica para la flota {flota.nombre}. Puedes continuar.</Banner>
      </section>
    );
  }
  const sms = flota.sms ?? { ambito: "flota" as const, driver: "km" as DriverId, calculo: "real" };
  const upd = (x: Partial<typeof sms>) => setFlota({ sms: { ...sms, ...x } });
  return (
    <section className="lm-surface lm-surface--p24 stack gap-20" style={{ maxWidth: 820 }}>
      <h2 className="lm-title-medium" style={{ margin: 0 }}>Cálculos en SMS</h2>
      <p className="muted" style={{ margin: 0 }}>SMS es la herramienta de planificación de mantenimientos. Indica con qué datos de la flota debe calcular. Podrás cambiarlo más adelante.</p>
      <AvisoFlota flota={flota} />
      <fieldset className="stack gap-10" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="lm-field__label" style={{ marginBottom: "var(--lm-space-10)" }}>Ámbito del cálculo</legend>
        <label className="lm-radio"><input type="radio" name="ambito" checked={sms.ambito === "flota"} onChange={() => upd({ ambito: "flota" })} />Flota {flota.nombre} completa</label>
        <label className="lm-radio"><input type="radio" name="ambito" checked={sms.ambito === "linea"} onChange={() => upd({ ambito: "linea" })} />Por línea</label>
      </fieldset>
      <Field label="Driver" htmlFor="sms-driver" style={{ width: 280 }}>
        <select id="sms-driver" className="lm-select" value={sms.driver} onChange={(e) => upd({ driver: e.target.value as DriverId })}>
          {DRIVERS.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </select>
      </Field>
      <fieldset className="stack gap-10" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="lm-field__label" style={{ marginBottom: "var(--lm-space-10)" }}>Forma de cálculo</legend>
        {FORMAS_CALCULO.map((f) => (
          <label key={f.id} className="lm-radio" style={{ alignItems: "flex-start" }}>
            <input type="radio" name="calculo" checked={sms.calculo === f.id} onChange={() => upd({ calculo: f.id })} />
            <span className="lm-radio__text"><span>{f.nombre}</span><span className="lm-radio__support">{f.desc}</span></span>
          </label>
        ))}
      </fieldset>
      <span className="lm-body-small muted">Las formas de cálculo son de ejemplo (ficticias) hasta confirmar las reales.</span>
    </section>
  );
}
