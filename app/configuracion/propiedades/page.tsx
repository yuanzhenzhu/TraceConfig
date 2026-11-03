"use client";

// Catálogo de perfiles de propiedades del cliente (como Estructuras y Drivers).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { Breadcrumb, Button, Dialog, EmptyState, IconButton, Loading, Menu, SearchInput, Tag, useSnackbar } from "@/components/ds";
import { resumenPropiedades } from "@/components/propiedades";
import { fecha } from "@/lib/model";
import { useStore } from "@/lib/store";

export default function PropiedadesPage() {
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const [busca, setBusca] = useState("");
  const [fEstructura, setFEstructura] = useState("");
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const [aEliminar, setAEliminar] = useState<string | null>(null);

  const lista = store.perfilesProps
    .filter((p) => p.nombre.toLowerCase().includes(busca.toLowerCase()))
    .filter((p) => !fEstructura || p.estructuraId === fEstructura);

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion" }, { label: "Propiedades" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Propiedades</h1>
          <span className="muted">Perfiles de propiedades de categoría y de hueco, comunes del cliente. Cada perfil va ligado a una estructura y lo pueden usar varias configuraciones: un cambio les afecta a todas.</span>
        </div>
        <div className="lm-header__actions">
          <Button icon="add" onClick={() => router.push("/configuracion/propiedades/nuevo")}>Nuevo perfil</Button>
        </div>
      </div>

      <section className="lm-surface lm-surface--p16">
        <div className="lm-filters">
          <div style={{ width: 320 }}><SearchInput label="Buscar perfil" placeholder="Buscar perfil de propiedades" value={busca} onChange={setBusca} /></div>
          <select className="lm-select lm-select--dense" style={{ width: 240 }} aria-label="Estructura" value={fEstructura} onChange={(e) => setFEstructura(e.target.value)}>
            <option value="">Todas las estructuras</option>
            {store.estructuras.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>
        {!store.listo ? <Loading text="Cargando propiedades" /> : store.perfilesProps.length === 0 ? (
          <EmptyState icon="list" title="Todavía no hay perfiles de propiedades" text="Crea un perfil para indicar qué propiedades se registran en cada categoría y hueco"
            action={<Button variant="outlined" icon="add" onClick={() => router.push("/configuracion/propiedades/nuevo")}>Nuevo perfil</Button>} />
        ) : lista.length === 0 ? (
          <EmptyState icon="search_off" title="No hay resultados" text="Ningún perfil coincide con los filtros" />
        ) : (
          <table className="lm-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}><span className="sr-only">Desplegar</span></th>
                <th>Perfil</th><th>Estructura</th><th className="num">Prop. de categoría</th><th className="num">Huecos con prop.</th>
                <th className="num">Configuraciones</th><th className="num">Unidades</th><th>Estado</th><th>Últ. modificación</th>
                <th className="actions"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const est = store.estructura(p.estructuraId);
                const r = est ? resumenPropiedades(est.raiz, p) : { nCat: 0, nHuecos: 0 };
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
                      <td><span className="stack"><span className="emph">{p.nombre}</span><span className="lm-body-small muted">{p.descripcion}</span></span></td>
                      <td>{est?.nombre ?? "—"}</td>
                      <td className="num">{r.nCat}</td>
                      <td className="num">{r.nHuecos}</td>
                      <td className="num">{usos.length}</td>
                      <td className="num">{unidades || "—"}</td>
                      <td>{usos.length ? <Tag tone="primary">En uso</Tag> : <Tag tone="neutral">Sin usar</Tag>}</td>
                      <td className="muted">{p.actualizada ? fecha(p.actualizada) : "—"}</td>
                      <td className="actions">
                        <span className="row gap-5" style={{ justifyContent: "flex-end" }}>
                          <Button variant="outlined" small onClick={() => router.push(`/configuracion/propiedades/${p.id}`)}>Modificar</Button>
                          <Menu label={`Acciones de ${p.nombre}`} items={[
                            { label: "Eliminar", icon: "delete", danger: true, disabled: usos.length > 0, onSelect: () => setAEliminar(p.id) },
                          ]} />
                        </span>
                      </td>
                    </tr>
                    {abierto && usos.map((c) => {
                      const f = store.flotas.find((x) => x.id === c.flotaId);
                      return (
                        <tr key={c.id} className="is-child">
                          <td />
                          <td colSpan={4} style={{ paddingLeft: "var(--lm-space-30)" }}>
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
        <Dialog title="¿Eliminar el perfil de propiedades?" onClose={() => setAEliminar(null)}
          message="No lo usa ninguna configuración. Esta acción no se puede deshacer."
          footer={<>
            <Button variant="outlined" onClick={() => setAEliminar(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => { store.eliminarPerfilProps(aEliminar); snack("Perfil de propiedades eliminado"); setAEliminar(null); }}>Eliminar</Button>
          </>} />
      )}
    </main>
  );
}
