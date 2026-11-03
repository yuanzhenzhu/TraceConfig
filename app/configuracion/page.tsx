"use client";

// HU-01: listado de flotas y configuraciones.

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Banner, Breadcrumb, Button, Dialog, EmptyState, Field, IconButton, Loading, Menu, Tag, useSnackbar,
} from "@/components/ds";
import { ESTRUCTURAS, fecha, unidadesTerminadas, type Configuracion, type Flota } from "@/lib/model";
import { useStore } from "@/lib/store";

type Demo = "normal" | "vacio" | "error" | "cargando";
const POR_PAGINA = 10;

export default function ListadoPage() {
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();

  const [demo, setDemo] = useState<Demo>("normal");
  const [fFlota, setFFlota] = useState("");
  const [fEstructura, setFEstructura] = useState("");
  const [fEstado, setFEstado] = useState("");
  const [abiertas, setAbiertas] = useState<Record<string, boolean>>({});
  const [pagina, setPagina] = useState(0);
  const [dialogFlota, setDialogFlota] = useState(false);
  const [aDescartar, setADescartar] = useState<Configuracion | null>(null);

  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get("demo") as Demo | null;
    if (d) setDemo(d);
  }, []);

  const configs = store.configs.filter((c) => c.guardada);
  const deFlota = (f: Flota) => configs.filter((c) => c.flotaId === f.id);

  // Flotas con algo En configuración salen desplegadas por defecto.
  useEffect(() => {
    if (!store.listo) return;
    const ini: Record<string, boolean> = {};
    store.flotas.forEach((f) => { ini[f.id] = configs.some((c) => c.flotaId === f.id && c.estado === "en-configuracion"); });
    setAbiertas((a) => ({ ...ini, ...a }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.listo]);

  const filas = useMemo(() => {
    return store.flotas
      .map((f) => {
        const cs = configs.filter((c) => c.flotaId === f.id)
          .filter((c) => !fEstructura || c.estructura?.nombre === fEstructura)
          .filter((c) => !fEstado || c.estado === fEstado);
        return { f, cs };
      })
      .filter(({ f }) => !fFlota || f.id === fFlota)
      .filter(({ f, cs }) => {
        if (!fEstructura && !fEstado) return true;
        if (fEstado === "sin" ) return deFlota(f).length === 0;
        return cs.length > 0;
      })
      .map(({ f, cs }) => (fEstado === "sin" ? { f, cs: [] } : { f, cs }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.flotas, store.configs, fFlota, fEstructura, fEstado]);

  const visibles = filas.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);
  const hayFiltros = !!(fFlota || fEstructura || fEstado);
  const flotasDemo = demo === "vacio" ? [] : visibles;

  const nuevaConfig = (flotaId: string) => {
    const id = store.iniciarConfig(flotaId);
    router.push(`/configuracion/${id}`);
  };

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Flotas y configuraciones</h1>
        </div>
        <div className="lm-header__actions">
          <Button icon="add" onClick={() => setDialogFlota(true)}>Añadir flota</Button>
        </div>
      </div>

      <section className="lm-surface lm-surface--p16">
        <div className="lm-filters">
          <Field label="Flota" htmlFor="f-flota">
            <select id="f-flota" className="lm-select lm-select--dense" value={fFlota} onChange={(e) => { setFFlota(e.target.value); setPagina(0); }}>
              <option value="">Todas</option>
              {store.flotas.map((f) => <option key={f.id} value={f.id}>{f.codigo} · {f.nombre}</option>)}
            </select>
          </Field>
          <Field label="Estructura" htmlFor="f-est">
            <select id="f-est" className="lm-select lm-select--dense" value={fEstructura} onChange={(e) => { setFEstructura(e.target.value); setPagina(0); }}>
              <option value="">Todas</option>
              {[...new Set([...ESTRUCTURAS.map((e) => e.nombre), ...configs.map((c) => c.estructura?.nombre).filter(Boolean) as string[]])]
                .map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Estado" htmlFor="f-estado">
            <select id="f-estado" className="lm-select lm-select--dense" value={fEstado} onChange={(e) => { setFEstado(e.target.value); setPagina(0); }}>
              <option value="">Todos</option>
              <option value="en-configuracion">En configuración</option>
              <option value="activa">Activa</option>
              <option value="sin">Sin configurar</option>
            </select>
          </Field>
          {hayFiltros && (
            <Button variant="text" icon="restart_alt" onClick={() => { setFFlota(""); setFEstructura(""); setFEstado(""); }}>
              Restablecer
            </Button>
          )}
        </div>

        {!store.listo || demo === "cargando" ? (
          <Loading text="Cargando flotas" />
        ) : demo === "error" ? (
          <Banner type="error" title="No se han podido cargar las flotas"
            actions={<Button variant="outlined" small icon="sync" onClick={() => setDemo("normal")}>Reintentar</Button>}>
            Comprueba la conexión e inténtalo de nuevo
          </Banner>
        ) : store.flotas.length === 0 || demo === "vacio" ? (
          <EmptyState icon="train" title="Todavía no hay flotas"
            text="Añade una flota para empezar a configurar sus estructuras y unidades"
            action={<Button variant="outlined" icon="add" onClick={() => setDialogFlota(true)}>Añadir flota</Button>} />
        ) : flotasDemo.length === 0 ? (
          <EmptyState icon="search_off" title="No hay resultados" text="Ninguna flota coincide con los filtros seleccionados"
            action={<Button variant="outlined" onClick={() => { setFFlota(""); setFEstructura(""); setFEstado(""); }}>Restablecer filtros</Button>} />
        ) : (
          <>
            <table className="lm-table">
              <thead>
                <tr>
                  <th style={{ width: 48 }}><span className="sr-only">Desplegar</span></th>
                  <th>Flota</th>
                  <th>Descripción</th>
                  <th>Estructura</th>
                  <th className="num">Unidades</th>
                  <th>Estado</th>
                  <th>Últ. actualización</th>
                  <th className="actions"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {flotasDemo.map(({ f, cs }) => {
                  const todas = deFlota(f);
                  const activas = todas.filter((c) => c.estado === "activa").length;
                  const enConf = todas.length - activas;
                  const abierta = !!abiertas[f.id] && cs.length > 0;
                  const total = todas.reduce((s, c) => s + (c.unidades ?? 0), 0);
                  return (
                    <Fragment key={f.id}>
                      <tr>
                        <td>
                          {todas.length > 0 && (
                            <IconButton compact icon={abierta ? "expand_less" : "expand_more"}
                              label={`${abierta ? "Plegar" : "Desplegar"} configuraciones de ${f.codigo}`}
                              aria-expanded={abierta} onClick={() => setAbiertas((a) => ({ ...a, [f.id]: !abierta }))} />
                          )}
                        </td>
                        <td className="emph">{f.codigo}</td>
                        <td>{f.nombre}</td>
                        <td className="muted">{todas.length === 0 ? "—" : todas.length === 1 ? todas[0].estructura?.nombre : `${todas.length} configuraciones`}</td>
                        <td className="num">{total || "—"}</td>
                        <td>
                          <span className="row gap-5 wrap">
                            {todas.length === 0 && <Tag tone="neutral">Sin configurar</Tag>}
                            {activas > 0 && <Tag tone="success" num={activas}>{activas === 1 ? "Activa" : "Activas"}</Tag>}
                            {enConf > 0 && <Tag tone="attention" num={enConf}>En configuración</Tag>}
                          </span>
                        </td>
                        <td />
                        <td className="actions">
                          <span className="row gap-5" style={{ justifyContent: "flex-end" }}>
                            {todas.length === 0 && <Button variant="text" small onClick={() => nuevaConfig(f.id)}>Iniciar configuración</Button>}
                            <Menu label={`Acciones de ${f.codigo}`} items={[
                              { label: "Añadir configuración", icon: "add", onSelect: () => nuevaConfig(f.id) },
                              { label: "Modificar flota", icon: "edit", onSelect: () => snack("Fuera del alcance de este prototipo"), disabled: false },
                            ]} />
                          </span>
                        </td>
                      </tr>
                      {abierta && cs.map((c) => {
                        const term = unidadesTerminadas(c);
                        return (
                          <tr key={c.id} className="is-child">
                            <td />
                            <td style={{ paddingLeft: "var(--lm-space-30)" }}>
                              <span className="stack">
                                <span className="emph">{c.nombre}</span>
                                <span className="lm-body-small muted">{c.descripcion}</span>
                              </span>
                            </td>
                            <td />
                            <td>{c.estructura?.nombre ?? "—"}</td>
                            <td className="num">{c.unidades ?? "—"}</td>
                            <td>
                              <span className="row gap-10">
                                {c.estado === "activa"
                                  ? <Tag tone="success">Activa</Tag>
                                  : <Tag tone="attention">En configuración</Tag>}
                                {c.estado === "en-configuracion" && (
                                  <span className="lm-body-small muted">{term}/{c.unidades} unidades terminadas</span>
                                )}
                              </span>
                            </td>
                            <td className="muted">{fecha(c.actualizada)}</td>
                            <td className="actions">
                              <span className="row gap-5" style={{ justifyContent: "flex-end" }}>
                                {c.estado === "en-configuracion"
                                  ? <Button variant="outlined" small onClick={() => router.push(`/configuracion/${c.id}`)}>Continuar</Button>
                                  : <Button variant="text" small onClick={() => router.push(`/configuracion/${c.id}?paso=8`)}>Ver</Button>}
                                <Menu label={`Acciones de ${c.nombre}`} items={[
                                  { label: "Modificar", icon: "edit", onSelect: () => snack("La modificación de configuraciones activas es la épica B") },
                                  ...(c.estado === "en-configuracion"
                                    ? ["divider" as const, { label: "Descartar", icon: "delete", danger: true, onSelect: () => setADescartar(c) }]
                                    : []),
                                ]} />
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            <div className="lm-paginator">
              <span>{pagina * POR_PAGINA + 1} - {Math.min((pagina + 1) * POR_PAGINA, filas.length)} de {filas.length}</span>
              <span className="row">
                <IconButton icon="chevron_left" label="Página anterior" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)} />
                <IconButton icon="chevron_right" label="Página siguiente" disabled={(pagina + 1) * POR_PAGINA >= filas.length} onClick={() => setPagina((p) => p + 1)} />
              </span>
            </div>
          </>
        )}
      </section>

      <PieDemo demo={demo} setDemo={setDemo} onReset={() => { store.restablecer(); snack("Datos de ejemplo restablecidos"); }} />

      {dialogFlota && (
        <DialogNuevaFlota
          existentes={store.flotas.map((f) => f.codigo.toLowerCase())}
          onClose={() => setDialogFlota(false)}
          onCrear={(codigo, nombre, descripcion) => {
            const f = store.crearFlota({ codigo, nombre, descripcion });
            setDialogFlota(false);
            nuevaConfig(f.id);
          }}
        />
      )}

      {aDescartar && (
        <Dialog title="¿Descartar la configuración?" onClose={() => setADescartar(null)}
          message={`Se eliminará "${aDescartar.nombre}" con su estructura, unidades y datos cargados. Esta acción no se puede deshacer.`}
          footer={<>
            <Button variant="outlined" onClick={() => setADescartar(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => { store.descartarConfig(aDescartar.id); snack(`Configuración "${aDescartar.nombre}" descartada`); setADescartar(null); }}>Descartar</Button>
          </>} />
      )}
    </main>
  );
}

function DialogNuevaFlota({ existentes, onClose, onCrear }: {
  existentes: string[]; onClose: () => void; onCrear: (codigo: string, nombre: string, descripcion: string) => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [intentado, setIntentado] = useState(false);
  const errCodigo = !codigo.trim() ? "Indica el código de la flota" : existentes.includes(codigo.trim().toLowerCase()) ? "Ya existe una flota con este código" : "";
  const errNombre = !nombre.trim() ? "Indica el nombre de la flota" : "";
  const crear = () => { setIntentado(true); if (!errCodigo && !errNombre) onCrear(codigo.trim().toUpperCase(), nombre.trim(), descripcion.trim()); };
  return (
    <Dialog title="Nueva flota" message="Después podrás añadir sus configuraciones, una por cada estructura." onClose={onClose}
      footer={<>
        <Button variant="outlined" onClick={onClose}>Cancelar</Button>
        <Button onClick={crear}>Crear y configurar</Button>
      </>}>
      <Field label="Código" required htmlFor="nf-codigo" error={intentado ? errCodigo : ""} support="Por ejemplo: F4000">
        <input id="nf-codigo" className="lm-input" value={codigo} aria-invalid={intentado && !!errCodigo} onChange={(e) => setCodigo(e.target.value)} />
      </Field>
      <Field label="Nombre" required htmlFor="nf-nombre" error={intentado ? errNombre : ""}>
        <input id="nf-nombre" className="lm-input" value={nombre} aria-invalid={intentado && !!errNombre} onChange={(e) => setNombre(e.target.value)} placeholder="Por ejemplo: Metro Línea 4" />
      </Field>
      <Field label="Descripción" htmlFor="nf-desc">
        <textarea id="nf-desc" className="lm-input" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </Field>
    </Dialog>
  );
}

/** Controles para revisar los estados de pantalla del prototipo (no forman parte del producto). */
function PieDemo({ demo, setDemo, onReset }: { demo: Demo; setDemo: (d: Demo) => void; onReset: () => void }) {
  return (
    <footer className="row gap-10 wrap" style={{ marginTop: "var(--lm-space-40)", color: "var(--lm-sys-on-surface-variant)" }}>
      <span className="lm-label-medium">PROTOTIPO · Ver estado:</span>
      {(["normal", "cargando", "vacio", "error"] as Demo[]).map((d) => (
        <button key={d} className="lm-chip" aria-pressed={demo === d} onClick={() => setDemo(d)}>
          {{ normal: "Con datos", cargando: "Cargando", vacio: "Vacío", error: "Error" }[d]}
        </button>
      ))}
      <span className="grow" />
      <Button variant="text" icon="restart_alt" onClick={onReset}>Restablecer datos de ejemplo</Button>
    </footer>
  );
}
