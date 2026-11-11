"use client";

// Tipos de movimiento que todavía no tienen pantalla (se construyen después de validar Intercambio entre unidad y almacén).

import { notFound, useParams, useRouter } from "next/navigation";
import { Breadcrumb, Button, EmptyState } from "@/components/ds";
import { ITEMS_MOVIMIENTOS } from "@/components/movimientos/menu";

export default function MovimientoPendiente() {
  const { tipo } = useParams<{ tipo: string }>();
  const router = useRouter();
  const item = ITEMS_MOVIMIENTOS.find((i) => i.href === `/movimientos/${tipo}`);
  if (!item) notFound();
  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Movimientos", href: "/movimientos" }, ...(item.grupo ? [{ label: item.grupo }] : []), { label: item.label }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>{item.label}</h1>
        </div>
      </div>
      <section className="lm-surface lm-surface--p16">
        <EmptyState icon="swap_vert" title="Pantalla en preparación"
          text={`Se construirá con el mismo patrón que Intercambio entre unidad y almacén, cuando esté validado.${["Montaje", "Desmontaje"].includes(item.label) ? " Dentro de la pantalla se elegirá si es en una unidad o en un almacén." : ""}`}
          action={<Button variant="outlined" onClick={() => router.push("/movimientos/intercambio-unidad-almacen")}>Ver Intercambio entre unidad y almacén</Button>} />
      </section>
    </main>
  );
}
