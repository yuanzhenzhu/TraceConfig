"use client";

// Cambio de número de serie: apartado reservado. Se diseñará en la próxima iteración.

import { useRouter } from "next/navigation";
import { Breadcrumb, Button, EmptyState } from "@/components/ds";

export default function CambioNumeroSeriePage() {
  const router = useRouter();
  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion" }, { label: "Cambio de número de serie" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Cambio de número de serie</h1>
        </div>
      </div>
      <section className="lm-surface lm-surface--p16">
        <EmptyState icon="swap_vert" title="Apartado pendiente de diseño"
          text="Aquí se podrá cambiar el número de serie de unidades y activos. Lo diseñaremos en la siguiente iteración"
          action={<Button variant="outlined" onClick={() => router.push("/configuracion")}>Ir a Flotas y configuraciones</Button>} />
      </section>
    </main>
  );
}
