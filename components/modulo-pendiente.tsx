"use client";

// Página provisional de un módulo que todavía no tiene pantallas (Consulta, Movimientos, Registros).

import { Breadcrumb, Button, EmptyState } from "./ds";
import { useRouter } from "next/navigation";

export function ModuloPendiente({ nombre, icon, descripcion }: { nombre: string; icon: string; descripcion: string }) {
  const router = useRouter();
  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: nombre }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>{nombre}</h1>
        </div>
      </div>
      <section className="lm-surface lm-surface--p16">
        <EmptyState icon={icon} title={`${nombre} todavía no tiene pantallas`} text={descripcion}
          action={<Button variant="outlined" onClick={() => router.push("/configuracion")}>Ir a Configuración</Button>} />
      </section>
    </main>
  );
}
