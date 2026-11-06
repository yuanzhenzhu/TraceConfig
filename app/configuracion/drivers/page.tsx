"use client";

// Drivers, con dos pestañas:
// - Configuración de drivers: los drivers de cada configuración (flota + estructura). No hay catálogo común:
//   cada configuración tiene los suyos, aunque comparta estructura con otra flota.
// - Cálculo de media: primero por flota o por línea, después la flota o línea concreta y sus cálculos.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Breadcrumb, Button, ButtonToggle, EmptyState, Field, Icon, Loading, Menu, Tag, useSnackbar } from "@/components/ds";
import { cuentaDrivers } from "@/components/drivers";
import { SeccionMedia } from "@/components/media";
import { DRIVERS, LINEAS, claveMedia, driversEfectivos, mediaCompleta, type CalculoMedia, type NivelMedia } from "@/lib/model";
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
 * Pestaña Cálculo de media. 1) Nivel: por flota o por línea. 2) La flota o línea concreta. 3) Sus cálculos,
 * con las formas de cálculo de ese nivel. Se edita sobre un borrador y se guarda.
 */
function PestanaMedia() {
  const store = useStore();
  const snack = useSnackbar();
  const [nivel, setNivel] = useState<NivelMedia>("flota");
  const [sel, setSel] = useState<Record<NivelMedia, string>>({ flota: "", linea: "" });
  const [borrador, setBorrador] = useState<CalculoMedia[] | null>(null);
  const [intentado, setIntentado] = useState(false);
  if (!store.listo) return <Loading text="Cargando cálculo de media" />;

  const opciones = nivel === "flota" ? store.flotas.map((f) => ({ id: f.id, nombre: f.nombre })) : LINEAS;
  const actual = opciones.find((o) => o.id === sel[nivel]) ?? opciones[0];
  const clave = actual ? claveMedia(nivel, actual.id) : "";
  const guardado = store.media[clave] ?? [];
  const valor = borrador ?? guardado;
  const cambiado = JSON.stringify(valor) !== JSON.stringify(guardado);
  const descartar = () => { setBorrador(null); setIntentado(false); };
  const guardar = () => {
    setIntentado(true);
    if (!mediaCompleta(valor) || !actual) return;
    store.guardarMedia(clave, valor.filter((x) => x.driver && x.forma));
    descartar();
    snack(`Cálculo de media de ${actual.nombre} guardado`);
  };
  const etiqueta = nivel === "flota" ? "Flota" : "Línea";

  return (
    <section className="lm-surface lm-surface--p24 stack gap-20">
      <div className="row gap-10">
        <h2 className="lm-title-medium grow" style={{ margin: 0 }}>Cálculo de media</h2>
        <span className="lm-body-small muted">Opcional</span>
      </div>
      <div className="row gap-30 wrap" style={{ alignItems: "flex-end" }}>
        <div className="stack gap-10">
          <span className="lm-field__label">1. Calcular la media por</span>
          <ButtonToggle label="Calcular la media por" value={nivel} onChange={(v) => { if (!cambiado) { setNivel(v); descartar(); } }}
            options={[{ value: "flota", label: "Flota" }, { value: "linea", label: "Línea" }]} />
        </div>
        <div style={{ width: 320 }}>
          <Field label={`2. ${etiqueta}`} htmlFor="m-sel">
            <select id="m-sel" className="lm-select" value={actual?.id ?? ""} disabled={cambiado || !opciones.length}
              onChange={(e) => { setSel({ ...sel, [nivel]: e.target.value }); descartar(); }}>
              {opciones.map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
            </select>
          </Field>
        </div>
        {cambiado && <span className="lm-body-small muted" style={{ paddingBottom: "var(--lm-space-10)" }}>Guarda o descarta los cambios para cambiar de {etiqueta.toLowerCase()}</span>}
      </div>
      {!actual ? (
        <EmptyState icon="train" title="Todavía no hay flotas" text="Crea una flota en Flotas y configuraciones" />
      ) : (
        <>
          <div style={{ borderTop: "1px solid var(--lm-sys-outline-variant)" }} />
          <h3 className="lm-title-small" style={{ margin: 0 }}>3. Cálculos de {actual.nombre}</h3>
          <SeccionMedia key={clave} nivel={nivel} nombre={actual.nombre} valor={valor} onChange={setBorrador} intentado={intentado} />
          <div className="row gap-10" style={{ justifyContent: "flex-end", borderTop: "1px solid var(--lm-sys-outline-variant)", paddingTop: "var(--lm-space-15)" }}>
            {cambiado && <span className="grow lm-body-small muted">Hay cambios sin guardar</span>}
            <Button variant="outlined" disabled={!cambiado} onClick={descartar}>Descartar cambios</Button>
            <Button disabled={!cambiado} onClick={guardar}>Guardar cambios</Button>
          </div>
        </>
      )}
    </section>
  );
}
