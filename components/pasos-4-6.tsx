"use client";

// Pasos 4 (Propiedades de categoría), 5 (Propiedades de hueco) y 6 (Cálculos en SMS).
// Las propiedades son perfiles del catálogo común del cliente, ligados a una estructura (Configuración › Propiedades).
// Las propiedades de categoría y las de hueco son dos catálogos separados (Configuración › Propiedades de categoría / de hueco).
// Igual que los drivers: se elige o crea el perfil. Si lo usan otras configuraciones, se ve en solo lectura
// (se modifica en su apartado o se duplica); si solo lo usa esta, se edita aquí.

import { useEffect, useState } from "react";
import { Banner, Button, Field, Icon, Tag, useSnackbar } from "./ds";
import { EditorPropsCategoria, EditorPropsHueco } from "./propiedades";
import { cifraPerfil } from "./catalogo-propiedades";
import {
  DRIVERS, FORMAS_CALCULO, TIPOS_PROPS, nuevoId, propiedadesVacias,
  type Configuracion, type DriverId, type Flota, type PerfilPropiedades, type TipoProps,
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

/**
 * Pasos 4 y 5: mismo funcionamiento que los drivers, cada uno con su catálogo.
 * Elegir o crear el perfil; si lo usan otras configuraciones, solo lectura (duplicar o modificar en su apartado).
 */
type PropiedadesConfigLike = Pick<PerfilPropiedades, "propsCategoria" | "propsHueco">;

function PasoPerfilProps({ tipo, c, set, est }: PasoProps & { tipo: TipoProps }) {
  const t = TIPOS_PROPS[tipo];
  const store = useStore();
  const snack = useSnackbar();
  const raiz = est!.raiz;
  const delTipo = store.perfilesProps.filter((p) => p.tipo === tipo);
  const compatibles = delTipo.filter((p) => p.estructuraId === est!.id).sort((a, b) => Number(!!b.porDefecto) - Number(!!a.porDefecto));
  const actual = store.perfilProps(c[t.campo]);
  // Sin perfil válido, se usa el perfil por defecto de la estructura.
  const defecto = compatibles.find((p) => p.porDefecto);
  useEffect(() => {
    if ((!actual || actual.estructuraId !== est!.id) && defecto) set({ [t.campo]: defecto.id } as Partial<Configuracion>);
  }, [actual, defecto, est, set, t.campo]);
  const otrasDe = (id: string) => store.usosDePerfilProps(id).filter((x) => x.id !== c.id);
  const [modo, setModo] = useState<"existente" | "nuevo">(compatibles.length ? "existente" : "nuevo");
  const [nuevo, setNuevo] = useState(() => ({ nombre: "", descripcion: "", ...propiedadesVacias() }));
  const [intento, setIntento] = useState(false);
  const repetido = delTipo.some((p) => p.nombre.trim().toLowerCase() === nuevo.nombre.trim().toLowerCase());
  const errNombre = intento && !nuevo.nombre.trim() ? "Indica el nombre del perfil" : repetido ? "Ya existe un perfil con este nombre" : "";
  const elegir = (id: string | null) => set({ [t.campo]: id } as Partial<Configuracion>);

  const crear = () => {
    setIntento(true);
    if (!nuevo.nombre.trim() || repetido) return;
    const p: PerfilPropiedades = { id: nuevoId(t.prefijo), tipo, estructuraId: est!.id, ...nuevo, nombre: nuevo.nombre.trim() };
    store.guardarPerfilProps(p);
    elegir(p.id);
    setModo("existente");
  };
  const duplicar = (base: PerfilPropiedades) => {
    const p: PerfilPropiedades = {
      ...structuredClone(base), id: nuevoId(t.prefijo),
      nombre: nombreLibre(`${base.nombre} · ${c.nombre || "copia"}`, delTipo), descripcion: `Copia de ${base.nombre}`, porDefecto: false,
    };
    store.guardarPerfilProps(p);
    elegir(p.id);
    snack(`Perfil duplicado como "${p.nombre}"`);
  };
  const editor = (valor: PropiedadesConfigLike, onChange: (v: Partial<PerfilPropiedades>) => void, soloLectura?: boolean) =>
    tipo === "categoria"
      ? <EditorPropsCategoria soloLectura={soloLectura} raiz={raiz} valor={valor.propsCategoria} onChange={(v) => onChange({ propsCategoria: v })} />
      : <EditorPropsHueco soloLectura={soloLectura} raiz={raiz} valor={valor.propsHueco} onChange={(v) => onChange({ propsHueco: v })} />;

  return (
    <section className="lm-surface lm-surface--p24 stack gap-20">
      <h2 className="lm-title-medium" style={{ margin: 0 }}>{t.titulo}</h2>
      {tipo === "hueco" && (
        <Banner type="info">
          Las propiedades de hueco describen la posición (por ejemplo, el lado de una rueda), no el activo montado. Sus valores se pueden rellenar ahora o más adelante y <strong>no aparecen en las plantillas</strong>.
        </Banner>
      )}
      <p className="muted" style={{ margin: 0 }}>
        Elige el perfil de propiedades {t.corto} de esta configuración. Los perfiles son comunes a todo el cliente y van ligados a una estructura: aquí solo aparecen los de <strong>{est!.nombre}</strong>.
      </p>
      <div className="lm-tabs" role="tablist" style={{ marginBottom: 0 }}>
        <button role="tab" className="lm-tab" aria-selected={modo === "existente"} onClick={() => setModo("existente")}><Icon name="list" /> Usar un perfil existente</button>
        <button role="tab" className="lm-tab" aria-selected={modo === "nuevo"} onClick={() => setModo("nuevo")}><Icon name="add" /> Crear un perfil nuevo</button>
      </div>

      {modo === "existente" ? (
        compatibles.length === 0 ? (
          <div className="lm-card lm-center"><Icon name={t.icono} size="xl" /><span>Todavía no hay perfiles de propiedades {t.corto} para {est!.nombre}</span>
            <Button variant="outlined" icon="add" onClick={() => setModo("nuevo")}>Crear un perfil nuevo</Button></div>
        ) : (
          <div className="stack gap-20">
            <div role="radiogroup" aria-label={`Perfiles de propiedades ${t.corto}`} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--lm-space-10)" }}>
              {compatibles.map((p) => {
                const sel = actual?.id === p.id;
                const usos = otrasDe(p.id);
                return (
                  <label key={p.id} className="lm-card lm-radio" style={{ alignItems: "flex-start", borderColor: sel ? "var(--lm-sys-primary)" : undefined, background: sel ? "color-mix(in srgb, var(--lm-sys-primary) 8%, var(--lm-sys-surface-container-lowest))" : undefined }}>
                    <input type="radio" name={`perfil-${tipo}`} checked={sel} onChange={() => elegir(p.id)} aria-label={p.nombre} />
                    <span className="lm-radio__text gap-5">
                      <span className="row gap-10"><span className="lm-title-small">{p.nombre}</span>{p.porDefecto && <Tag tone="info">Por defecto</Tag>}</span>
                      <span className="lm-radio__support">{p.descripcion}</span>
                      <span className="lm-body-small">{cifraPerfil(tipo, raiz, p).texto}</span>
                      <span className="lm-body-small muted">{usos.length ? `También lo usan: ${usos.map((x) => x.nombre).join(", ")}` : "No lo usa ninguna otra configuración"}</span>
                    </span>
                  </label>
                );
              })}
            </div>
            {actual ? (
              <div className="stack gap-10">
                <CabeceraPerfil nombre={actual.nombre} otras={otrasDe(actual.id)} apartado={t.titulo} href={`${t.ruta}/${actual.id}`} onDuplicar={() => duplicar(actual)} />
                {editor(actual, (v) => store.guardarPerfilProps({ ...actual, ...v }), otrasDe(actual.id).length > 0)}
              </div>
            ) : (
              <div className="lm-card lm-center"><Icon name={t.icono} size="xl" />Selecciona un perfil para ver sus propiedades. Si omites el paso, se aplica el perfil por defecto de la estructura.</div>
            )}
          </div>
        )
      ) : (
        <div className="stack gap-20">
          <span className="lm-body-small muted row gap-5"><Icon name="info" size="m" />El perfil se añadirá a Configuración › {t.titulo} y podrán usarlo otras configuraciones con {est!.nombre}.</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "var(--lm-space-20)" }}>
            <Field label="Nombre del perfil" required htmlFor={`pp-nombre-${tipo}`} error={errNombre}>
              <input id={`pp-nombre-${tipo}`} className="lm-input" value={nuevo.nombre} aria-invalid={!!errNombre} placeholder={tipo === "categoria" ? `Por ejemplo: Ruedas · ${c.nombre || est!.nombre}` : `Por ejemplo: Lado de ruedas · ${c.nombre || est!.nombre}`}
                onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
            </Field>
            <Field label="Descripción" htmlFor={`pp-desc-${tipo}`}>
              <input id={`pp-desc-${tipo}`} className="lm-input" value={nuevo.descripcion} onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })} />
            </Field>
          </div>
          {editor(nuevo, (v) => setNuevo({ ...nuevo, ...v }))}
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Button variant="tonal" icon="check" onClick={crear}>Crear y usar este perfil</Button>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- Paso 4 ---------- */
export function Paso4(props: PasoProps) { return <PasoPerfilProps tipo="categoria" {...props} />; }

/* ---------- Paso 5 ---------- */
export function Paso5(props: PasoProps) { return <PasoPerfilProps tipo="hueco" {...props} />; }

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
