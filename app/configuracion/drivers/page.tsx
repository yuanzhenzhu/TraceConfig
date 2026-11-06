"use client";

// Drivers, con dos pestañas:
// - Configuración de drivers: los drivers de cada configuración (flota + estructura). No hay catálogo común:
//   cada configuración tiene los suyos, aunque comparta estructura con otra flota.
// - Cálculo de media: de qué drivers se calcula la media y cómo. Es de cada flota (común a sus configuraciones).

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Breadcrumb, Button, EmptyState, Field, Icon, Loading, Menu, Tag, useSnackbar } from "@/components/ds";
import { cuentaDrivers } from "@/components/drivers";
import { SeccionMedia } from "@/components/media";
import { DRIVERS, driversEfectivos, mediaCompleta, type CalculoMedia } from "@/lib/model";
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

/** Pestaña Cálculo de media: de cada flota. Se elige la flota, se edita sobre un borrador y se guarda. */
function PestanaMedia() {
  const store = useStore();
  const snack = useSnackbar();
  const [flotaId, setFlotaId] = useState("");
  const [borrador, setBorrador] = useState<CalculoMedia[] | null>(null);
  const [intentado, setIntentado] = useState(false);
  if (!store.listo) return <Loading text="Cargando cálculo de media" />;
  if (!store.flotas.length) {
    return <section className="lm-surface lm-surface--p16"><EmptyState icon="train" title="Todavía no hay flotas" text="El cálculo de media se configura para cada flota" /></section>;
  }
  const flota = store.flotas.find((f) => f.id === flotaId) ?? store.flotas[0];
  const guardado = store.media[flota.id] ?? [];
  const valor = borrador ?? guardado;
  const cambiado = JSON.stringify(valor) !== JSON.stringify(guardado);
  const descartar = () => { setBorrador(null); setIntentado(false); };
  const guardar = () => {
    setIntentado(true);
    if (!mediaCompleta(valor)) return;
    store.guardarMedia(flota.id, valor.filter((x) => x.driver && x.forma));
    descartar();
    snack(`Cálculo de media de ${flota.nombre} guardado`);
  };
  return (
    <section className="lm-surface lm-surface--p24 stack gap-20">
      <div className="row gap-10">
        <h2 className="lm-title-medium grow" style={{ margin: 0 }}>Cálculo de media</h2>
        <span className="lm-body-small muted">Opcional · de cada flota, común a sus configuraciones</span>
      </div>
      <div className="row gap-15" style={{ alignItems: "flex-end" }}>
        <div style={{ width: 320 }}>
          <Field label="Flota" htmlFor="m-flota">
            <select id="m-flota" className="lm-select" value={flota.id} disabled={cambiado} onChange={(e) => { setFlotaId(e.target.value); descartar(); }}>
              {store.flotas.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </Field>
        </div>
        {cambiado && <span className="lm-body-small muted" style={{ paddingBottom: "var(--lm-space-10)" }}>Guarda o descarta los cambios para cambiar de flota</span>}
      </div>
      <SeccionMedia valor={valor} onChange={setBorrador} intentado={intentado} />
      <div className="row gap-10" style={{ justifyContent: "flex-end", borderTop: "1px solid var(--lm-sys-outline-variant)", paddingTop: "var(--lm-space-15)" }}>
        {cambiado && <span className="grow lm-body-small muted">Hay cambios sin guardar</span>}
        <Button variant="outlined" disabled={!cambiado} onClick={descartar}>Descartar cambios</Button>
        <Button disabled={!cambiado} onClick={guardar}>Guardar cambios</Button>
      </div>
    </section>
  );
}
