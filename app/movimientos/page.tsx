import { ModuloPendiente } from "@/components/modulo-pendiente";

export const metadata = { title: "Movimientos · Leadmind Trace" };

export default function MovimientosPage() {
  return <ModuloPendiente nombre="Movimientos" icon="swap_vert"
    descripcion="Aquí se registrarán los movimientos de los activos: recepciones, montajes y desmontajes" />;
}
