"use client";

// (Prueba, 24-11-2026) Recepción en unidad · detalle de una unidad: una fila por categoría con huecos vacíos en ella.
// En cada categoría se descarga la plantilla (sus huecos vacíos) y se sube rellena; al subirla quedan recibidos.

import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Breadcrumb, Button, EmptyState, IconButton, Loading, Tag, useSnackbar } from "@/components/ds";
import { useStore } from "@/lib/store";
import { etiquetaCfg } from "@/components/configuracion-prueba/nombre";
import { huecosPendientes, porUnidad, recibirTodos, useRecepcion } from "@/components/configuracion-prueba/recepcion";
import { DialogSubirRecepcion, Rellenado, descargarPlantillaRecepcion } from "@/components/configuracion-prueba/recepcion-plantilla";

export default function RecepcionUnidadDetallePage() {
  const { configId, unidad } = useParams<{ configId: string; unidad: string }>();
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const { recibidos, recibir } = useRecepcion();
  const [subiendo, setSubiendo] = useState<string | null>(null);

  const huecos = useMemo(() => huecosPendientes(store.configs, store.estructuras, store.propsCategoria), [store.configs, store.estructuras, store.propsCategoria]);
  const c = store.configs.find((x) => x.id === configId);
  const deUnidad = huecos.filter((h) => h.configId === configId && h.unidad === unidad);
  const fila = porUnidad(deUnidad, recibidos, store.configs, store.estructuras)[0];
  // Una fila por categoría con huecos vacíos en esta unidad (también las ya recibidas en esta prueba)
  const categorias = [...new Set(deUnidad.map((h) => h.categoria))].map((categoria) => {
    const todos = deUnidad.filter((h) => h.categoria === categoria);
    return { categoria, todos, vacios: todos.filter((h) => !recibidos[h.id]) };
  });

  if (!store.listo) return <main className="lm-page"><Loading text="Cargando unidad" /></main>;
  if (!c || !fila) {
    return (
      <main className="lm-page">
        <EmptyState icon="search_off" title="No se ha encontrado la unidad" text="Puede que ya no tenga huecos vacíos o que el enlace no sea correcto"
          action={<Button onClick={() => router.push("/configuracion-prueba/recepcion-unidad")}>Volver a Recepción en unidad</Button>} />
      </main>
    );
  }
  const actual = categorias.find((x) => x.categoria === subiendo);

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion-prueba" }, { label: "Recepción en unidad", href: "/configuracion-prueba/recepcion-unidad" }, { label: `Unidad ${unidad}` }]} />
          <span className="row gap-15">
            <h1 className="lm-headline-small" style={{ margin: 0 }}>Unidad {unidad}</h1>
            <Rellenado total={fila.total} vacios={fila.pendientes.length} />
          </span>
          <span className="muted">{etiquetaCfg(store, c)}</span>
        </div>
      </div>

      <section className="lm-surface lm-surface--p16">
        <table className="lm-table">
          <thead><tr><th>Categoría</th><th className="num">Huecos vacíos</th><th>Estado</th><th className="actions">Acciones</th></tr></thead>
          <tbody>
            {categorias.map((x) => (
              <tr key={x.categoria}>
                <td className="emph">{x.categoria}</td>
                <td className="num">{x.vacios.length}</td>
                <td>{x.vacios.length ? <Tag tone="attention">Pendiente</Tag> : <Tag tone="success">Recibida</Tag>}</td>
                <td className="actions">
                  <span className="row gap-5" style={{ justifyContent: "flex-end" }}>
                    <IconButton icon="file_download" label={`Descargar plantilla de ${x.categoria}`} disabled={!x.vacios.length}
                      onClick={() => { descargarPlantillaRecepcion(`${unidad}-${x.categoria}`, x.vacios); snack(`Plantilla de ${x.categoria} descargada`); }} />
                    <Button variant="outlined" small icon="file_upload" disabled={!x.vacios.length} onClick={() => setSubiendo(x.categoria)}>Subir</Button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {actual && (
        <DialogSubirRecepcion titulo={`${actual.categoria} (unidad ${unidad})`} n={actual.vacios.length} onClose={() => setSubiendo(null)}
          onCargada={() => {
            recibir(recibirTodos(actual.vacios));
            snack(`${actual.vacios.length} ${actual.vacios.length === 1 ? "hueco" : "huecos"} de ${actual.categoria} recibido${actual.vacios.length === 1 ? "" : "s"} en la unidad ${unidad}`);
            setSubiendo(null);
          }} />
      )}
    </main>
  );
}
