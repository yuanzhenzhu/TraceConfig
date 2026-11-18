"use client";

// (Prueba, 18-11-2026) Definición de propiedades de hueco de una estructura: qué propiedades tiene cada hueco.
// La comparten todas las flotas que usan la estructura; los valores son de cada flota (Valores por flota).

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Banner, Breadcrumb, Button, EmptyState, Loading, useSnackbar } from "@/components/ds";
import { MatrizPropsHueco } from "@/components/configuracion-prueba/propiedades";
import { configsCon, huecosConPropiedades } from "@/components/configuracion-prueba/props-hueco";
import type { PropsHueco } from "@/lib/model";
import { useStore } from "@/lib/store";

export default function DefinicionHuecoPage() {
  const { id } = useParams<{ id: string }>();
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const est = store.estructura(id);
  const [borrador, setBorrador] = useState<PropsHueco | null>(null);

  useEffect(() => { if (est && !borrador) setBorrador(structuredClone(est.propsHueco ?? {})); }, [est, borrador]);

  const volver = "/configuracion-prueba/propiedades-hueco?pestana=definicion";
  if (!store.listo || (est && !borrador)) return <main className="lm-page"><Loading text="Cargando estructura" /></main>;
  if (!est) {
    return (
      <main className="lm-page">
        <EmptyState icon="search_off" title="No se ha encontrado la estructura" action={<Button onClick={() => router.push(volver)}>Volver a Propiedades de hueco</Button>} />
      </main>
    );
  }

  const usos = configsCon(store.configs, est.id);
  const flotas = [...new Set(usos.map((c) => store.flotas.find((f) => f.id === c.flotaId)?.nombre ?? ""))];
  const cambiado = JSON.stringify(borrador) !== JSON.stringify(est.propsHueco ?? {});
  const nH = huecosConPropiedades({ ...est, propsHueco: borrador! });
  const guardar = () => {
    store.guardarEstructura({ ...est, propsHueco: borrador! });
    snack(flotas.length ? `Propiedades de hueco de ${est.nombre} guardadas (${flotas.length} ${flotas.length === 1 ? "flota" : "flotas"})` : `Propiedades de hueco de ${est.nombre} guardadas`);
  };

  return (
    <main className="lm-page" style={{ paddingBottom: 120 }}>
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion-prueba" }, { label: "Propiedades de hueco", href: volver }, { label: est.nombre }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Definición de propiedades de hueco · {est.nombre}</h1>
          <span className="muted">Qué propiedades tiene cada hueco de {est.nombre}. Los valores se dan por flota, en Valores por flota.</span>
        </div>
      </div>

      <section className="lm-surface lm-surface--p24 stack gap-20">
        {flotas.length > 0 && (
          <Banner type="attention" title={`La usan ${flotas.length} ${flotas.length === 1 ? "flota" : "flotas"}: ${flotas.join(", ")}`}>
            El cambio se aplica a todas. Si quitas una propiedad de un hueco, sus valores dejan de verse en esas flotas.
          </Banner>
        )}
        <MatrizPropsHueco raiz={est.raiz} valor={borrador!} onChange={setBorrador} />
      </section>

      <footer className="lm-footer-bar">
        <div className="row gap-10" style={{ maxWidth: 1360, margin: "0 auto", padding: "var(--lm-space-15) var(--lm-space-30)" }}>
          <Button variant="text" icon="arrow_back_ios_new" onClick={() => router.push(volver)}>Volver</Button>
          <span className="grow lm-body-small muted">{nH ? `${nH} huecos con propiedades` : "Sin propiedades de hueco"}{cambiado && " · Cambios sin guardar"}</span>
          <Button variant="outlined" disabled={!cambiado} onClick={() => setBorrador(structuredClone(est.propsHueco ?? {}))}>Descartar cambios</Button>
          <Button disabled={!cambiado} onClick={guardar}>Guardar cambios</Button>
        </div>
      </footer>
    </main>
  );
}
