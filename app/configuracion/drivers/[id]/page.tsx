"use client";

// Modificar los drivers de una configuración (flota + estructura) y su cálculo de media. Solo le afecta a ella.
// Dos secciones: Configuración de drivers y Cálculo de media.

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Banner, Breadcrumb, Button, EmptyState, Loading, Tag, useSnackbar } from "@/components/ds";
import { EditorDrivers } from "@/components/drivers";
import { SeccionMedia } from "@/components/media";
import { driversIniciales, mediaCompleta, type CalculoMedia, type DriversConfig } from "@/lib/model";
import { useStore } from "@/lib/store";

export default function EditarDriversPage() {
  const { id } = useParams<{ id: string }>();
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const c = store.configs.find((x) => x.id === id);
  const est = c ? store.estructura(c.estructuraId) : undefined;
  const [borrador, setBorrador] = useState<DriversConfig | null>(null);
  const [media, setMedia] = useState<CalculoMedia[]>([]);
  const [intentado, setIntentado] = useState(false);

  useEffect(() => {
    if (!store.listo || borrador || !c || !est) return;
    setBorrador(structuredClone(c.drivers && c.drivers.estructuraId === est.id ? c.drivers : driversIniciales(est.raiz)));
    setMedia(structuredClone(c.media ?? []));
  }, [store.listo, borrador, c, est]);

  if (!store.listo || (c && est && !borrador)) return <main className="lm-page"><Loading text="Cargando drivers" /></main>;
  if (!c || !est || !borrador) {
    return (
      <main className="lm-page">
        <EmptyState icon="search_off" title="No se ha encontrado la configuración" text="Puede que se haya descartado o que todavía no tenga estructura"
          action={<Button onClick={() => router.push("/configuracion/drivers")}>Volver a Drivers</Button>} />
      </main>
    );
  }

  const flota = store.flotas.find((f) => f.id === c.flotaId);
  const nombre = store.etiqueta(c);
  const original = c.drivers ? JSON.stringify([c.drivers.drivers, c.drivers.heredables]) : "";
  const cambiado = JSON.stringify([borrador.drivers, borrador.heredables]) !== original || JSON.stringify(media) !== JSON.stringify(c.media ?? []);
  const otras = store.usosDe(est.id).filter((x) => x.id !== c.id);

  const guardar = () => {
    setIntentado(true);
    if (!mediaCompleta(media)) return; // cálculo de media a medias
    store.actualizarConfig(c.id, { drivers: { ...borrador, estructuraId: est.id }, media });
    snack(`Drivers de ${nombre} guardados`);
    router.push("/configuracion/drivers");
  };

  return (
    <main className="lm-page" style={{ paddingBottom: 120 }}>
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion" }, { label: "Drivers", href: "/configuracion/drivers" }, { label: nombre }]} />
          <span className="row gap-15">
            <h1 className="lm-headline-small" style={{ margin: 0 }}>Drivers de {nombre}</h1>
            {c.estado === "activa" ? <Tag tone="success">Activa</Tag> : <Tag tone="attention">En configuración</Tag>}
          </span>
          <span className="muted">{flota?.nombre} · {est.nombre} · {c.unidades} unidades</span>
        </div>
      </div>

      <div className="stack gap-20">
        <Banner type="info" title="Solo afecta a esta configuración">
          {otras.length
            ? `${est.nombre} también la usan ${otras.map((x) => store.etiqueta(x)).join(", ")}, con sus propios drivers: no cambian.`
            : `Ninguna otra configuración usa ${est.nombre}.`}
          {c.estado === "activa" && " Al ser una configuración activa, las plantillas nuevas pedirán los valores iniciales de los drivers que añadas."}
        </Banner>
        <section className="lm-surface lm-surface--p24 stack gap-20">
          <h2 className="lm-title-medium" style={{ margin: 0 }}>Configuración de drivers</h2>
          <EditorDrivers raiz={est.raiz} valor={borrador} onChange={setBorrador} />
        </section>
        <section className="lm-surface lm-surface--p24 stack gap-20">
          <div className="row gap-10">
            <h2 className="lm-title-medium grow" style={{ margin: 0 }}>Cálculo de media</h2>
            <span className="lm-body-small muted">Opcional</span>
          </div>
          <SeccionMedia valor={media} onChange={setMedia} intentado={intentado} />
        </section>
      </div>

      <footer className="lm-footer-bar">
        <div className="row gap-10" style={{ maxWidth: 1360, margin: "0 auto", padding: "var(--lm-space-15) var(--lm-space-30)" }}>
          <span className="grow lm-body-small muted">{est.nombre}{cambiado && " · Hay cambios sin guardar"}</span>
          <Button variant="outlined" onClick={() => router.push("/configuracion/drivers")}>Cancelar</Button>
          <Button disabled={!cambiado} onClick={guardar}>Guardar cambios</Button>
        </div>
      </footer>
    </main>
  );
}
