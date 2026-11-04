"use client";

// Propiedades de categoría: un único juego para todo el cliente, que se aplica a todas las flotas.
// Se editan aquí (todas las categorías) o en el paso 4 del asistente (las categorías de su estructura).

import { useEffect, useState } from "react";
import { Banner, Breadcrumb, Button, Dialog, Loading, useSnackbar } from "@/components/ds";
import { EditorPropsCategoria } from "@/components/propiedades";
import { CATEGORIAS, categoriasDe, type PropsCategoria } from "@/lib/model";
import { useStore } from "@/lib/store";

export default function PropiedadesCategoriaPage() {
  const store = useStore();
  const snack = useSnackbar();
  const [borrador, setBorrador] = useState<PropsCategoria | null>(null);
  const [confirmar, setConfirmar] = useState(false);

  useEffect(() => { if (store.listo && !borrador) setBorrador(structuredClone(store.propsCategoria)); }, [store.listo, store.propsCategoria, borrador]);

  if (!store.listo || !borrador) return <main className="lm-page"><Loading text="Cargando propiedades de categoría" /></main>;

  // Todas las categorías del cliente: las del catálogo y las que aparecen en alguna estructura.
  const categorias = [...new Set([...store.estructuras.flatMap((e) => categoriasDe(e.raiz).map((x) => x.categoria)), ...CATEGORIAS])];
  const flotas = store.flotas.filter((f) => store.configs.some((c) => c.flotaId === f.id && c.guardada));
  const cambiado = JSON.stringify(borrador) !== JSON.stringify(store.propsCategoria);
  const total = Object.values(borrador).reduce((s, l) => s + l.length, 0);

  const guardar = () => {
    store.guardarPropsCategoria(borrador);
    setConfirmar(false);
    snack(`Propiedades de categoría guardadas en ${flotas.length} flotas`);
  };

  return (
    <main className="lm-page" style={{ paddingBottom: 120 }}>
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion" }, { label: "Propiedades de categoría" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Propiedades de categoría</h1>
          <span className="muted">Qué propiedades se registran para cada categoría de activo (por ejemplo, el diámetro de las ruedas) y si guardan histórico. Son únicas para todo el cliente.</span>
        </div>
      </div>

      <div className="stack gap-20">
        <Banner type="attention" title={`Se aplican a todas las flotas (${flotas.length})`}>
          {flotas.map((f) => f.nombre).join(", ") || "Todavía no hay flotas configuradas"}. Las plantillas de carga incluirán una columna por cada propiedad asignada.
        </Banner>
        <section className="lm-surface lm-surface--p24 stack gap-20">
          <EditorPropsCategoria categorias={categorias} valor={borrador} onChange={setBorrador} />
        </section>
      </div>

      <footer className="lm-footer-bar">
        <div className="row gap-10" style={{ maxWidth: 1360, margin: "0 auto", padding: "var(--lm-space-15) var(--lm-space-30)" }}>
          <span className="grow lm-body-small muted">{total} propiedades asignadas{cambiado && " · Hay cambios sin guardar"}</span>
          <Button variant="outlined" disabled={!cambiado} onClick={() => setBorrador(structuredClone(store.propsCategoria))}>Descartar cambios</Button>
          <Button disabled={!cambiado} onClick={() => setConfirmar(true)}>Guardar cambios</Button>
        </div>
      </footer>

      {confirmar && (
        <Dialog title={`¿Aplicar los cambios en ${flotas.length} flotas?`} onClose={() => setConfirmar(false)}
          message="Las propiedades de categoría son comunes: el cambio se aplica a todas las flotas y a sus plantillas."
          footer={<>
            <Button variant="outlined" onClick={() => setConfirmar(false)}>Cancelar</Button>
            <Button onClick={guardar}>Aplicar en {flotas.length} flotas</Button>
          </>} />
      )}
    </main>
  );
}
