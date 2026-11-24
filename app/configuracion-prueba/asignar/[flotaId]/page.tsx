"use client";

// (Prueba, 24-11-2026) Paso 1 del asistente, Estructura y unidades, para una configuración nueva de la flota.
// Se entra desde Configurar (flota en 1/3, panel Progreso) o desde «Añadir configuración» del menú de la flota.
// Solo se añade una configuración cada vez: una tarjeta «Configuración N» con Nº de unidades, Estructura y Guardar.
// Al guardar se confirma la estructura (no se podrá cambiar), la configuración queda en 2/3 y se pasa a Drivers.
// Si no hay estructuras disponibles, se avisa y se ofrece crear una (en Estructuras, volviendo aquí con ella elegida).
// Sin barra inferior: se sale por la miga de pan.

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Banner, Breadcrumb, Button, Dialog, EmptyState, Loading, useSnackbar } from "@/components/ds";
import { driversIniciales, plantillasIniciales } from "@/lib/model";
import { useStore } from "@/lib/store";
import { StepperPrueba } from "@/components/configuracion-prueba/stepper";
import { TarjetaConfiguracion } from "@/components/configuracion-prueba/tarjeta-configuracion";

export default function AsignarEstructuraPage() {
  const { flotaId } = useParams<{ flotaId: string }>();
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const flota = store.flotas.find((f) => f.id === flotaId);

  const [pendiente, setPendiente] = useState<{ unidades: number; estructuraId: string } | null>(null);
  // Prototipo: ver el caso «no hay estructuras disponibles» sin vaciar el catálogo (?demo=sin-estructuras)
  const [sinEstructuras, setSinEstructuras] = useState(false);
  // Estructura recién creada desde aquí (vuelve de Estructuras con ?estructura=<id>)
  const [creada, setCreada] = useState<string | null>(null);
  const [listoQs, setListoQs] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("demo") === "sin-estructuras") setSinEstructuras(true);
    setCreada(q.get("estructura"));
    setListoQs(true);
  }, []);

  if (!store.listo || !listoQs) return <main className="lm-page"><Loading text="Cargando flota" /></main>;
  if (!flota) {
    return (
      <main className="lm-page">
        <EmptyState icon="search_off" title="No se ha encontrado la flota" text="Puede que se haya eliminado o que el enlace no sea correcto"
          action={<Button onClick={() => router.push("/configuracion-prueba")}>Volver al listado</Button>} />
      </main>
    );
  }

  // Una flota no repite estructura: fuera las que ya usan sus configuraciones.
  const suyas = store.configs.filter((c) => c.flotaId === flota.id && c.guardada && c.estructuraId);
  const usadas = new Set(suyas.map((c) => c.estructuraId!));
  const catalogo = sinEstructuras ? store.estructuras.filter((e) => e.id === creada) : store.estructuras;
  const disponibles = catalogo.filter((e) => !usadas.has(e.id) && e.raiz.hijos.length > 0);
  const crearEstructura = () => router.push(`/configuracion-prueba/estructuras/nueva?asignar=${flota.id}${sinEstructuras ? "&demo=sin-estructuras" : ""}`);
  const elegida = pendiente && store.estructura(pendiente.estructuraId);

  const aceptar = () => {
    const est = elegida!;
    const id = store.iniciarConfig(flota.id);
    store.actualizarConfig(id, {
      estructuraId: est.id, nombre: est.nombre, descripcion: "", unidades: pendiente!.unidades,
      plantillas: plantillasIniciales(est.raiz), drivers: { ...driversIniciales(est.raiz), estructuraId: est.id },
      guardada: true, pasoActual: 3, pasoMax: 3, // se sigue en Drivers
    });
    setPendiente(null);
    snack(`Configuración ${flota.nombre} · ${est.nombre} guardada en 2/3`);
    router.push(`/configuracion-prueba/${id}?paso=3`);
  };

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion-prueba" }, { label: flota.nombre, href: "/configuracion-prueba" }, { label: "Nueva configuración" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>{flota.nombre}</h1>
        </div>
      </div>

      {/* (24-11-2026) Stepper y tarjeta en una misma superficie. Hasta guardar, el resto de pasos está bloqueado */}
      <section className="lm-surface lm-surface--p24 stack gap-20">
      <StepperPrueba plano actual={1} hecho={() => false} bloqueado={(x) => x !== 1} />

      <TarjetaConfiguracion conBorde key={String(sinEstructuras)} titulo={`Configuración ${suyas.length + 1}`}
        estructuraId={creada ?? ""} opciones={disponibles}
        onGuardar={(unidades, estructuraId) => setPendiente({ unidades, estructuraId })}
        aviso={!disponibles.length && (
          <Banner type="attention" title="No hay estructuras disponibles"
            actions={<Button variant="text" small onClick={crearEstructura}>Crear estructura</Button>} />
        )} />
      </section>

      <footer className="row gap-10 wrap" style={{ marginTop: "var(--lm-space-40)", color: "var(--lm-sys-on-surface-variant)" }}>
        <span className="lm-label-medium">PROTOTIPO · Ver caso:</span>
        <button className="lm-chip" aria-pressed={!sinEstructuras} onClick={() => setSinEstructuras(false)}>Con estructuras</button>
        <button className="lm-chip" aria-pressed={sinEstructuras} onClick={() => setSinEstructuras(true)}>Sin estructuras disponibles</button>
      </footer>

      {pendiente && elegida && (
        <Dialog
          title={`¿Usar ${elegida.nombre} en esta configuración?`}
          message="Una vez confirmada, no se podrá cambiar. Si después necesitas otra estructura, tendrás que crear de nuevo la configuración."
          onClose={() => setPendiente(null)}
          footer={<>
            <Button variant="outlined" onClick={() => setPendiente(null)}>Cancelar</Button>
            <Button onClick={aceptar}>Aceptar</Button>
          </>} />
      )}
    </main>
  );
}
