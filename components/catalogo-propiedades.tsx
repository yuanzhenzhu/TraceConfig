"use client";

// Catálogos de perfiles de propiedades del cliente, separados por tipo (como Estructuras y Drivers):
// - Configuración › Propiedades de categoría
// - Configuración › Propiedades de hueco
// Cada perfil va ligado a una estructura y lo pueden usar varias configuraciones: un cambio les afecta a todas.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import { Banner, Breadcrumb, Button, Dialog, EmptyState, Field, IconButton, Loading, Menu, SearchInput, Tag, useSnackbar } from "./ds";
import { EditorPropsCategoria, EditorPropsHueco, resumenPropiedades } from "./propiedades";
import { TIPOS_PROPS, fecha, nuevoId, propiedadesVacias, type PerfilPropiedades, type TipoProps } from "@/lib/model";
import { useStore } from "@/lib/store";

const DESCRIPCION: Record<TipoProps, string> = {
  categoria: "Perfiles con las propiedades que se registran para cada categoría de activo (por ejemplo, el diámetro de las ruedas). Dependen de las categorías de la estructura.",
  hueco: "Perfiles con las propiedades que describen cada posición de la estructura (por ejemplo, el lado de una rueda). Dependen de los huecos de la estructura.",
};

/** Número que resume un perfil: propiedades asignadas (categoría) o huecos con propiedades (hueco). */
export function cifraPerfil(tipo: TipoProps, raiz: Parameters<typeof resumenPropiedades>[0], p: PerfilPropiedades) {
  const r = resumenPropiedades(raiz, p);
  return tipo === "categoria"
    ? { n: r.nCat, texto: `${r.nCat} ${r.nCat === 1 ? "propiedad asignada" : "propiedades asignadas"}` }
    : { n: r.nHuecos, texto: `${r.nHuecos} huecos con propiedades` };
}

/* ---------- Listado ---------- */
export function CatalogoPropiedades({ tipo }: { tipo: TipoProps }) {
  const t = TIPOS_PROPS[tipo];
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const [busca, setBusca] = useState("");
  const [fEstructura, setFEstructura] = useState("");
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const [aEliminar, setAEliminar] = useState<string | null>(null);

  const todos = store.perfilesProps.filter((p) => p.tipo === tipo && store.estructura(p.estructuraId) && !store.estructura(p.estructuraId)!.borradorDe)
    .sort((a, b) => a.estructuraId.localeCompare(b.estructuraId) || Number(!!b.porDefecto) - Number(!!a.porDefecto));
  const lista = todos
    .filter((p) => p.nombre.toLowerCase().includes(busca.toLowerCase()))
    .filter((p) => !fEstructura || p.estructuraId === fEstructura);

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion" }, { label: t.titulo }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>{t.titulo}</h1>
          <span className="muted">{DESCRIPCION[tipo]} Cada perfil va ligado a una estructura y lo pueden usar varias configuraciones: un cambio les afecta a todas.</span>
        </div>
        <div className="lm-header__actions">
          <Button icon="add" onClick={() => router.push(`${t.ruta}/nuevo`)}>Nuevo perfil</Button>
        </div>
      </div>

      <section className="lm-surface lm-surface--p16">
        <div className="lm-filters">
          <div style={{ width: 320 }}><SearchInput label="Buscar perfil" placeholder={`Buscar perfil ${t.corto}`} value={busca} onChange={setBusca} /></div>
          <select className="lm-select lm-select--dense" style={{ width: 240 }} aria-label="Estructura" value={fEstructura} onChange={(e) => setFEstructura(e.target.value)}>
            <option value="">Todas las estructuras</option>
            {store.estructuras.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>
        {!store.listo ? <Loading text={`Cargando ${t.titulo.toLowerCase()}`} /> : todos.length === 0 ? (
          <EmptyState icon={t.icono} title={`Todavía no hay perfiles de propiedades ${t.corto}`} text={tipo === "categoria" ? "Crea un perfil para indicar qué propiedades se registran en cada categoría" : "Crea un perfil para indicar qué propiedades describen cada hueco"}
            action={<Button variant="outlined" icon="add" onClick={() => router.push(`${t.ruta}/nuevo`)}>Nuevo perfil</Button>} />
        ) : lista.length === 0 ? (
          <EmptyState icon="search_off" title="No hay resultados" text="Ningún perfil coincide con los filtros" />
        ) : (
          <table className="lm-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}><span className="sr-only">Desplegar</span></th>
                <th>Perfil</th><th>Estructura</th><th className="num">{tipo === "categoria" ? "Propiedades" : "Huecos con prop."}</th>
                <th className="num">Configuraciones</th><th className="num">Unidades</th><th>Estado</th><th>Últ. modificación</th>
                <th className="actions"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const est = store.estructura(p.estructuraId);
                const n = est ? cifraPerfil(tipo, est.raiz, p).n : 0;
                const usos = store.usosDePerfilProps(p.id);
                const unidades = usos.reduce((s, c) => s + (c.unidades ?? 0), 0);
                const abierto = !!abiertos[p.id] && usos.length > 0;
                return (
                  <Fragment key={p.id}>
                    <tr>
                      <td>{usos.length > 0 && (
                        <IconButton compact icon={abierto ? "expand_less" : "expand_more"} label={`${abierto ? "Plegar" : "Ver"} configuraciones que usan ${p.nombre}`}
                          aria-expanded={abierto} onClick={() => setAbiertos((a) => ({ ...a, [p.id]: !abierto }))} />
                      )}</td>
                      <td><span className="stack"><span className="row gap-10"><span className="emph">{p.nombre}</span>{p.porDefecto && <Tag tone="info">Por defecto</Tag>}</span><span className="lm-body-small muted">{p.descripcion}</span></span></td>
                      <td>{est?.nombre ?? "—"}</td>
                      <td className="num">{n}</td>
                      <td className="num">{usos.length}</td>
                      <td className="num">{unidades || "—"}</td>
                      <td>{usos.length ? <Tag tone="primary">En uso</Tag> : <Tag tone="neutral">Sin usar</Tag>}</td>
                      <td className="muted">{p.actualizada ? fecha(p.actualizada) : "—"}</td>
                      <td className="actions">
                        <span className="row gap-5" style={{ justifyContent: "flex-end" }}>
                          <Button variant="outlined" small onClick={() => router.push(`${t.ruta}/${p.id}`)}>Modificar</Button>
                          <Menu label={`Acciones de ${p.nombre}`} items={[
                            { label: p.porDefecto ? "Eliminar (no disponible: es el perfil por defecto)" : "Eliminar", icon: "delete", danger: true, disabled: usos.length > 0 || !!p.porDefecto, onSelect: () => setAEliminar(p.id) },
                          ]} />
                        </span>
                      </td>
                    </tr>
                    {abierto && usos.map((c) => {
                      const f = store.flotas.find((x) => x.id === c.flotaId);
                      return (
                        <tr key={c.id} className="is-child">
                          <td />
                          <td colSpan={3} style={{ paddingLeft: "var(--lm-space-30)" }}>
                            <Link href={`/configuracion/${c.id}`}>{f?.codigo} · {c.nombre}</Link><span className="muted"> · {f?.nombre}</span>
                          </td>
                          <td />
                          <td className="num">{c.unidades}</td>
                          <td colSpan={3}>{c.estado === "activa" ? <Tag tone="success">Activa</Tag> : <Tag tone="attention">En configuración</Tag>}</td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {aEliminar && (
        <Dialog title={`¿Eliminar el perfil de propiedades ${t.corto}?`} onClose={() => setAEliminar(null)}
          message="No lo usa ninguna configuración. Esta acción no se puede deshacer."
          footer={<>
            <Button variant="outlined" onClick={() => setAEliminar(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => { store.eliminarPerfilProps(aEliminar); snack("Perfil de propiedades eliminado"); setAEliminar(null); }}>Eliminar</Button>
          </>} />
      )}
    </main>
  );
}

/* ---------- Crear o modificar ---------- */
export function EditorPerfilProps({ tipo, id }: { tipo: TipoProps; id: string }) {
  const t = TIPOS_PROPS[tipo];
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const esNuevo = id === "nuevo";
  const original = esNuevo ? undefined : store.perfilProps(id);
  const delTipo = original?.tipo === tipo ? original : undefined;

  const [borrador, setBorrador] = useState<PerfilPropiedades | null>(null);
  const [intentado, setIntentado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  useEffect(() => {
    if (!store.listo || borrador) return;
    if (esNuevo) {
      const e = store.estructuras[0];
      if (e) setBorrador({ id: nuevoId(t.prefijo), tipo, nombre: "", descripcion: "", estructuraId: e.id, ...propiedadesVacias() });
    } else if (delTipo) setBorrador(structuredClone(delTipo));
  }, [store.listo, esNuevo, delTipo, borrador, store.estructuras, t.prefijo, tipo]);

  if (!store.listo || (!borrador && (esNuevo || delTipo))) return <main className="lm-page"><Loading text="Cargando perfil" /></main>;
  if (!borrador) {
    return (
      <main className="lm-page">
        <EmptyState icon="search_off" title="No se ha encontrado el perfil de propiedades" action={<Button onClick={() => router.push(t.ruta)}>Volver a {t.titulo}</Button>} />
      </main>
    );
  }

  const est = store.estructura(borrador.estructuraId);
  const usos = esNuevo ? [] : store.usosDePerfilProps(id);
  const enUso = usos.length > 0;
  const unidades = usos.reduce((s, c) => s + (c.unidades ?? 0), 0);
  const cambiado = !!delTipo && JSON.stringify([delTipo.propsCategoria, delTipo.propsHueco]) !== JSON.stringify([borrador.propsCategoria, borrador.propsHueco]);
  const nombreRepetido = store.perfilesProps.some((p) => p.tipo === tipo && p.id !== borrador.id && p.nombre.trim().toLowerCase() === borrador.nombre.trim().toLowerCase());
  const errNombre = intentado && !borrador.nombre.trim() ? "Indica el nombre del perfil" : nombreRepetido ? "Ya existe un perfil con este nombre" : "";

  const guardar = () => {
    setIntentado(true);
    if (!borrador.nombre.trim() || nombreRepetido) return;
    if (enUso && cambiado && !confirmar) { setConfirmar(true); return; }
    store.guardarPerfilProps(borrador);
    snack(esNuevo ? `Perfil "${borrador.nombre}" creado` : enUso && cambiado ? `Perfil "${borrador.nombre}" modificado en ${usos.length} configuraciones` : `Perfil "${borrador.nombre}" guardado`);
    router.push(t.ruta);
  };

  return (
    <main className="lm-page" style={{ paddingBottom: 120 }}>
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion" }, { label: t.titulo, href: t.ruta }, { label: esNuevo ? "Nuevo perfil" : borrador.nombre }]} />
          <span className="row gap-15">
            <h1 className="lm-headline-small" style={{ margin: 0 }}>{esNuevo ? `Nuevo perfil de propiedades ${t.corto}` : `Modificar ${delTipo!.nombre}`}</h1>
            {!esNuevo && (enUso ? <Tag tone="primary">En uso</Tag> : <Tag tone="neutral">Sin usar</Tag>)}
            {borrador.porDefecto && <Tag tone="info">Por defecto</Tag>}
          </span>
        </div>
      </div>

      <div className="stack gap-20">
        {borrador.porDefecto && (
          <Banner type="info" title={`Perfil por defecto de ${est?.nombre ?? "la estructura"}`}>
            Se crea solo con la estructura y aparece el primero en el asistente. Se puede modificar, pero no eliminar.
          </Banner>
        )}
        {enUso && (
          <Banner type="attention" title={`Este perfil lo usan ${usos.length} configuraciones (${unidades} unidades)`}>
            Los cambios se aplicarán a todas: {usos.map((c) => `${store.flotas.find((f) => f.id === c.flotaId)?.codigo} · ${c.nombre}`).join(", ")}.
          </Banner>
        )}
        <section className="lm-surface lm-surface--p24 stack gap-20">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--lm-space-20)" }}>
            <Field label="Nombre" required htmlFor="pp-nombre" error={errNombre}>
              <input id="pp-nombre" className="lm-input" value={borrador.nombre} aria-invalid={!!errNombre} placeholder={tipo === "categoria" ? "Por ejemplo: Ruedas estándar · Estructura 4" : "Por ejemplo: Lado de ruedas · Estructura 4"}
                onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })} />
            </Field>
            <Field label="Descripción" htmlFor="pp-desc">
              <input id="pp-desc" className="lm-input" value={borrador.descripcion} onChange={(e) => setBorrador({ ...borrador, descripcion: e.target.value })} />
            </Field>
            <Field label="Estructura" required htmlFor="pp-est" support={esNuevo ? (tipo === "categoria" ? "Las propiedades se asignan a las categorías de esta estructura" : "Las propiedades se asignan a los huecos de esta estructura") : `No se puede cambiar: las propiedades dependen de sus ${tipo === "categoria" ? "categorías" : "huecos"}`}>
              <select id="pp-est" className="lm-select" value={borrador.estructuraId} disabled={!esNuevo}
                onChange={(e) => setBorrador({ ...borrador, estructuraId: e.target.value, ...propiedadesVacias() })}>
                {store.estructuras.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Field>
          </div>
          {!est ? <Banner type="error">La estructura de este perfil ya no existe</Banner> : tipo === "categoria" ? (
            <EditorPropsCategoria raiz={est.raiz} valor={borrador.propsCategoria} onChange={(v) => setBorrador({ ...borrador, propsCategoria: v })} />
          ) : (
            <EditorPropsHueco raiz={est.raiz} valor={borrador.propsHueco} onChange={(v) => setBorrador({ ...borrador, propsHueco: v })} />
          )}
        </section>
      </div>

      <footer className="lm-footer-bar">
        <div className="row gap-10" style={{ maxWidth: 1360, margin: "0 auto", padding: "var(--lm-space-15) var(--lm-space-30)" }}>
          <span className="grow lm-body-small muted">{est?.nombre}{cambiado && " · Hay cambios sin guardar"}</span>
          <Button variant="outlined" onClick={() => router.push(t.ruta)}>Cancelar</Button>
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
          {tipo === "categoria"
            ? <Banner type="info">Las plantillas de estas configuraciones incluirán las columnas de las propiedades de categoría nuevas.</Banner>
            : <Banner type="info">Las propiedades de hueco no aparecen en las plantillas: sus valores se podrán rellenar más adelante.</Banner>}
        </Dialog>
      )}
    </main>
  );
}
