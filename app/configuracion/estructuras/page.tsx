"use client";

// HU-39 y HU-43: catálogo de estructuras del cliente.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { Breadcrumb, Button, Dialog, EmptyState, IconButton, Loading, Menu, SearchInput, Tag, useSnackbar } from "@/components/ds";
import { categoriasDe, contarHuecos, fecha, unidadesTerminadas } from "@/lib/model";
import { useStore } from "@/lib/store";

export default function EstructurasPage() {
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const [busca, setBusca] = useState("");
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});
  const [aEliminar, setAEliminar] = useState<string | null>(null);

  const lista = store.estructuras.filter((e) => e.nombre.toLowerCase().includes(busca.toLowerCase()));

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion" }, { label: "Estructuras" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Estructuras</h1>
          <span className="muted">Catálogo común del cliente. Un cambio en una estructura afecta a todas las configuraciones que la usan.</span>
        </div>
        <div className="lm-header__actions">
          <Button icon="add" onClick={() => router.push("/configuracion/estructuras/nueva")}>Nueva estructura</Button>
        </div>
      </div>

      <section className="lm-surface lm-surface--p16">
        <div className="lm-filters"><div style={{ width: 320 }}><SearchInput label="Buscar estructura" placeholder="Buscar estructura" value={busca} onChange={setBusca} /></div></div>
        {!store.listo ? <Loading text="Cargando estructuras" /> : store.estructuras.length === 0 ? (
          <EmptyState icon="table_rows" title="Todavía no hay estructuras" text="Crea la primera estructura para poder configurar flotas"
            action={<Button variant="outlined" icon="add" onClick={() => router.push("/configuracion/estructuras/nueva")}>Nueva estructura</Button>} />
        ) : lista.length === 0 ? (
          <EmptyState icon="search_off" title="No hay resultados" text={`Ninguna estructura coincide con "${busca}"`} />
        ) : (
          <table className="lm-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}><span className="sr-only">Desplegar</span></th>
                <th>Estructura</th><th>Composición</th><th className="num">Huecos por unidad</th>
                <th className="num">Configuraciones</th><th className="num">Unidades</th><th>Estado</th><th>Últ. modificación</th>
                <th className="actions"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => {
                const usos = store.usosDe(e.id);
                const unidades = usos.reduce((s, c) => s + (c.unidades ?? 0), 0);
                const abierta = !!abiertas[e.id] && usos.length > 0;
                return (
                  <Fragment key={e.id}>
                    <tr>
                      <td>{usos.length > 0 && (
                        <IconButton compact icon={abierta ? "expand_less" : "expand_more"} label={`${abierta ? "Plegar" : "Ver"} configuraciones que usan ${e.nombre}`}
                          aria-expanded={abierta} onClick={() => setAbiertas((a) => ({ ...a, [e.id]: !abierta }))} />
                      )}</td>
                      <td><span className="stack"><span className="emph">{e.nombre}</span><span className="lm-body-small muted">{e.descripcion}</span></span></td>
                      <td className="muted">{categoriasDe(e.raiz).filter((x) => x.nivel > 1).slice(0, 3).map((x) => `${x.huecos} ${x.categoria}`).join(" · ")}…</td>
                      <td className="num">{contarHuecos(e.raiz)}</td>
                      <td className="num">{usos.length}</td>
                      <td className="num">{unidades || "—"}</td>
                      <td>{usos.length ? <Tag tone="primary">En uso</Tag> : <Tag tone="neutral">Sin usar</Tag>}</td>
                      <td className="muted">{e.actualizada ? fecha(e.actualizada) : "—"}</td>
                      <td className="actions">
                        <span className="row gap-5" style={{ justifyContent: "flex-end" }}>
                          <Button variant="outlined" small onClick={() => router.push(`/configuracion/estructuras/${e.id}`)}>Modificar</Button>
                          <Menu label={`Acciones de ${e.nombre}`} items={[
                            { label: "Eliminar", icon: "delete", danger: true, disabled: usos.length > 0, onSelect: () => setAEliminar(e.id) },
                          ]} />
                        </span>
                      </td>
                    </tr>
                    {abierta && usos.map((c) => {
                      const f = store.flotas.find((x) => x.id === c.flotaId);
                      const incompletas = (c.unidades ?? 0) - unidadesTerminadas(c, e.raiz);
                      return (
                        <tr key={c.id} className="is-child">
                          <td />
                          <td colSpan={3} style={{ paddingLeft: "var(--lm-space-30)" }}>
                            <Link href={`/configuracion/${c.id}`}>{f?.nombre} · {c.nombre}</Link>
                            <span className="muted"> · {f?.nombre}</span>
                          </td>
                          <td />
                          <td className="num">{c.unidades}</td>
                          <td colSpan={3}>
                            <span className="row gap-10">
                              {c.estado === "activa" ? <Tag tone="success">Activa</Tag> : <Tag tone="attention">En configuración</Tag>}
                              {c.estado === "activa" && incompletas > 0 && <Tag tone="warning" icon="warning">{incompletas} unidades incompletas</Tag>}
                            </span>
                          </td>
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
        <Dialog title="¿Eliminar la estructura?" onClose={() => setAEliminar(null)}
          message="No la usa ninguna configuración. Esta acción no se puede deshacer."
          footer={<>
            <Button variant="outlined" onClick={() => setAEliminar(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => { store.eliminarEstructura(aEliminar); snack("Estructura eliminada"); setAEliminar(null); }}>Eliminar</Button>
          </>} />
      )}
    </main>
  );
}
