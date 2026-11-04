"use client";

// Drivers: acceso directo a los drivers de cada configuración (flota + estructura).
// No hay catálogo común: cada configuración tiene los suyos, aunque comparta estructura con otra flota.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Breadcrumb, Button, EmptyState, Field, Loading, Tag } from "@/components/ds";
import { ResumenDrivers, cuentaDrivers } from "@/components/drivers";
import { DRIVERS, fecha } from "@/lib/model";
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
          <span className="muted">Los drivers son de cada configuración: una flota con una estructura. Dos flotas que usan la misma estructura pueden contar la vida de sus activos de forma distinta.</span>
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
                <th>Flota</th><th>Configuración</th><th>Estructura</th><th>Drivers</th><th className="num">Heredables</th>
                <th>Estado</th><th>Últ. actualización</th><th className="actions"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => {
                const f = store.flotas.find((x) => x.id === c.flotaId);
                const est = store.estructura(c.estructuraId)!;
                const valor = c.drivers ?? { drivers: {}, heredables: {} };
                const heredables = DRIVERS.reduce((s, d) => s + cuentaDrivers(valor.heredables, d.id), 0);
                return (
                  <tr key={c.id}>
                    <td className="emph">{f?.nombre}</td>
                    <td>{c.unica ? <span className="muted">Única</span> : c.nombre}</td>
                    <td>{est.nombre}</td>
                    <td>{c.drivers ? <ResumenDrivers valor={c.drivers} /> : <span className="muted">Kilometraje por defecto</span>}</td>
                    <td className="num">{c.drivers ? heredables : "—"}</td>
                    <td>{c.estado === "activa" ? <Tag tone="success">Activa</Tag> : <Tag tone="attention">En configuración</Tag>}</td>
                    <td className="muted">{fecha(c.actualizada)}</td>
                    <td className="actions">
                      <Button variant="outlined" small onClick={() => router.push(`/configuracion/drivers/${c.id}`)}>Modificar</Button>
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
