"use client";

// (Prueba, 18-11-2026) Propiedades de hueco: apartado propio del menú, separado de Estructuras.
// Se elige una estructura y se marca qué propiedades tiene cada posición (hueco). Las comparten todas las flotas
// que usan esa estructura; sus valores se dan en cada configuración (paso Propiedades de hueco del asistente).

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Banner, Breadcrumb, Button, EmptyState, Field, Loading, Tag, useSnackbar } from "@/components/ds";
import { MatrizPropsHueco, resumenPropiedades } from "@/components/configuracion-prueba/propiedades";
import { etiquetaCfg } from "@/components/configuracion-prueba/nombre";
import type { PropsHueco } from "@/lib/model";
import { useStore } from "@/lib/store";

export default function PropiedadesHuecoPage() {
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const [estId, setEstId] = useState("");
  const [borrador, setBorrador] = useState<PropsHueco | null>(null);

  // ?estructura=<id>: se viene del asistente o de otra pantalla con una estructura concreta
  useEffect(() => {
    if (!store.listo || estId) return;
    const q = new URLSearchParams(window.location.search).get("estructura");
    setEstId(q && store.estructura(q) ? q : store.estructuras[0]?.id ?? "");
  }, [store.listo, store, estId]);

  const est = store.estructura(estId);
  useEffect(() => { setBorrador(est ? structuredClone(est.propsHueco ?? {}) : null); }, [est?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!store.listo) return <main className="lm-page"><Loading text="Cargando estructuras" /></main>;

  const usos = est ? store.usosDe(est.id) : [];
  const hayCambios = !!est && !!borrador && JSON.stringify(est.propsHueco ?? {}) !== JSON.stringify(borrador);
  const nHuecos = est && borrador ? resumenPropiedades(est.raiz, { propsCategoria: {}, propsHueco: borrador }).nHuecos : 0;
  const guardar = () => {
    if (!est || !borrador) return;
    store.guardarEstructura({ ...est, propsHueco: borrador });
    snack(usos.length ? `Propiedades de hueco de ${est.nombre} guardadas en ${usos.length} configuraciones` : `Propiedades de hueco de ${est.nombre} guardadas`);
  };
  const cambiarEstructura = (id: string) => {
    setEstId(id);
    window.history.replaceState(null, "", `/configuracion-prueba/propiedades-hueco?estructura=${id}`);
  };

  return (
    <main className="lm-page" style={{ paddingBottom: 120 }}>
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion-prueba" }, { label: "Propiedades de hueco" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Propiedades de hueco</h1>
          <span className="muted">Qué propiedades tiene cada posición de una estructura (por ejemplo, el lado de una rueda). Sus valores se dan en cada configuración.</span>
        </div>
      </div>

      {store.estructuras.length === 0 ? (
        <section className="lm-surface lm-surface--p16">
          <EmptyState icon="table_rows" title="Todavía no hay estructuras" text="Crea una estructura para poder definir sus propiedades de hueco"
            action={<Button variant="outlined" icon="add" onClick={() => router.push("/configuracion-prueba/estructuras/nueva")}>Nueva estructura</Button>} />
        </section>
      ) : (
        <div className="stack gap-20">
          <section className="lm-surface lm-surface--p16">
            <div className="lm-filters">
              <Field label="Estructura" htmlFor="ph-est" style={{ width: 320 }}>
                <select id="ph-est" className="lm-select lm-select--dense" value={estId} onChange={(e) => cambiarEstructura(e.target.value)}>
                  {store.estructuras.map((e) => <option key={e.id} value={e.id}>{e.nombre} · {e.descripcion}</option>)}
                </select>
              </Field>
              {est && (usos.length ? <Tag tone="primary">En uso en {usos.length} {usos.length === 1 ? "configuración" : "configuraciones"}</Tag> : <Tag tone="neutral">Sin usar</Tag>)}
            </div>
          </section>

          {est && borrador && (
            <section className="lm-surface lm-surface--p24 stack gap-20">
              {usos.length > 0 && (
                <Banner type="attention" title={`${est.nombre} la usan ${usos.length} ${usos.length === 1 ? "configuración" : "configuraciones"}`}>
                  Los cambios se aplicarán a todas: {usos.map((c) => etiquetaCfg(store, c)).join(", ")}.
                </Banner>
              )}
              <MatrizPropsHueco raiz={est.raiz} valor={borrador} onChange={setBorrador} />
            </section>
          )}
        </div>
      )}

      {est && (
        <footer className="lm-footer-bar">
          <div className="row gap-10" style={{ maxWidth: 1360, margin: "0 auto", padding: "var(--lm-space-15) var(--lm-space-30)" }}>
            <span className="grow lm-body-small muted">{nHuecos ? `${nHuecos} huecos con propiedades` : "Sin propiedades de hueco"}{hayCambios && " · Cambios sin guardar"}</span>
            <Button variant="outlined" disabled={!hayCambios} onClick={() => setBorrador(structuredClone(est.propsHueco ?? {}))}>Descartar cambios</Button>
            <Button disabled={!hayCambios} onClick={guardar}>Guardar cambios</Button>
          </div>
        </footer>
      )}
    </main>
  );
}
