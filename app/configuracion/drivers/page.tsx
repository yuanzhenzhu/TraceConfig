"use client";

// Drivers, con dos pestañas:
// - Configuración de drivers: los drivers de cada configuración (flota + estructura). No hay catálogo común:
//   cada configuración tiene los suyos, aunque comparta estructura con otra flota.
// - Cálculo de media: tabla con los cálculos de cada flota o línea; se añaden y modifican en un dialog.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Breadcrumb, Button, ButtonToggle, Dialog, EmptyState, Field, Icon, Loading, Menu, Tag, useSnackbar } from "@/components/ds";
import { cuentaDrivers } from "@/components/drivers";
import { DialogMedia, nombreDriver, nombreForma, type FilaMedia } from "@/components/media";
import { DRIVERS, LINEAS, claveMedia, driversEfectivos, type DriverId, type FormaMedia, type NivelMedia } from "@/lib/model";
import { useStore } from "@/lib/store";

export default function DriversPage() {
  const store = useStore();
  const router = useRouter();
  const [pestana, setPestana] = useState<"drivers" | "media">("drivers");
  const [fFlota, setFFlota] = useState("");
  const [fEstructura, setFEstructura] = useState("");

  // Solo las configuraciones que ya tienen estructura (los drivers se marcan sobre ella).
  const lista = store.configs
    .filter((c) => c.guardada && c.estructuraId && store.estructura(c.estructuraId))
    .filter((c) => !fFlota || c.flotaId === fFlota)
    .filter((c) => !fEstructura || c.estructuraId === fEstructura);
  const limpiar = () => { setFFlota(""); setFEstructura(""); };

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion" }, { label: "Drivers" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Drivers</h1>
        </div>
      </div>

      <div className="lm-tabs" role="tablist">
        <button role="tab" className="lm-tab" aria-selected={pestana === "drivers"} onClick={() => setPestana("drivers")}><Icon name="timelapse" /> Configuración de drivers</button>
        <button role="tab" className="lm-tab" aria-selected={pestana === "media"} onClick={() => setPestana("media")}><Icon name="functions" /> Cálculo de media</button>
      </div>

      {pestana === "media" ? <PestanaMedia /> : <>
      <p className="muted" style={{ margin: "0 0 var(--lm-space-20)" }}>Los drivers son de cada configuración: una flota con una estructura. Dos flotas que usan la misma estructura pueden contar la vida de sus activos de forma distinta.</p>
      <section className="lm-surface lm-surface--p16">
        <div className="lm-filters">
          <Field label="Flota" htmlFor="d-flota">
            <select id="d-flota" className="lm-select lm-select--dense" value={fFlota} onChange={(e) => setFFlota(e.target.value)}>
              <option value="">Todas</option>
              {store.flotas.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </Field>
          <Field label="Estructura" htmlFor="d-est">
            <select id="d-est" className="lm-select lm-select--dense" value={fEstructura} onChange={(e) => setFEstructura(e.target.value)}>
              <option value="">Todas</option>
              {store.estructuras.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </Field>
          {(fFlota || fEstructura) && <Button variant="text" icon="restart_alt" onClick={limpiar}>Restablecer</Button>}
        </div>

        {!store.listo ? <Loading text="Cargando drivers" /> : store.configs.filter((c) => c.guardada && c.estructuraId).length === 0 ? (
          <EmptyState icon="timelapse" title="Todavía no hay configuraciones con estructura"
            text="Los drivers se marcan en cada configuración, después de elegir su estructura"
            action={<Button variant="outlined" onClick={() => router.push("/configuracion")}>Ir a Flotas y configuraciones</Button>} />
        ) : lista.length === 0 ? (
          <EmptyState icon="search_off" title="No hay resultados" text="Ninguna configuración coincide con los filtros"
            action={<Button variant="outlined" onClick={limpiar}>Restablecer filtros</Button>} />
        ) : (
          <table className="lm-table">
            <thead>
              <tr>
                <th>Flota</th><th>Configuración</th><th>Estructura</th><th>Drivers</th>
                <th>Estado</th><th className="actions"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => {
                const f = store.flotas.find((x) => x.id === c.flotaId);
                const est = store.estructura(c.estructuraId)!;
                // Solo qué drivers tiene (kilometraje, ciclos, horas)
                const ef = driversEfectivos(c.drivers, est.raiz);
                const tiene = DRIVERS.filter((d) => cuentaDrivers(ef.drivers, d.id) > 0).map((d) => d.nombre);
                return (
                  <tr key={c.id}>
                    <td className="emph">{f?.nombre}</td>
                    <td>{c.unica ? <span className="muted">Única</span> : c.nombre}</td>
                    <td>{est.nombre}</td>
                    <td>{tiene.length ? tiene.join(", ") : <span className="muted">Sin drivers</span>}</td>
                    <td>{c.estado === "activa" ? <Tag tone="success">Activa</Tag> : <Tag tone="attention">En configuración</Tag>}</td>
                    <td className="actions">
                      <Menu label={`Acciones de ${store.etiqueta(c)}`} items={[
                        { label: "Modificar", icon: "edit", onSelect: () => router.push(`/configuracion/drivers/${c.id}`) },
                      ]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
      </>}
    </main>
  );
}

/**
 * Pestaña Cálculo de media: tabla con todos los cálculos (por flota y por línea).
 * Cada cálculo se añade o modifica en un dialog y se guarda al momento; se elimina con confirmación.
 */
function PestanaMedia() {
  const store = useStore();
  const snack = useSnackbar();
  const [filtro, setFiltro] = useState<"todos" | NivelMedia>("todos");
  const [editando, setEditando] = useState<FilaMedia | "nuevo" | null>(null);
  const [aEliminar, setAEliminar] = useState<FilaMedia | null>(null);
  if (!store.listo) return <Loading text="Cargando cálculo de media" />;

  const nombreDestino = (f: { nivel: NivelMedia; destino: string }) =>
    (f.nivel === "flota" ? store.flotas : LINEAS).find((x) => x.id === f.destino)?.nombre ?? f.destino;
  // Todas las filas, a partir de lo guardado por flota o línea
  const filas: FilaMedia[] = Object.entries(store.media).flatMap(([clave, lista]) => {
    const [nivel, destino] = clave.split(":") as [NivelMedia, string];
    return lista.filter((x) => x.driver && x.forma).map((x) => ({ nivel, destino, driver: x.driver as DriverId, forma: x.forma as FormaMedia }));
  });
  const ordenDriver = (d: DriverId) => DRIVERS.findIndex((x) => x.id === d);
  const lista = filas
    .filter((f) => filtro === "todos" || f.nivel === filtro)
    .sort((a, b) => a.nivel.localeCompare(b.nivel) || nombreDestino(a).localeCompare(nombreDestino(b)) || ordenDriver(a.driver) - ordenDriver(b.driver));
  const deClave = (nivel: NivelMedia, destino: string) => store.media[claveMedia(nivel, destino)] ?? [];

  const quitar = (f: FilaMedia) => store.guardarMedia(claveMedia(f.nivel, f.destino), deClave(f.nivel, f.destino).filter((x) => x.driver !== f.driver));
  const guardar = (nueva: FilaMedia) => {
    const antes = editando !== "nuevo" ? editando : null;
    const mismaClave = !!antes && antes.nivel === nueva.nivel && antes.destino === nueva.destino;
    // Si cambia de flota o línea, se quita de la anterior; en la nueva, se sustituye el del mismo driver
    if (antes && !mismaClave) quitar(antes);
    const actual = deClave(nueva.nivel, nueva.destino).filter((x) => x.driver !== nueva.driver && !(mismaClave && x.driver === antes!.driver));
    store.guardarMedia(claveMedia(nueva.nivel, nueva.destino), [...actual, { driver: nueva.driver, forma: nueva.forma }]);
    setEditando(null);
    snack(antes ? "Cálculo de media modificado" : `Cálculo de media de ${nombreDestino(nueva)} añadido`);
  };

  return (
    <section className="lm-surface lm-surface--p16 stack gap-15">
      <div className="row gap-15 wrap">
        <span className="muted grow">De qué drivers se calcula la media y cómo, para cada flota o línea. Es opcional.</span>
        <ButtonToggle label="Cálculos que se muestran" value={filtro} onChange={setFiltro}
          options={[{ value: "todos", label: `Todos (${filas.length})` }, { value: "flota", label: `Por flota (${filas.filter((f) => f.nivel === "flota").length})` }, { value: "linea", label: `Por línea (${filas.filter((f) => f.nivel === "linea").length})` }]} />
        <Button icon="add" onClick={() => setEditando("nuevo")}>Añadir cálculo de media</Button>
      </div>

      {filas.length === 0 ? (
        <EmptyState icon="functions" title="Todavía no hay cálculos de media" text="Añade uno para una flota o una línea"
          action={<Button variant="outlined" icon="add" onClick={() => setEditando("nuevo")}>Añadir cálculo de media</Button>} />
      ) : lista.length === 0 ? (
        <EmptyState icon="search_off" title="No hay resultados" text={`No hay cálculos ${filtro === "flota" ? "por flota" : "por línea"}`}
          action={<Button variant="outlined" onClick={() => setFiltro("todos")}>Ver todos</Button>} />
      ) : (
        <table className="lm-table">
          <thead>
            <tr><th>Calcular por</th><th>Flota o línea</th><th>Driver</th><th>Forma de cálculo</th><th className="actions"><span className="sr-only">Acciones</span></th></tr>
          </thead>
          <tbody>
            {lista.map((f) => (
              <tr key={`${f.nivel}:${f.destino}:${f.driver}`}>
                <td><Tag tone={f.nivel === "flota" ? "primary" : "neutral"}>{f.nivel === "flota" ? "Flota" : "Línea"}</Tag></td>
                <td className="emph">{nombreDestino(f)}</td>
                <td>{nombreDriver(f.driver)}</td>
                <td>{nombreForma(f.forma)}</td>
                <td className="actions">
                  <Menu label={`Acciones del cálculo de ${nombreDriver(f.driver)} en ${nombreDestino(f)}`} items={[
                    { label: "Modificar", icon: "edit", onSelect: () => setEditando(f) },
                    { label: "Eliminar", icon: "delete", onSelect: () => setAEliminar(f) },
                  ]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editando && (
        <DialogMedia fila={editando === "nuevo" ? undefined : editando} flotas={store.flotas.map((x) => ({ id: x.id, nombre: x.nombre }))}
          usados={(nivel, destino) => deClave(nivel, destino).map((x) => x.driver as DriverId)
            .filter((d) => !(editando !== "nuevo" && editando.nivel === nivel && editando.destino === destino && editando.driver === d))}
          onClose={() => setEditando(null)} onGuardar={guardar} />
      )}
      {aEliminar && (
        <Dialog title="¿Eliminar el cálculo de media?" onClose={() => setAEliminar(null)}
          message={`Se dejará de calcular la media de ${nombreDriver(aEliminar.driver).toLowerCase()} en ${nombreDestino(aEliminar)}.`}
          footer={<>
            <Button variant="outlined" onClick={() => setAEliminar(null)}>Cancelar</Button>
            <Button onClick={() => { quitar(aEliminar); setAEliminar(null); snack("Cálculo de media eliminado"); }}>Eliminar</Button>
          </>} />
      )}
    </section>
  );
}
