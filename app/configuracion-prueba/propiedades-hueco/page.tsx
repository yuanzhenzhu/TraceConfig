"use client";

// (Prueba, 18-11-2026) Propiedades de hueco, con dos cosas separadas en dos pestañas:
// - Definición por estructura (a la izquierda, por defecto): qué propiedades tiene cada hueco de una estructura.
//   La comparten todas las flotas que la usan.
// - Valores por flota: cada configuración (flota + estructura) con cuántos valores tiene rellenos. Se abren y se editan.
// Sustituye al select de estructura con la etiqueta «En uso en N configuraciones».

import Link from "next/link";
import { useEffect, useState } from "react";
import { Breadcrumb, EmptyState, Field, Icon, InfoTooltip, Loading, Tag } from "@/components/ds";
import { configsCon, huecosConPropiedades, valoresRellenos } from "@/components/configuracion-prueba/props-hueco";
import { useStore } from "@/lib/store";

type Pestana = "valores" | "definicion";

export default function PropiedadesHuecoPage() {
  const store = useStore();
  const [pestana, setPestana] = useState<Pestana>("definicion");
  const [fFlota, setFFlota] = useState("");
  const [fEst, setFEst] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("pestana") === "valores") setPestana("valores");
  }, []);
  const cambiarPestana = (p: Pestana) => {
    setPestana(p);
    window.history.replaceState(null, "", `/configuracion-prueba/propiedades-hueco${p === "valores" ? "?pestana=valores" : ""}`);
  };

  if (!store.listo) return <main className="lm-page"><Loading text="Cargando propiedades de hueco" /></main>;

  const flotaDe = (id: string) => store.flotas.find((f) => f.id === id)?.nombre ?? "";
  const configs = store.configs.filter((c) => c.guardada && c.estructuraId)
    .filter((c) => (!fFlota || c.flotaId === fFlota) && (!fEst || c.estructuraId === fEst))
    .sort((a, b) => flotaDe(a.flotaId).localeCompare(flotaDe(b.flotaId), "es") || (store.estructura(a.estructuraId)?.nombre ?? "").localeCompare(store.estructura(b.estructuraId)?.nombre ?? "", "es"));

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion-prueba" }, { label: "Propiedades de hueco" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Propiedades de hueco</h1>
          <span className="muted">Cada estructura define qué propiedades tiene cada hueco (por ejemplo, el lado de una rueda). Sus valores son de cada flota.</span>
        </div>
      </div>

      <div className="lm-tabs" role="tablist">
        <button role="tab" className="lm-tab" aria-selected={pestana === "definicion"} onClick={() => cambiarPestana("definicion")}><Icon name="list" /> Definición por estructura</button>
        <button role="tab" className="lm-tab" aria-selected={pestana === "valores"} onClick={() => cambiarPestana("valores")}><Icon name="table_rows" /> Valores por flota</button>
      </div>

      {pestana === "valores" ? (
        <section className="lm-surface lm-surface--p16">
          <div className="lm-filters">
            <Field label="Flota" htmlFor="ph-flota">
              <select id="ph-flota" className="lm-select lm-select--dense" value={fFlota} onChange={(e) => setFFlota(e.target.value)}>
                <option value="">Todas</option>
                {store.flotas.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </Field>
            <Field label="Estructura" htmlFor="ph-est">
              <select id="ph-est" className="lm-select lm-select--dense" value={fEst} onChange={(e) => setFEst(e.target.value)}>
                <option value="">Todas</option>
                {store.estructuras.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Field>
          </div>
          {configs.length === 0 ? (
            <EmptyState icon="search_off" title="No hay configuraciones" text={fFlota || fEst ? "Ninguna flota con estructura coincide con los filtros" : "Asigna una estructura a una flota para dar valores a sus propiedades de hueco"} />
          ) : (
            <table className="lm-table">
              <thead><tr><th>Flota</th><th>Estructura</th><th className="num">Huecos con propiedades</th><th>Valores</th><th className="actions"><span className="sr-only">Acciones</span></th></tr></thead>
              <tbody>
                {configs.map((c) => {
                  const est = store.estructura(c.estructuraId)!;
                  const nH = huecosConPropiedades(est);
                  const { total, rellenos } = valoresRellenos(est, c.valoresHueco);
                  return (
                    <tr key={c.id}>
                      <td className="emph">{flotaDe(c.flotaId)}</td>
                      <td>{est.nombre}</td>
                      <td className="num">{nH || "—"}</td>
                      <td>
                        {nH === 0 ? <span className="muted">Sin propiedades de hueco</span>
                          : rellenos === 0 ? <Tag tone="attention">Sin valores</Tag>
                          : rellenos < total ? <Tag tone="attention" num={rellenos}>{`de ${total} con valor`}</Tag>
                          : <Tag tone="success">Completos ({total})</Tag>}
                      </td>
                      <td className="actions">
                        {nH === 0
                          ? <Link className="lm-btn lm-btn--text lm-btn--small" href={`/configuracion-prueba/propiedades-hueco/estructura/${est.id}`}>Definir propiedades de hueco</Link>
                          : <Link className="lm-btn lm-btn--tonal lm-btn--small" href={`/configuracion-prueba/propiedades-hueco/valores/${c.id}`}>Ver y editar valores</Link>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      ) : (
        <section className="lm-surface lm-surface--p16">
          {store.estructuras.length === 0 ? (
            <EmptyState icon="table_rows" title="Todavía no hay estructuras" text="Crea una estructura en Estructuras para definir sus propiedades de hueco" />
          ) : (
            <table className="lm-table">
              <thead><tr><th>Estructura</th><th className="num">Huecos con propiedades</th><th>Flotas que la usan</th><th className="actions"><span className="sr-only">Acciones</span></th></tr></thead>
              <tbody>
                {store.estructuras.map((e) => {
                  const nH = huecosConPropiedades(e);
                  const flotas = [...new Set(configsCon(store.configs, e.id).map((c) => flotaDe(c.flotaId)))];
                  return (
                    <tr key={e.id}>
                      <td>
                        <span className="row gap-5">
                          <span className="emph">{e.nombre}</span>
                          {e.descripcion && <InfoTooltip text={e.descripcion} label={`Descripción de ${e.nombre}`} />}
                        </span>
                      </td>
                      <td className="num">{nH || <span className="muted">Sin propiedades de hueco</span>}</td>
                      <td>{flotas.length ? flotas.join(", ") : <span className="muted">Ninguna</span>}</td>
                      <td className="actions">
                        <Link className="lm-btn lm-btn--tonal lm-btn--small" href={`/configuracion-prueba/propiedades-hueco/estructura/${e.id}`}>{nH ? "Editar definición" : "Definir propiedades de hueco"}</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}
    </main>
  );
}
