"use client";

// Drivers: acceso directo a los drivers de cada configuración (flota + estructura).
// No hay catálogo común: cada configuración tiene los suyos, aunque comparta estructura con otra flota.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Breadcrumb, Button, EmptyState, Field, Loading, Menu, Tag } from "@/components/ds";
import { cuentaDrivers } from "@/components/drivers";
import { DRIVERS, driversEfectivos } from "@/lib/model";
import { useStore } from "@/lib/store";

export default function DriversPage() {
  const store = useStore();
  const router = useRouter();
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
          <span className="muted">Los drivers y el cálculo de drivers para SMS son de cada configuración: una flota con una estructura. Dos flotas que usan la misma estructura pueden contar la vida de sus activos de forma distinta.</span>
        </div>
      </div>

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
                <th>Flota</th><th>Configuración</th><th>Estructura</th><th>Drivers</th><th>Cálculo de drivers para SMS</th>
                <th>Estado</th><th className="actions"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => {
                const f = store.flotas.find((x) => x.id === c.flotaId);
                const est = store.estructura(c.estructuraId)!;
                // Solo qué drivers tiene (kilometraje, ciclos, horas) y si tiene cálculo en SMS
                const ef = driversEfectivos(c.drivers, est.raiz);
                const tiene = DRIVERS.filter((d) => cuentaDrivers(ef.drivers, d.id) > 0).map((d) => d.nombre);
                const sms = !!f?.usaSms && (c.sms ?? []).some((x) => x.driver && x.forma);
                return (
                  <tr key={c.id}>
                    <td className="emph">{f?.nombre}</td>
                    <td>{c.unica ? <span className="muted">Única</span> : c.nombre}</td>
                    <td>{est.nombre}</td>
                    <td>{tiene.length ? tiene.join(", ") : <span className="muted">Sin drivers</span>}</td>
                    <td>{sms ? "Sí" : "No"}</td>
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
    </main>
  );
}
