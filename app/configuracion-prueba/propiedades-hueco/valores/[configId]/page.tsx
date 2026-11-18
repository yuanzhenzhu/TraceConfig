"use client";

// (Prueba, 18-11-2026) Valores de propiedades de hueco de una flota con una estructura (una configuración).
// Se ven por hueco y se cambian aquí; se guardan solo para esta flota. La definición (qué propiedades tiene cada hueco)
// es de la estructura y se cambia en Propiedades de hueco › Definición por estructura.

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Banner, Breadcrumb, Button, EmptyState, Loading, Tag, useSnackbar } from "@/components/ds";
import { ListaPropsHueco } from "@/components/configuracion-prueba/propiedades";
import { valoresRellenos } from "@/components/configuracion-prueba/props-hueco";
import type { PropsHueco } from "@/lib/model";
import { useStore } from "@/lib/store";

export default function ValoresHuecoPage() {
  const { configId } = useParams<{ configId: string }>();
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const c = store.configs.find((x) => x.id === configId);
  const est = c ? store.estructura(c.estructuraId) : undefined;
  const flota = c ? store.flotas.find((f) => f.id === c.flotaId) : undefined;
  const [borrador, setBorrador] = useState<PropsHueco | null>(null);

  useEffect(() => { if (c && !borrador) setBorrador(structuredClone(c.valoresHueco ?? {})); }, [c, borrador]);

  const volver = "/configuracion-prueba/propiedades-hueco";
  if (!store.listo || (c && !borrador)) return <main className="lm-page"><Loading text="Cargando valores" /></main>;
  if (!c || !est || !flota) {
    return (
      <main className="lm-page">
        <EmptyState icon="search_off" title="No se ha encontrado la configuración" text="Puede que se haya eliminado o que el enlace no sea correcto"
          action={<Button onClick={() => router.push(volver)}>Volver a Propiedades de hueco</Button>} />
      </main>
    );
  }

  const def = est.propsHueco ?? {};
  const hayDef = Object.values(def).some((x) => Object.keys(x).length);
  const { total, rellenos } = valoresRellenos(est, borrador!);
  const cambiado = JSON.stringify(borrador) !== JSON.stringify(c.valoresHueco ?? {});
  const otras = store.configs.filter((x) => x.guardada && x.estructuraId === est.id && x.id !== c.id);
  const guardar = () => {
    store.actualizarConfig(c.id, { valoresHueco: borrador! });
    snack(`Valores de propiedades de hueco guardados en ${flota.nombre} · ${est.nombre}`);
  };

  return (
    <main className="lm-page" style={{ paddingBottom: 120 }}>
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion-prueba" }, { label: "Propiedades de hueco", href: volver }, { label: `${flota.nombre} · ${est.nombre}` }]} />
          <span className="row gap-15">
            <h1 className="lm-headline-small" style={{ margin: 0 }}>{flota.nombre} · {est.nombre}</h1>
            {hayDef && (rellenos === total ? <Tag tone="success">Completos</Tag> : <Tag tone="attention">{rellenos} de {total} con valor</Tag>)}
          </span>
          <span className="muted">Valores de propiedades de hueco de esta flota. Las propiedades de cada hueco las define {est.nombre}.</span>
        </div>
      </div>

      <section className="lm-surface lm-surface--p24 stack gap-20">
        {!hayDef ? (
          <EmptyState icon="radio_button_checked" title={`${est.nombre} no tiene propiedades de hueco`} text="Defínelas primero en la estructura para poder darles valor"
            action={<Link className="lm-btn lm-btn--outlined" href={`/configuracion-prueba/propiedades-hueco/estructura/${est.id}`}>Definir propiedades</Link>} />
        ) : (
          <>
            {otras.length > 0 && (
              <Banner type="info">
                Estos valores son solo de {flota.nombre}. {otras.map((x) => store.flotas.find((f) => f.id === x.flotaId)?.nombre).join(", ")} también {otras.length === 1 ? "usa" : "usan"} {est.nombre}, con sus propios valores.
              </Banner>
            )}
            <ListaPropsHueco raiz={est.raiz} definicion={def} valor={borrador!} onChange={setBorrador} />
          </>
        )}
      </section>

      {hayDef && (
        <footer className="lm-footer-bar">
          <div className="row gap-10" style={{ maxWidth: 1360, margin: "0 auto", padding: "var(--lm-space-15) var(--lm-space-30)" }}>
            <Button variant="text" icon="arrow_back_ios_new" onClick={() => router.push(volver)}>Volver</Button>
            <span className="grow lm-body-small muted">{rellenos} de {total} valores rellenos{cambiado && " · Cambios sin guardar"}</span>
            <Button variant="outlined" disabled={!cambiado} onClick={() => setBorrador(structuredClone(c.valoresHueco ?? {}))}>Descartar cambios</Button>
            <Button disabled={!cambiado} onClick={guardar}>Guardar cambios</Button>
          </div>
        </footer>
      )}
    </main>
  );
}
