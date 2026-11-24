"use client";

// (Prueba, 18-11-2026) Recepción en unidad: huecos de configuraciones terminadas que faltan por rellenar, porque se
// modificó la estructura (categoría nueva en los extremos) o se añadieron unidades. Cada hueco necesita nº de serie y
// km, y los valores de sus propiedades si las tiene. Se rellenan uno a uno (lápiz o menú) o con plantilla.
// Los huecos pendientes son ficticios (ver components/configuracion-prueba/recepcion.ts).

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Banner, Breadcrumb, Button, Dialog, EmptyState, Field, IconButton, Loading, Menu, Tag, useSnackbar } from "@/components/ds";
import { PROPS_CATEGORIA, PROPS_HUECO } from "@/lib/model";
import { useStore } from "@/lib/store";
import { etiquetaCfg } from "@/components/configuracion-prueba/nombre";
import { ORIGEN, huecosPendientes, useRecepcion, type HuecoPendiente, type Origen, type Recibido } from "@/components/configuracion-prueba/recepcion";

const POR_PAGINA = 25;
const nombreProp = (id: string) => PROPS_CATEGORIA.find((p) => p.id === id)?.nombre ?? PROPS_HUECO.find((p) => p.id === id)?.nombre ?? id;

export default function RecepcionUnidadPage() {
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const { recibidos, recibir, restablecer } = useRecepcion();
  const [fFlota, setFFlota] = useState("");
  const [fOrigen, setFOrigen] = useState<Origen | "">("");
  const [fEstado, setFEstado] = useState<"pendientes" | "recibidos" | "">("pendientes");
  const [pagina, setPagina] = useState(0);
  const [editando, setEditando] = useState<HuecoPendiente | null>(null);

  const huecos = useMemo(() => huecosPendientes(store.configs, store.estructuras, store.propsCategoria),
    [store.configs, store.estructuras, store.propsCategoria]);
  const pendientes = huecos.filter((h) => !recibidos[h.id]);
  const lista = huecos.filter((h) => (!fFlota || h.flotaId === fFlota) && (!fOrigen || h.origen === fOrigen)
    && (fEstado === "" || (fEstado === "pendientes" ? !recibidos[h.id] : !!recibidos[h.id])));
  const visibles = lista.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);
  const nombreCfg = (id: string) => { const c = store.configs.find((x) => x.id === id); return c ? etiquetaCfg(store, c) : ""; };
  const filtrar = (fn: () => void) => { fn(); setPagina(0); };
  const hayFiltros = !!(fFlota || fOrigen || fEstado !== "pendientes");
  const restablecerFiltros = () => filtrar(() => { setFFlota(""); setFOrigen(""); setFEstado("pendientes"); });
  // Resumen por configuración y origen
  const grupos = [...new Map(pendientes.map((h) => [`${h.configId}|${h.origen}`, h])).values()].map((h) => ({
    h, n: pendientes.filter((x) => x.configId === h.configId && x.origen === h.origen).length,
    unidades: new Set(pendientes.filter((x) => x.configId === h.configId && x.origen === h.origen).map((x) => x.unidad)).size,
  }));

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion-prueba" }, { label: "Recepción en unidad" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Recepción en unidad</h1>
          <span className="muted">Huecos de configuraciones terminadas que faltan por rellenar: por un cambio en la estructura o por unidades añadidas. Cada hueco necesita al menos nº de serie y km.</span>
        </div>
        <div className="lm-header__actions">
          <Button icon="file_upload" disabled={!pendientes.length} onClick={() => router.push("/configuracion-prueba/recepcion-unidad/plantilla")}>Recepción con plantilla</Button>
        </div>
      </div>

      {store.listo && grupos.length > 0 && (
        <div className="row gap-15 wrap" style={{ marginBottom: "var(--lm-space-20)" }}>
          {grupos.map(({ h, n, unidades }) => (
            <article key={`${h.configId}|${h.origen}`} className="lm-card stack gap-5" style={{ minWidth: 280 }}>
              <span className="row gap-10"><span className="lm-title-small grow">{nombreCfg(h.configId)}</span><Tag tone="attention">{ORIGEN[h.origen]}</Tag></span>
              <span className="muted">{n} huecos pendientes en {unidades} {unidades === 1 ? "unidad" : "unidades"}{h.origen === "estructura" ? ` · categoría ${h.categoria}` : ""}</span>
            </article>
          ))}
        </div>
      )}

      <section className="lm-surface lm-surface--p16">
        <div className="lm-filters">
          <Field label="Flota" htmlFor="ru-flota">
            <select id="ru-flota" className="lm-select lm-select--dense" value={fFlota} onChange={(e) => filtrar(() => setFFlota(e.target.value))}>
              <option value="">Todas</option>
              {store.flotas.filter((f) => huecos.some((h) => h.flotaId === f.id)).map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </Field>
          <Field label="Origen" htmlFor="ru-origen">
            <select id="ru-origen" className="lm-select lm-select--dense" value={fOrigen} onChange={(e) => filtrar(() => setFOrigen(e.target.value as Origen | ""))}>
              <option value="">Todos</option>
              <option value="estructura">{ORIGEN.estructura}</option>
              <option value="movimiento">{ORIGEN.movimiento}</option>
            </select>
          </Field>
          <Field label="Estado" htmlFor="ru-estado">
            <select id="ru-estado" className="lm-select lm-select--dense" value={fEstado} onChange={(e) => filtrar(() => setFEstado(e.target.value as typeof fEstado))}>
              <option value="pendientes">Pendientes</option>
              <option value="recibidos">Recibidos</option>
              <option value="">Todos</option>
            </select>
          </Field>
          {hayFiltros && <Button variant="text" icon="restart_alt" onClick={restablecerFiltros}>Restablecer</Button>}
        </div>

        {!store.listo ? <Loading text="Cargando huecos" /> : huecos.length === 0 ? (
          <EmptyState icon="check_circle" title="No hay huecos pendientes" text="Todas las configuraciones terminadas tienen sus huecos con datos" />
        ) : lista.length === 0 ? (
          fEstado === "pendientes" && !fFlota && !fOrigen
            ? <EmptyState icon="check_circle" title="Todo recibido" text="No quedan huecos pendientes. Puedes ver los recibidos con el filtro Estado" />
            : <EmptyState icon="search_off" title="No hay resultados" text="Ningún hueco coincide con los filtros" action={<Button variant="outlined" onClick={restablecerFiltros}>Restablecer filtros</Button>} />
        ) : (
          <>
            <table className="lm-table">
              <thead><tr><th>Unidad</th><th>Hueco</th><th>Categoría</th><th>Origen</th><th>Nº de serie</th><th className="num">Km</th><th>Estado</th><th className="actions"><span className="sr-only">Acciones</span></th></tr></thead>
              <tbody>
                {visibles.map((h) => {
                  const r = recibidos[h.id];
                  return (
                    <tr key={h.id}>
                      <td className="emph">{h.unidad}</td>
                      <td className="muted">{h.hueco}</td>
                      <td>{h.categoria}</td>
                      <td>{ORIGEN[h.origen]}</td>
                      <td>
                        <span className="row gap-5">
                          {r ? <span className="emph">{r.serie}</span> : <span className="muted">—</span>}
                          <IconButton compact icon="edit" label={`${r ? "Modificar" : "Rellenar"} el hueco ${h.hueco} de la unidad ${h.unidad}`} onClick={() => setEditando(h)} />
                        </span>
                      </td>
                      <td className="num">{r ? Number(r.km).toLocaleString("es-ES") : "—"}</td>
                      <td>{r ? <Tag tone="success">Recibido</Tag> : <Tag tone="attention">Pendiente</Tag>}</td>
                      <td className="actions">
                        <Menu label={`Acciones del hueco ${h.hueco} de la unidad ${h.unidad}`} items={[{ label: r ? "Modificar datos" : "Rellenar datos", icon: "edit", onSelect: () => setEditando(h) }]} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="lm-paginator">
              <span>{pagina * POR_PAGINA + 1} - {Math.min((pagina + 1) * POR_PAGINA, lista.length)} de {lista.length}</span>
              <span className="row">
                <IconButton icon="chevron_left" label="Página anterior" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)} />
                <IconButton icon="chevron_right" label="Página siguiente" disabled={(pagina + 1) * POR_PAGINA >= lista.length} onClick={() => setPagina((p) => p + 1)} />
              </span>
            </div>
          </>
        )}
      </section>

      <footer className="row gap-10 wrap" style={{ marginTop: "var(--lm-space-40)", color: "var(--lm-sys-on-surface-variant)" }}>
        <span className="lm-label-medium">PROTOTIPO · Los huecos pendientes son de ejemplo: una categoría nueva (Sensor) en {huecos[0] ? nombreCfg(huecos[0].configId) : "una configuración"} y huecos vaciados por desmontajes en otra.</span>
        <span className="grow" />
        <Button variant="text" icon="restart_alt" onClick={() => { restablecer(); snack("Recepción restablecida"); }}>Restablecer recepción</Button>
      </footer>

      {editando && (
        <DialogRellenar h={editando} previo={recibidos[editando.id]} nombreCfg={nombreCfg(editando.configId)} onClose={() => setEditando(null)}
          onGuardar={(r) => {
            recibir({ [editando.id]: r });
            setEditando(null);
            snack(`Hueco ${editando.hueco} de la unidad ${editando.unidad} recibido`);
          }} />
      )}
    </main>
  );
}

function DialogRellenar({ h, previo, nombreCfg, onClose, onGuardar }: {
  h: HuecoPendiente; previo?: Recibido; nombreCfg: string; onClose: () => void; onGuardar: (r: Recibido) => void;
}) {
  const [serie, setSerie] = useState(previo?.serie ?? "");
  const [km, setKm] = useState(previo?.km ?? "");
  const [props, setProps] = useState<Record<string, string>>(previo?.props ?? {});
  const [intentado, setIntentado] = useState(false);
  const errSerie = !serie.trim() ? "Indica el nº de serie" : "";
  const errKm = !km.trim() ? "Indica los km" : !/^\d+$/.test(km.trim()) ? "Indica un número entero de km" : "";
  const guardar = () => { setIntentado(true); if (!errSerie && !errKm) onGuardar({ serie: serie.trim(), km: km.trim(), props, fecha: new Date().toISOString() }); };
  const todas = [...h.propsCategoria.map((p) => ({ p, tipo: "de categoría" })), ...h.propsHueco.map((p) => ({ p, tipo: "de hueco" }))];
  return (
    <Dialog large title={previo ? "Modificar datos del hueco" : "Rellenar datos del hueco"} message={`${nombreCfg} · Unidad ${h.unidad} › ${h.hueco} · ${h.categoria}`} onClose={onClose}
      footer={<>
        <Button variant="outlined" onClick={onClose}>Cancelar</Button>
        <Button onClick={guardar}>Guardar</Button>
      </>}>
      <form className="stack gap-20" onSubmit={(e) => { e.preventDefault(); guardar(); }}>
        <div className="row gap-15" style={{ alignItems: "flex-start" }}>
          <Field label="Nº de serie" required htmlFor="ru-serie" error={intentado ? errSerie : ""} style={{ flex: 1 }}>
            <input id="ru-serie" className="lm-input" value={serie} aria-invalid={intentado && !!errSerie} placeholder="Por ejemplo: SE-1001-001" onChange={(e) => setSerie(e.target.value)} />
          </Field>
          <Field label="Km" required htmlFor="ru-km" error={intentado ? errKm : ""} style={{ width: 200 }}>
            <input id="ru-km" className="lm-input" inputMode="numeric" value={km} aria-invalid={intentado && !!errKm} placeholder="Por ejemplo: 185150" onChange={(e) => setKm(e.target.value.replace(/[^\d]/g, ""))} />
          </Field>
        </div>
        {todas.length > 0 ? (
          <div className="stack gap-10">
            <span className="lm-title-small">Propiedades</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--lm-space-15)" }}>
              {todas.map(({ p, tipo }) => (
                <Field key={p} label={`${nombreProp(p)} (${tipo})`} htmlFor={`ru-p-${p}`}>
                  <input id={`ru-p-${p}`} className="lm-input" value={props[p] ?? ""} onChange={(e) => setProps({ ...props, [p]: e.target.value })} />
                </Field>
              ))}
            </div>
          </div>
        ) : (
          <Banner type="info">{h.categoria} no tiene propiedades de categoría ni de hueco asignadas: solo hacen falta el nº de serie y los km.</Banner>
        )}
      </form>
    </Dialog>
  );
}
