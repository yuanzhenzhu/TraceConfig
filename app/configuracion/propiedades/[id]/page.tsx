"use client";

// Crear o modificar un perfil de propiedades, viendo antes a qué configuraciones afecta.

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Banner, Breadcrumb, Button, Dialog, EmptyState, Field, Icon, Loading, Tag, useSnackbar } from "@/components/ds";
import { EditorPropsCategoria, EditorPropsHueco } from "@/components/propiedades";
import { nuevoId, propiedadesVacias, type PerfilPropiedades } from "@/lib/model";
import { useStore } from "@/lib/store";

export default function EditarPerfilPropsPage() {
  const { id } = useParams<{ id: string }>();
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const esNuevo = id === "nuevo";
  const original = esNuevo ? undefined : store.perfilProps(id);

  const [borrador, setBorrador] = useState<PerfilPropiedades | null>(null);
  const [tab, setTab] = useState<"categoria" | "hueco">("categoria");
  const [intentado, setIntentado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  useEffect(() => {
    if (!store.listo || borrador) return;
    if (esNuevo) {
      const e = store.estructuras[0];
      if (e) setBorrador({ id: nuevoId("prop"), nombre: "", descripcion: "", estructuraId: e.id, ...propiedadesVacias() });
    } else if (original) setBorrador(structuredClone(original));
  }, [store.listo, esNuevo, original, borrador, store.estructuras]);

  if (!store.listo || (!borrador && (esNuevo || original))) return <main className="lm-page"><Loading text="Cargando perfil" /></main>;
  if (!borrador) {
    return (
      <main className="lm-page">
        <EmptyState icon="search_off" title="No se ha encontrado el perfil de propiedades" action={<Button onClick={() => router.push("/configuracion/propiedades")}>Volver a Propiedades</Button>} />
      </main>
    );
  }

  const est = store.estructura(borrador.estructuraId);
  const usos = esNuevo ? [] : store.usosDePerfilProps(id);
  const enUso = usos.length > 0;
  const unidades = usos.reduce((s, c) => s + (c.unidades ?? 0), 0);
  const cambiado = !!original && JSON.stringify([original.propsCategoria, original.propsHueco]) !== JSON.stringify([borrador.propsCategoria, borrador.propsHueco]);
  const nombreRepetido = store.perfilesProps.some((p) => p.id !== borrador.id && p.nombre.trim().toLowerCase() === borrador.nombre.trim().toLowerCase());
  const errNombre = intentado && !borrador.nombre.trim() ? "Indica el nombre del perfil" : nombreRepetido ? "Ya existe un perfil con este nombre" : "";

  const guardar = () => {
    setIntentado(true);
    if (!borrador.nombre.trim() || nombreRepetido) return;
    if (enUso && cambiado && !confirmar) { setConfirmar(true); return; }
    store.guardarPerfilProps(borrador);
    snack(esNuevo ? `Perfil "${borrador.nombre}" creado` : enUso && cambiado ? `Perfil "${borrador.nombre}" modificado en ${usos.length} configuraciones` : `Perfil "${borrador.nombre}" guardado`);
    router.push("/configuracion/propiedades");
  };

  return (
    <main className="lm-page" style={{ paddingBottom: 120 }}>
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion" }, { label: "Propiedades", href: "/configuracion/propiedades" }, { label: esNuevo ? "Nuevo perfil" : borrador.nombre }]} />
          <span className="row gap-15">
            <h1 className="lm-headline-small" style={{ margin: 0 }}>{esNuevo ? "Nuevo perfil de propiedades" : `Modificar ${original!.nombre}`}</h1>
            {!esNuevo && (enUso ? <Tag tone="primary">En uso</Tag> : <Tag tone="neutral">Sin usar</Tag>)}
          </span>
        </div>
      </div>

      <div className="stack gap-20">
        {enUso && (
          <Banner type="attention" title={`Este perfil lo usan ${usos.length} configuraciones (${unidades} unidades)`}>
            Los cambios se aplicarán a todas: {usos.map((c) => `${store.flotas.find((f) => f.id === c.flotaId)?.codigo} · ${c.nombre}`).join(", ")}.
          </Banner>
        )}
        <section className="lm-surface lm-surface--p24 stack gap-20">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--lm-space-20)" }}>
            <Field label="Nombre" required htmlFor="pp-nombre" error={errNombre}>
              <input id="pp-nombre" className="lm-input" value={borrador.nombre} aria-invalid={!!errNombre} placeholder="Por ejemplo: Propiedades estándar · Estructura 4"
                onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })} />
            </Field>
            <Field label="Descripción" htmlFor="pp-desc">
              <input id="pp-desc" className="lm-input" value={borrador.descripcion} onChange={(e) => setBorrador({ ...borrador, descripcion: e.target.value })} />
            </Field>
            <Field label="Estructura" required htmlFor="pp-est" support={esNuevo ? "Las propiedades se asignan a las categorías y huecos de esta estructura" : "No se puede cambiar: las propiedades dependen de sus categorías y huecos"}>
              <select id="pp-est" className="lm-select" value={borrador.estructuraId} disabled={!esNuevo}
                onChange={(e) => setBorrador({ ...borrador, estructuraId: e.target.value, ...propiedadesVacias() })}>
                {store.estructuras.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Field>
          </div>
          <div className="lm-tabs" role="tablist" style={{ marginBottom: 0 }}>
            <button role="tab" className="lm-tab" aria-selected={tab === "categoria"} onClick={() => setTab("categoria")}><Icon name="list" /> Propiedades de categoría</button>
            <button role="tab" className="lm-tab" aria-selected={tab === "hueco"} onClick={() => setTab("hueco")}><Icon name="radio_button_checked" /> Propiedades de hueco</button>
          </div>
          {!est ? <Banner type="error">La estructura de este perfil ya no existe</Banner> : tab === "categoria" ? (
            <EditorPropsCategoria raiz={est.raiz} valor={borrador.propsCategoria} onChange={(v) => setBorrador({ ...borrador, propsCategoria: v })} />
          ) : (
            <EditorPropsHueco raiz={est.raiz} valor={borrador.propsHueco} onChange={(v) => setBorrador({ ...borrador, propsHueco: v })} />
          )}
        </section>
      </div>

      <footer className="lm-footer-bar">
        <div className="row gap-10" style={{ maxWidth: 1360, margin: "0 auto", padding: "var(--lm-space-15) var(--lm-space-30)" }}>
          <span className="grow lm-body-small muted">{est?.nombre}{cambiado && " · Hay cambios sin guardar"}</span>
          <Button variant="outlined" onClick={() => router.push("/configuracion/propiedades")}>Cancelar</Button>
          <Button onClick={guardar}>{esNuevo ? "Crear perfil" : "Guardar cambios"}</Button>
        </div>
      </footer>

      {confirmar && (
        <Dialog large title={`¿Aplicar los cambios en ${usos.length} configuraciones?`} onClose={() => setConfirmar(false)}
          message={`El perfil "${borrador.nombre}" es común: el cambio se aplica a todas las configuraciones que lo usan.`}
          footer={<>
            <Button variant="outlined" onClick={() => setConfirmar(false)}>Cancelar</Button>
            <Button onClick={guardar}>Aplicar en {usos.length} configuraciones</Button>
          </>}>
          <table className="lm-table">
            <thead><tr><th>Flota</th><th>Configuración</th><th>Estado</th><th className="num">Unidades</th></tr></thead>
            <tbody>
              {usos.map((c) => (
                <tr key={c.id}>
                  <td className="emph">{store.flotas.find((x) => x.id === c.flotaId)?.codigo}</td><td>{c.nombre}</td>
                  <td>{c.estado === "activa" ? <Tag tone="success">Activa</Tag> : <Tag tone="attention">En configuración</Tag>}</td>
                  <td className="num">{c.unidades}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Banner type="info">Las plantillas de estas configuraciones incluirán las columnas de las propiedades de categoría nuevas.</Banner>
        </Dialog>
      )}
    </main>
  );
}
