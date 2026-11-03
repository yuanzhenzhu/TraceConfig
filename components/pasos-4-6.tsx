"use client";

// Pasos 4 (Propiedades de categoría), 5 (Propiedades de hueco) y 6 (Cálculos en SMS).
// Las propiedades son perfiles del catálogo común del cliente, ligados a una estructura (Configuración › Propiedades).
// En el paso 4 se elige o crea el perfil; los pasos 4 y 5 editan ese mismo perfil.

import Link from "next/link";
import { useState } from "react";
import { Banner, Button, Field, Icon, useSnackbar } from "./ds";
import { EditorPropsCategoria, EditorPropsHueco } from "./propiedades";
import {
  DRIVERS, FORMAS_CALCULO, nuevoId, propiedadesVacias,
  type DriverId, type Flota, type PerfilPropiedades,
} from "@/lib/model";
import { useStore } from "@/lib/store";
import type { PasoProps } from "./pasos-1-3";

function AvisoFlota({ flota }: { flota: Flota }) {
  return (
    <Banner type="info" title={`Se aplica a toda la flota ${flota.codigo}`}>
      Esta información es de la flota y la comparten todas sus configuraciones. Si cambias algo aquí, cambia para todas ellas.
    </Banner>
  );
}

/** Aviso cuando el perfil que se edita lo usan otras configuraciones. */
function AvisoCompartido({ perfil, configId }: { perfil: PerfilPropiedades; configId: string }) {
  const store = useStore();
  const otras = store.usosDePerfilProps(perfil.id).filter((x) => x.id !== configId);
  if (!otras.length) return null;
  return (
    <Banner type="attention" title={`Este perfil lo usan también ${otras.length} configuraciones`}>
      {otras.map((x) => `${store.flotas.find((f) => f.id === x.flotaId)?.codigo} · ${x.nombre}`).join(", ")}. Los cambios les afectan. Si esta configuración necesita algo distinto, duplica el perfil.
    </Banner>
  );
}

/* ---------- Paso 4 ---------- */
export function Paso4({ c, set, est }: PasoProps) {
  const store = useStore();
  const snack = useSnackbar();
  const raiz = est!.raiz;
  const compatibles = store.perfilesProps.filter((p) => p.estructuraId === est!.id);
  const perfil = store.perfilProps(c.perfilPropiedadesId);
  const [creando, setCreando] = useState(compatibles.length === 0);
  const [nombre, setNombre] = useState("");
  const [intento, setIntento] = useState(false);
  const repetido = store.perfilesProps.some((p) => p.nombre.trim().toLowerCase() === nombre.trim().toLowerCase());
  const errNombre = intento && !nombre.trim() ? "Indica el nombre del perfil" : repetido ? "Ya existe un perfil con este nombre" : "";

  const crear = (base?: PerfilPropiedades) => {
    const nom = base ? `${base.nombre} · ${c.nombre || "copia"}` : nombre.trim();
    if (!base) { setIntento(true); if (!nom || repetido) return; }
    const p: PerfilPropiedades = {
      id: nuevoId("prop"), nombre: nom, descripcion: base ? `Copia de ${base.nombre}` : "", estructuraId: est!.id,
      ...(base ? structuredClone({ propsCategoria: base.propsCategoria, propsHueco: base.propsHueco }) : propiedadesVacias()),
    };
    store.guardarPerfilProps(p);
    set({ perfilPropiedadesId: p.id });
    setCreando(false); setNombre(""); setIntento(false);
    snack(base ? `Perfil duplicado como "${nom}"` : `Perfil "${nom}" creado`);
  };

  return (
    <section className="lm-surface lm-surface--p24 stack gap-20">
      <h2 className="lm-title-medium" style={{ margin: 0 }}>Propiedades de categoría</h2>
      <p className="muted" style={{ margin: 0 }}>
        Las propiedades se guardan en un <strong>perfil de propiedades</strong> común del cliente, ligado a <strong>{est!.nombre}</strong>. Si otras configuraciones usan la misma estructura, normalmente comparten perfil; si esta necesita algo distinto, duplícalo.
      </p>

      <div className="lm-card stack gap-15">
        <div className="row gap-15 wrap">
          <Field label="Perfil de propiedades" htmlFor="pp-sel" style={{ width: 380 }}>
            <select id="pp-sel" className="lm-select" value={perfil?.id ?? ""} onChange={(e) => { set({ perfilPropiedadesId: e.target.value || null }); setCreando(false); }}>
              <option value="">Sin perfil</option>
              {compatibles.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
          <span className="grow" />
          {perfil && <Button variant="outlined" icon="content_copy" onClick={() => crear(perfil)}>Duplicar para esta configuración</Button>}
          <Button variant="text" icon="add" onClick={() => setCreando(true)}>Nuevo perfil vacío</Button>
        </div>
        {creando && (
          <div className="row gap-10" style={{ alignItems: "flex-end" }}>
            <Field label="Nombre del nuevo perfil" required htmlFor="pp-nombre" error={errNombre} style={{ width: 380 }}>
              <input id="pp-nombre" className="lm-input lm-input--dense" value={nombre} aria-invalid={!!errNombre} placeholder={`Por ejemplo: Propiedades ${est!.nombre} · ${c.nombre}`} onChange={(e) => setNombre(e.target.value)} />
            </Field>
            <Button variant="tonal" onClick={() => crear()}>Crear y usar</Button>
            {compatibles.length > 0 && <Button variant="text" onClick={() => setCreando(false)}>Cancelar</Button>}
          </div>
        )}
        {perfil && (
          <span className="lm-body-small muted row gap-5">
            <Icon name="info" size="m" />También puedes gestionarlo en <Link href={`/configuracion/propiedades/${perfil.id}`}>Configuración › Propiedades</Link>
          </span>
        )}
      </div>

      {perfil ? (
        <>
          <AvisoCompartido perfil={perfil} configId={c.id} />
          <EditorPropsCategoria raiz={raiz} valor={perfil.propsCategoria} onChange={(v) => store.guardarPerfilProps({ ...perfil, propsCategoria: v })} />
        </>
      ) : (
        <div className="lm-card lm-center"><Icon name="list" size="xl" />Elige o crea un perfil de propiedades. Si omites el paso, la configuración quedará sin propiedades.</div>
      )}
    </section>
  );
}

/* ---------- Paso 5 ---------- */
export function Paso5({ c, est }: PasoProps) {
  const store = useStore();
  const perfil = store.perfilProps(c.perfilPropiedadesId);
  return (
    <section className="lm-surface lm-surface--p24 stack gap-20">
      <h2 className="lm-title-medium" style={{ margin: 0 }}>Propiedades de hueco</h2>
      <Banner type="info">
        Las propiedades de hueco describen la posición (por ejemplo, el lado de una rueda), no el activo montado. Sus valores se pueden rellenar ahora o más adelante y <strong>no aparecen en las plantillas</strong>.
      </Banner>
      {perfil ? (
        <>
          <span className="row gap-10"><span className="muted">Perfil:</span><strong>{perfil.nombre}</strong></span>
          <AvisoCompartido perfil={perfil} configId={c.id} />
          <EditorPropsHueco raiz={est!.raiz} valor={perfil.propsHueco} onChange={(v) => store.guardarPerfilProps({ ...perfil, propsHueco: v })} />
        </>
      ) : (
        <Banner type="attention" title="Esta configuración no tiene perfil de propiedades">Elige o crea uno en el paso Propiedades de categoría.</Banner>
      )}
    </section>
  );
}

/* ---------- Paso 6 ---------- */
export function Paso6({ flota, setFlota }: PasoProps) {
  if (!flota.usaSms) {
    return (
      <section className="lm-surface lm-surface--p24">
        <Banner type="info" title="Este cliente no usa SMS">Este paso no aplica para la flota {flota.codigo}. Puedes continuar.</Banner>
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
        <label className="lm-radio"><input type="radio" name="ambito" checked={sms.ambito === "flota"} onChange={() => upd({ ambito: "flota" })} />Flota {flota.codigo} completa</label>
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
