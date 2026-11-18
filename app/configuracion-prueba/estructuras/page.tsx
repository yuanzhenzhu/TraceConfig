"use client";

// HU-39 y HU-43: catálogo de estructuras del cliente.
// (Prueba, 18-11-2026) Arriba, panel plegable «Flotas sin estructura (N)» si hay flotas creadas sin estructura
// (Figma Main-Trace 1142:56049 plegado, 1129:13262 desplegado), con la acción Asignar estructura en cada una.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { Breadcrumb, Button, Dialog, EmptyState, Icon, IconButton, InfoTooltip, Loading, Menu, SearchInput, Tag, useSnackbar } from "@/components/ds";
import { useStore } from "@/lib/store";
import { etiquetaCfg } from "@/components/configuracion-prueba/nombre";

export default function EstructurasPage() {
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const [busca, setBusca] = useState("");
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});
  const [aEliminar, setAEliminar] = useState<string | null>(null);
  const [verSinEstructura, setVerSinEstructura] = useState(false);
  const sinEstructura = store.flotas.filter((f) => !store.configs.some((c) => c.flotaId === f.id && c.guardada));

  const lista = store.estructuras.filter((e) => e.nombre.toLowerCase().includes(busca.toLowerCase()));

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion-prueba" }, { label: "Estructuras" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Estructuras</h1>
          <span className="muted">Catálogo común del cliente. Un cambio en una estructura afecta a todas las configuraciones que la usan.</span>
        </div>
        <div className="lm-header__actions">
          <Button icon="add" onClick={() => router.push("/configuracion-prueba/estructuras/nueva")}>Nueva estructura</Button>
        </div>
      </div>

      {store.listo && sinEstructura.length > 0 && (
        <section className="lm-surface lm-surface--p16" style={{ marginBottom: "var(--lm-space-20)" }}>
          <button type="button" className="row gap-10" aria-expanded={verSinEstructura} aria-controls="flotas-sin-estructura"
            onClick={() => setVerSinEstructura((v) => !v)}
            style={{ width: "100%", background: "transparent", border: 0, padding: "var(--lm-space-5) 0", cursor: "pointer", color: "inherit", textAlign: "left" }}>
            <span className="lm-title-small grow">Flotas sin estructura ({sinEstructura.length})</span>
            <Icon name={verSinEstructura ? "expand_less" : "expand_more"} />
          </button>
          {verSinEstructura && (
            <table id="flotas-sin-estructura" className="lm-table" style={{ marginTop: "var(--lm-space-15)" }}>
              <thead>
                <tr><th>Flota</th><th className="num">Unidades</th><th>Estado</th><th className="actions"><span className="sr-only">Acciones</span></th></tr>
              </thead>
              <tbody>
                {sinEstructura.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <span className="row gap-5">
                        <span className="emph">{f.nombre}</span>
                        {f.descripcion && <InfoTooltip text={f.descripcion} label={`Descripción de ${f.nombre}`} />}
                      </span>
                    </td>
                    <td className="num">—</td>
                    <td><Tag tone="attention">Sin estructura</Tag></td>
                    <td className="actions">
                      <Button variant="tonal" small onClick={() => router.push(`/configuracion-prueba/asignar/${f.id}`)}>Asignar estructura</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <section className="lm-surface lm-surface--p16">
        <div className="lm-filters"><div style={{ width: 320 }}><SearchInput label="Buscar estructura" placeholder="Buscar estructura" value={busca} onChange={setBusca} /></div></div>
        {!store.listo ? <Loading text="Cargando estructuras" /> : store.estructuras.length === 0 ? (
          <EmptyState icon="table_rows" title="Todavía no hay estructuras" text="Crea la primera estructura para poder configurar flotas"
            action={<Button variant="outlined" icon="add" onClick={() => router.push("/configuracion-prueba/estructuras/nueva")}>Nueva estructura</Button>} />
        ) : lista.length === 0 ? (
          <EmptyState icon="search_off" title="No hay resultados" text={`Ninguna estructura coincide con "${busca}"`} />
        ) : (
          <table className="lm-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}><span className="sr-only">Desplegar</span></th>
                <th>Estructura</th>
                <th className="num">Configuraciones</th><th className="num">Unidades</th><th>Estado</th>
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
                      <td>
                        <span className="row gap-5">
                          <span className="emph">{e.nombre}</span>
                          <InfoTooltip text={e.descripcion || "Sin descripción"} label={`Descripción de ${e.nombre}`} />
                        </span>
                      </td>
                      <td className="num">{usos.length}</td>
                      <td className="num">{unidades || "—"}</td>
                      <td>{usos.length ? <Tag tone="primary">En uso</Tag> : <Tag tone="neutral">Sin usar</Tag>}</td>
                      <td className="actions">
                        <span className="row gap-5" style={{ justifyContent: "flex-end" }}>
                          <Menu label={`Acciones de ${e.nombre}`} items={[
                            { label: "Modificar", icon: "edit", onSelect: () => router.push(`/configuracion-prueba/estructuras/${e.id}`) },
                            "divider",
                            { label: "Eliminar", icon: "delete", danger: true, disabled: usos.length > 0, onSelect: () => setAEliminar(e.id) },
                          ]} />
                        </span>
                      </td>
                    </tr>
                    {abierta && usos.map((c) => {
                      const f = store.flotas.find((x) => x.id === c.flotaId);
                      return (
                        <tr key={c.id} className="is-child">
                          <td />
                          <td colSpan={2} style={{ paddingLeft: "var(--lm-space-30)" }}>
                            <Link href={`/configuracion-prueba/${c.id}`}>{etiquetaCfg(store, c)}</Link>
                          </td>
                          <td />
                          <td className="num">{c.unidades}</td>
                          <td colSpan={2}>
                            <span className="row gap-10">
                              {c.estado === "activa" ? <Tag tone="success">Activa</Tag> : <Tag tone="attention">Sin plantillas</Tag>}
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
