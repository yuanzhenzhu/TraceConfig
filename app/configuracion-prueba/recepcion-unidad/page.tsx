"use client";

// (Prueba, 24-11-2026) Recepción en unidad, con dos pestañas:
// - Vista por unidad: Flota, Unidad, Estructura y % de rellenado. Al pinchar una unidad se ven las categorías con
//   huecos vacíos en ella, y en cada una se descarga la plantilla y se sube.
// - Vista por categoría: Categoría, Flota y % de rellenado, con descargar y subir directamente en la fila.
// Los huecos vacíos salen de una estructura modificada o de un montaje o desmontaje (ficticios, ver recepcion.ts).

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Breadcrumb, Button, EmptyState, Field, IconButton, Loading, useSnackbar } from "@/components/ds";
import { useStore } from "@/lib/store";
import { porCategoria, porUnidad, porcentaje, recibirTodos, huecosPendientes, useRecepcion, type FilaCategoria } from "@/components/configuracion-prueba/recepcion";
import { DialogSubirRecepcion, Rellenado, descargarPlantillaRecepcion } from "@/components/configuracion-prueba/recepcion-plantilla";

type Vista = "unidad" | "categoria";

export default function RecepcionUnidadPage() {
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const { recibidos, recibir, restablecer } = useRecepcion();
  const [vista, setVista] = useState<Vista>("unidad");
  const [fFlota, setFFlota] = useState("");
  const [subiendo, setSubiendo] = useState<FilaCategoria | null>(null);

  const huecos = useMemo(() => huecosPendientes(store.configs, store.estructuras, store.propsCategoria), [store.configs, store.estructuras, store.propsCategoria]);
  const unidades = porUnidad(huecos, recibidos, store.configs, store.estructuras)
    .filter((u) => !fFlota || u.flotaId === fFlota)
    .sort((a, b) => porcentaje(a.total, a.pendientes.length) - porcentaje(b.total, b.pendientes.length));
  const categorias = porCategoria(huecos, recibidos, store.configs, store.estructuras)
    .filter((x) => !fFlota || x.flotaId === fFlota)
    .sort((a, b) => porcentaje(a.total, a.pendientes.length) - porcentaje(b.total, b.pendientes.length));
  const nombreFlota = (id: string) => store.flotas.find((f) => f.id === id)?.nombre ?? "";
  const flotas = store.flotas.filter((f) => huecos.some((h) => h.flotaId === f.id));

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion-prueba" }, { label: "Recepción en unidad" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Recepción en unidad</h1>
        </div>
      </div>

      <div className="lm-tabs" role="tablist">
        <button role="tab" className="lm-tab" aria-selected={vista === "unidad"} onClick={() => setVista("unidad")}>Vista por unidad</button>
        <button role="tab" className="lm-tab" aria-selected={vista === "categoria"} onClick={() => setVista("categoria")}>Vista por categoría</button>
      </div>

      <section className="lm-surface lm-surface--p16">
        <div className="lm-filters">
          <Field label="Flota" htmlFor="ru-flota">
            <select id="ru-flota" className="lm-select lm-select--dense" value={fFlota} onChange={(e) => setFFlota(e.target.value)}>
              <option value="">Todas</option>
              {flotas.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </Field>
          {fFlota && <Button variant="text" icon="restart_alt" onClick={() => setFFlota("")}>Restablecer</Button>}
        </div>

        {!store.listo ? <Loading text="Cargando unidades" /> : huecos.length === 0 ? (
          <EmptyState icon="check_circle" title="No hay huecos vacíos" text="Todas las unidades en uso tienen sus huecos con datos" />
        ) : vista === "unidad" ? (
          <table className="lm-table">
            <thead><tr><th>Flota</th><th>Unidad</th><th>Estructura</th><th>Rellenado</th><th className="actions"><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {unidades.map((u) => (
                <tr key={`${u.configId}|${u.unidad}`} style={{ cursor: "pointer" }} onClick={() => router.push(`/configuracion-prueba/recepcion-unidad/${u.configId}/${u.unidad}`)}>
                  <td>{nombreFlota(u.flotaId)}</td>
                  <td className="emph">{u.unidad}</td>
                  <td>{store.estructura(u.estructuraId)?.nombre}</td>
                  <td><Rellenado total={u.total} vacios={u.pendientes.length} /></td>
                  <td className="actions">
                    <IconButton icon="chevron_right" label={`Ver los huecos vacíos de la unidad ${u.unidad}`} onClick={(e) => { e.stopPropagation(); router.push(`/configuracion-prueba/recepcion-unidad/${u.configId}/${u.unidad}`); }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="lm-table">
            <thead><tr><th>Categoría</th><th>Flota</th><th>Rellenado</th><th className="actions">Acciones</th></tr></thead>
            <tbody>
              {categorias.map((x) => (
                <tr key={`${x.categoria}|${x.flotaId}`}>
                  <td className="emph">{x.categoria}</td>
                  <td>{nombreFlota(x.flotaId)}</td>
                  <td><Rellenado total={x.total} vacios={x.pendientes.length} /></td>
                  <td className="actions">
                    {x.pendientes.length > 0 ? (
                      <span className="row gap-5" style={{ justifyContent: "flex-end" }}>
                        <IconButton icon="file_download" label={`Descargar plantilla de ${x.categoria} de ${nombreFlota(x.flotaId)}`}
                          onClick={() => { descargarPlantillaRecepcion(`${x.categoria}-${nombreFlota(x.flotaId)}`, x.pendientes); snack(`Plantilla de ${x.categoria} descargada`); }} />
                        <Button variant="outlined" small icon="file_upload" onClick={() => setSubiendo(x)}>Subir</Button>
                      </span>
                    ) : <span className="muted">Completa</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <footer className="row gap-10 wrap" style={{ marginTop: "var(--lm-space-40)", color: "var(--lm-sys-on-surface-variant)" }}>
        <span className="lm-label-medium">PROTOTIPO · Huecos vacíos de ejemplo: una categoría nueva (Sensor) en Metro Línea 1 y huecos vaciados por desmontajes en Tranvía Norte.</span>
        <span className="grow" />
        <Button variant="text" icon="restart_alt" onClick={() => { restablecer(); snack("Recepción restablecida"); }}>Restablecer recepción</Button>
      </footer>

      {subiendo && (
        <DialogSubirRecepcion titulo={`${subiendo.categoria} (${nombreFlota(subiendo.flotaId)})`} n={subiendo.pendientes.length} onClose={() => setSubiendo(null)}
          onCargada={() => {
            recibir(recibirTodos(subiendo.pendientes));
            snack(`${subiendo.pendientes.length} ${subiendo.pendientes.length === 1 ? "hueco" : "huecos"} de ${subiendo.categoria} recibido${subiendo.pendientes.length === 1 ? "" : "s"}`);
            setSubiendo(null);
          }} />
      )}
    </main>
  );
}
