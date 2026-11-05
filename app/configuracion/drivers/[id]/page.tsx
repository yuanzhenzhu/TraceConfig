"use client";

// Modificar los drivers de una configuración (flota + estructura) y su cálculo en SMS. Solo le afecta a ella.

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Banner, Breadcrumb, Button, EmptyState, Loading, Tag, useSnackbar } from "@/components/ds";
import { EditorDrivers } from "@/components/drivers";
import { SeccionSms } from "@/components/sms";
import { driversIniciales, type CalculoSms, type DriversConfig } from "@/lib/model";
import { useStore } from "@/lib/store";

export default function EditarDriversPage() {
  const { id } = useParams<{ id: string }>();
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const c = store.configs.find((x) => x.id === id);
  const est = c ? store.estructura(c.estructuraId) : undefined;
  const [borrador, setBorrador] = useState<DriversConfig | null>(null);
  const [sms, setSms] = useState<CalculoSms[]>([]);
  const [intentado, setIntentado] = useState(false);

  useEffect(() => {
    if (!store.listo || borrador || !c || !est) return;
    setBorrador(structuredClone(c.drivers && c.drivers.estructuraId === est.id ? c.drivers : driversIniciales(est.raiz)));
    setSms(structuredClone(c.sms ?? []));
  }, [store.listo, borrador, c, est]);

  if (!store.listo || (c && est && !borrador)) return <main className="lm-page"><Loading text="Cargando drivers" /></main>;
  if (!c || !est || !borrador) {
    return (
      <main className="lm-page">
        <EmptyState icon="search_off" title="No se ha encontrado la configuración" text="Puede que se haya descartado o que todavía no tenga estructura"
          action={<Button onClick={() => router.push("/configuracion/drivers")}>Volver a Drivers y cálculo para SMS</Button>} />
      </main>
    );
  }

  const flota = store.flotas.find((f) => f.id === c.flotaId);
  const nombre = store.etiqueta(c);
  const original = c.drivers ? JSON.stringify([c.drivers.drivers, c.drivers.heredables]) : "";
  const cambiado = JSON.stringify([borrador.drivers, borrador.heredables]) !== original || JSON.stringify(sms) !== JSON.stringify(c.sms ?? []);
  const otras = store.usosDe(est.id).filter((x) => x.id !== c.id);

  const guardar = () => {
    setIntentado(true);
    if (sms.some((x) => !x.driver || !x.forma)) return; // cálculo en SMS a medias
    store.actualizarConfig(c.id, { drivers: { ...borrador, estructuraId: est.id }, sms });
    snack(`Drivers de ${nombre} guardados`);
    router.push("/configuracion/drivers");
  };

  return (
    <main className="lm-page" style={{ paddingBottom: 120 }}>
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion" }, { label: "Drivers y cálculo para SMS", href: "/configuracion/drivers" }, { label: nombre }]} />
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
          <EditorDrivers raiz={est.raiz} valor={borrador} onChange={setBorrador} />
          {flota?.usaSms && <SeccionSms valor={sms} onChange={setSms} intentado={intentado} />}
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
