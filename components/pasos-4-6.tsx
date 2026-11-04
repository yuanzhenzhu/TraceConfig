"use client";

// Pasos 4 (Propiedades de categoría), 5 (Propiedades de hueco) y 6 (Cálculos en SMS).
// Las propiedades son perfiles del catálogo común del cliente, ligados a una estructura (Configuración › Propiedades).
// Igual que los drivers: en el paso 4 se elige o crea el perfil. Si lo usan otras configuraciones, los pasos 4 y 5 lo muestran
// en solo lectura (se modifica en su apartado o se duplica); si solo lo usa esta, se edita aquí.

import { useState } from "react";
import { Banner, Button, Field, Icon, useSnackbar } from "./ds";
import { EditorPropsCategoria, EditorPropsHueco, resumenPropiedades } from "./propiedades";
import {
  DRIVERS, FORMAS_CALCULO, nuevoId, propiedadesVacias,
  type DriverId, type Flota, type PerfilPropiedades,
} from "@/lib/model";
import { useStore } from "@/lib/store";
import { CabeceraPerfil, nombreLibre, type PasoProps } from "./pasos-1-3";

function AvisoFlota({ flota }: { flota: Flota }) {
  return (
    <Banner type="info" title={`Se aplica a toda la flota ${flota.codigo}`}>
      Esta información es de la flota y la comparten todas sus configuraciones. Si cambias algo aquí, cambia para todas ellas.
    </Banner>
  );
}

/** Duplica un perfil de propiedades para esta configuración y lo deja seleccionado. */
function useDuplicarProps({ c, set }: Pick<PasoProps, "c" | "set">) {
  const store = useStore();
  const snack = useSnackbar();
  return (base: PerfilPropiedades) => {
    const p: PerfilPropiedades = {
      ...structuredClone(base), id: nuevoId("prop"),
      nombre: nombreLibre(`${base.nombre} · ${c.nombre || "copia"}`, store.perfilesProps), descripcion: `Copia de ${base.nombre}`,
    };
    store.guardarPerfilProps(p);
    set({ perfilPropiedadesId: p.id });
    snack(`Perfil duplicado como "${p.nombre}"`);
  };
}

/* ---------- Paso 4 ---------- */
export function Paso4({ c, set, est }: PasoProps) {
  const store = useStore();
  const raiz = est!.raiz;
  const compatibles = store.perfilesProps.filter((p) => p.estructuraId === est!.id);
  const actual = store.perfilProps(c.perfilPropiedadesId);
  const duplicar = useDuplicarProps({ c, set });
  const otrasDe = (id: string) => store.usosDePerfilProps(id).filter((x) => x.id !== c.id);
  const [modo, setModo] = useState<"existente" | "nuevo">(compatibles.length ? "existente" : "nuevo");
  const [nuevo, setNuevo] = useState(() => ({ nombre: "", descripcion: "", ...propiedadesVacias() }));
  const [intento, setIntento] = useState(false);
  const repetido = store.perfilesProps.some((p) => p.nombre.trim().toLowerCase() === nuevo.nombre.trim().toLowerCase());
  const errNombre = intento && !nuevo.nombre.trim() ? "Indica el nombre del perfil" : repetido ? "Ya existe un perfil con este nombre" : "";

  const crear = () => {
    setIntento(true);
    if (!nuevo.nombre.trim() || repetido) return;
    const p: PerfilPropiedades = { id: nuevoId("prop"), estructuraId: est!.id, ...nuevo, nombre: nuevo.nombre.trim() };
    store.guardarPerfilProps(p);
    set({ perfilPropiedadesId: p.id });
    setModo("existente");
  };

  return (
    <section className="lm-surface lm-surface--p24 stack gap-20">
      <h2 className="lm-title-medium" style={{ margin: 0 }}>Propiedades de categoría</h2>
      <p className="muted" style={{ margin: 0 }}>
        Elige el perfil de propiedades de esta configuración. Los perfiles son comunes a todo el cliente y van ligados a una estructura: aquí solo aparecen los de <strong>{est!.nombre}</strong>. El mismo perfil incluye las propiedades de hueco del paso siguiente.
      </p>
      <div className="lm-tabs" role="tablist" style={{ marginBottom: 0 }}>
        <button role="tab" className="lm-tab" aria-selected={modo === "existente"} onClick={() => setModo("existente")}><Icon name="list" /> Usar un perfil existente</button>
        <button role="tab" className="lm-tab" aria-selected={modo === "nuevo"} onClick={() => setModo("nuevo")}><Icon name="add" /> Crear un perfil nuevo</button>
      </div>

      {modo === "existente" ? (
        compatibles.length === 0 ? (
          <div className="lm-card lm-center"><Icon name="list" size="xl" /><span>Todavía no hay perfiles de propiedades para {est!.nombre}</span>
            <Button variant="outlined" icon="add" onClick={() => setModo("nuevo")}>Crear un perfil nuevo</Button></div>
        ) : (
          <div className="stack gap-20">
            <div role="radiogroup" aria-label="Perfiles de propiedades" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--lm-space-10)" }}>
              {compatibles.map((p) => {
                const sel = c.perfilPropiedadesId === p.id;
                const usos = otrasDe(p.id);
                const r = resumenPropiedades(raiz, p);
                return (
                  <label key={p.id} className="lm-card lm-radio" style={{ alignItems: "flex-start", borderColor: sel ? "var(--lm-sys-primary)" : undefined, background: sel ? "color-mix(in srgb, var(--lm-sys-primary) 8%, var(--lm-sys-surface-container-lowest))" : undefined }}>
                    <input type="radio" name="perfil-props" checked={sel} onChange={() => set({ perfilPropiedadesId: p.id })} aria-label={p.nombre} />
                    <span className="lm-radio__text gap-5">
                      <span className="lm-title-small">{p.nombre}</span>
                      <span className="lm-radio__support">{p.descripcion}</span>
                      <span className="lm-body-small">{r.nCat} propiedades de categoría · {r.nHuecos} huecos con propiedades</span>
                      <span className="lm-body-small muted">{usos.length ? `También lo usan: ${usos.map((x) => x.nombre).join(", ")}` : "No lo usa ninguna otra configuración"}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {actual ? (
              <div className="stack gap-10">
                <CabeceraPerfil titulo="Propiedades de categoría" nombre={actual.nombre} otras={otrasDe(actual.id)} apartado="Propiedades" href={`/configuracion/propiedades/${actual.id}`} onDuplicar={() => duplicar(actual)} />
                <EditorPropsCategoria soloLectura={otrasDe(actual.id).length > 0} raiz={raiz} valor={actual.propsCategoria} onChange={(v) => store.guardarPerfilProps({ ...actual, propsCategoria: v })} />
              </div>
            ) : (
              <div className="lm-card lm-center"><Icon name="list" size="xl" />Selecciona un perfil para ver sus propiedades. Si omites el paso, la configuración quedará sin propiedades.</div>
            )}
          </div>
        )
      ) : (
        <div className="stack gap-20">
          <span className="lm-body-small muted row gap-5"><Icon name="info" size="m" />El perfil se añadirá al catálogo común del cliente y podrán usarlo otras configuraciones con {est!.nombre}. Las propiedades de hueco las asignas en el paso siguiente.</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "var(--lm-space-20)" }}>
            <Field label="Nombre del perfil" required htmlFor="pp-nombre" error={errNombre}>
              <input id="pp-nombre" className="lm-input" value={nuevo.nombre} aria-invalid={!!errNombre} placeholder={`Por ejemplo: Propiedades ${est!.nombre} · ${c.nombre}`}
                onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
            </Field>
            <Field label="Descripción" htmlFor="pp-desc">
              <input id="pp-desc" className="lm-input" value={nuevo.descripcion} onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })} />
            </Field>
          </div>
          <EditorPropsCategoria raiz={raiz} valor={nuevo.propsCategoria} onChange={(v) => setNuevo({ ...nuevo, propsCategoria: v })} />
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Button variant="tonal" icon="check" onClick={crear}>Crear y usar este perfil</Button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- Paso 5 ---------- */
export function Paso5({ c, set, est }: PasoProps) {
  const store = useStore();
  const perfil = store.perfilProps(c.perfilPropiedadesId);
  const duplicar = useDuplicarProps({ c, set });
  const otras = perfil ? store.usosDePerfilProps(perfil.id).filter((x) => x.id !== c.id) : [];
  return (
    <section className="lm-surface lm-surface--p24 stack gap-20">
      <h2 className="lm-title-medium" style={{ margin: 0 }}>Propiedades de hueco</h2>
      <Banner type="info">
        Las propiedades de hueco describen la posición (por ejemplo, el lado de una rueda), no el activo montado. Sus valores se pueden rellenar ahora o más adelante y <strong>no aparecen en las plantillas</strong>.
      </Banner>
      {perfil ? (
        <>
          <CabeceraPerfil titulo="Propiedades de hueco" nombre={perfil.nombre} otras={otras} apartado="Propiedades" href={`/configuracion/propiedades/${perfil.id}`} onDuplicar={() => duplicar(perfil)} />
          <EditorPropsHueco soloLectura={otras.length > 0} raiz={est!.raiz} valor={perfil.propsHueco} onChange={(v) => store.guardarPerfilProps({ ...perfil, propsHueco: v })} />
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
