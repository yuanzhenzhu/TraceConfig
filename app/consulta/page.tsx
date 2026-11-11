import { ModuloPendiente } from "@/components/modulo-pendiente";

export const metadata = { title: "Consulta · Leadmind Trace" };

export default function ConsultaPage() {
  return <ModuloPendiente nombre="Consulta" icon="search"
    descripcion="Aquí se podrán buscar y ver activos, unidades, estructuras y su trazabilidad" />;
}
