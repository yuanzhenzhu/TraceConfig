"use client";

// Catálogo de perfiles de drivers del cliente (como Estructuras).

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { Breadcrumb, Button, Dialog, EmptyState, IconButton, Loading, Menu, SearchInput, Tag, useSnackbar } from "@/components/ds";
import { ResumenDrivers } from "@/components/drivers";
import { fecha } from "@/lib/model";
import { useStore } from "@/lib/store";

export default function DriversPage() {
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const [busca, setBusca] = useState("");
  const [fEstructura, setFEstructura] = useState("");
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const [aEliminar, setAEliminar] = useState<string | null>(null);

  const lista = store.perfiles
    .filter((p) => store.estructura(p.estructuraId) && !store.estructura(p.estructuraId)!.borradorDe)
    .sort((a, b) => a.estructuraId.localeCompare(b.estructuraId) || Number(!!b.porDefecto) - Number(!!a.porDefecto))
    .filter((p) => p.nombre.toLowerCase().includes(busca.toLowerCase()))
    .filter((p) => !fEstructura || p.estructuraId === fEstructura);

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion" }, { label: "Drivers" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Drivers</h1>
          <span className="muted">Perfiles de drivers comunes del cliente. Cada perfil va ligado a una estructura y lo pueden usar varias configuraciones: un cambio les afecta a todas.</span>
        </div>
        <div className="lm-header__actions">
          <Button icon="add" onClick={() => router.push("/configuracion/drivers/nuevo")}>Nuevo perfil</Button>
        </div>
      </div>

      <section className="lm-surface lm-surface--p16">
        <div className="lm-filters">
          <div style={{ width: 320 }}><SearchInput label="Buscar perfil" placeholder="Buscar perfil de drivers" value={busca} onChange={setBusca} /></div>
          <select className="lm-select lm-select--dense" style={{ width: 240 }} aria-label="Estructura" value={fEstructura} onChange={(e) => setFEstructura(e.target.value)}>
            <option value="">Todas las estructuras</option>
            {store.estructuras.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </div>
        {!store.listo ? <Loading text="Cargando drivers" /> : store.perfiles.length === 0 ? (
          <EmptyState icon="timelapse" title="Todavía no hay perfiles de drivers" text="Crea un perfil para indicar con qué drivers cuenta la vida cada hueco"
            action={<Button variant="outlined" icon="add" onClick={() => router.push("/configuracion/drivers/nuevo")}>Nuevo perfil</Button>} />
        ) : lista.length === 0 ? (
          <EmptyState icon="search_off" title="No hay resultados" text="Ningún perfil coincide con los filtros" />
        ) : (
          <table className="lm-table">
            <thead>
              <tr>
                <th style={{ width: 48 }}><span className="sr-only">Desplegar</span></th>
                <th>Perfil</th><th>Estructura</th><th>Drivers</th><th className="num">Heredables</th>
                <th className="num">Configuraciones</th><th className="num">Unidades</th><th>Estado</th><th>Últ. modificación</th>
                <th className="actions"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((p) => {
                const usos = store.usosDePerfil(p.id);
                const unidades = usos.reduce((s, c) => s + (c.unidades ?? 0), 0);
                const abierto = !!abiertos[p.id] && usos.length > 0;
                const heredables = Object.values(p.heredables).filter((x) => Object.values(x).some(Boolean)).length;
                return (
                  <Fragment key={p.id}>
                    <tr>
                      <td>{usos.length > 0 && (
                        <IconButton compact icon={abierto ? "expand_less" : "expand_more"} label={`${abierto ? "Plegar" : "Ver"} configuraciones que usan ${p.nombre}`}
                          aria-expanded={abierto} onClick={() => setAbiertos((a) => ({ ...a, [p.id]: !abierto }))} />
                      )}</td>
                      <td><span className="stack"><span className="row gap-10"><span className="emph">{p.nombre}</span>{p.porDefecto && <Tag tone="info">Por defecto</Tag>}</span><span className="lm-body-small muted">{p.descripcion}</span></span></td>
                      <td>{store.estructura(p.estructuraId)?.nombre ?? "—"}</td>
                      <td><ResumenDrivers valor={p} /></td>
                      <td className="num">{heredables}</td>
                      <td className="num">{usos.length}</td>
                      <td className="num">{unidades || "—"}</td>
                      <td>{usos.length ? <Tag tone="primary">En uso</Tag> : <Tag tone="neutral">Sin usar</Tag>}</td>
                      <td className="muted">{p.actualizada ? fecha(p.actualizada) : "—"}</td>
                      <td className="actions">
                        <span className="row gap-5" style={{ justifyContent: "flex-end" }}>
                          <Button variant="outlined" small onClick={() => router.push(`/configuracion/drivers/${p.id}`)}>Modificar</Button>
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
                          <td colSpan={4} style={{ paddingLeft: "var(--lm-space-30)" }}>
                            <Link href={`/configuracion/${c.id}`}>{store.etiqueta(c)}</Link>
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
        <Dialog title="¿Eliminar el perfil de drivers?" onClose={() => setAEliminar(null)}
          message="No lo usa ninguna configuración. Esta acción no se puede deshacer."
          footer={<>
            <Button variant="outlined" onClick={() => setAEliminar(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => { store.eliminarPerfil(aEliminar); snack("Perfil de drivers eliminado"); setAEliminar(null); }}>Eliminar</Button>
          </>} />
      )}
    </main>
  );
}
