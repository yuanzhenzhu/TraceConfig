"use client";

// HU-01: listado de flotas y configuraciones.
// (Prueba) Una configuración es una flota con una estructura: no tiene nombre ni descripción propios.

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Banner, Breadcrumb, Button, Dialog, EmptyState, Field, IconButton, InfoTooltip, Loading, Menu, Tag, useSnackbar,
} from "@/components/ds";
import { type Configuracion, type Flota } from "@/lib/model";
import { useStore } from "@/lib/store";
import { etiquetaCfg } from "@/components/configuracion-prueba/nombre";
import { TareasPendientes, type Tarea } from "@/components/configuracion-prueba/tareas";

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
  // Modificar nombre y descripción de una flota (las configuraciones no tienen)
  const [editando, setEditando] = useState<Flota | null>(null);

  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get("demo") as Demo | null;
    if (d) setDemo(d);
  }, []);

  const configs = store.configs.filter((c) => c.guardada);
  const deFlota = (f: Flota) => configs.filter((c) => c.flotaId === f.id);

  // Flotas con alguna configuración en 2/3 salen desplegadas por defecto.
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
          .filter((c) => !fEstructura || c.estructuraId === fEstructura)
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

  // (Prueba) Las configuraciones se crean en Asignar estructura: cada una es una estructura y su nº de unidades.
  // (Prueba, 24-11-2026) Columna Configuración: 1/3 (flota creada, sin estructura), 2/3 (estructura y unidades asignadas, faltan plantillas) y En uso (plantillas cargadas).
  // Tareas pendientes: icono info junto a 1/3 y 2/3
  // Solo dos acciones: Asignar estructura (flota sin estructura) y Continuar (configuración sin plantillas, retoma el asistente).
  const SUB_ESTRUCTURA = ["Propiedades de categoría", "Propiedades de hueco", "Drivers"];
  const tareasFlota = (f: Flota): Tarea[] => [
    { titulo: "Flota", estado: "hecha" },
    { titulo: "Estructura", estado: "pendiente", sub: SUB_ESTRUCTURA, accion: { label: "Asignar estructura", onClick: () => nuevaConfig(f.id) } },
    { titulo: "Plantillas", estado: "pendiente" },
  ];
  const tareasConfig = (c: Configuracion): Tarea[] => [
    { titulo: "Flota", estado: "hecha" },
    { titulo: "Estructura", estado: "hecha", sub: SUB_ESTRUCTURA },
    { titulo: "Plantillas", estado: "pendiente", accion: { label: "Continuar", onClick: () => router.push(`/configuracion-prueba/${c.id}`) } },
  ];

  const nuevaConfig = (flotaId: string) => router.push(`/configuracion-prueba/asignar/${flotaId}`);

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Flotas</h1>
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
              {store.flotas.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </Field>
          <Field label="Estructura" htmlFor="f-est">
            <select id="f-est" className="lm-select lm-select--dense" value={fEstructura} onChange={(e) => { setFEstructura(e.target.value); setPagina(0); }}>
              <option value="">Todas</option>
              {store.estructuras.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </Field>
          <Field label="Configuración" htmlFor="f-estado">
            <select id="f-estado" className="lm-select lm-select--dense" value={fEstado} onChange={(e) => { setFEstado(e.target.value); setPagina(0); }}>
              <option value="">Todos</option>
              <option value="sin">1/3</option>
              <option value="en-configuracion">2/3</option>
              <option value="activa">En uso</option>
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
                  <th>Estructura</th>
                  <th className="num">Unidades</th>
                  <th>Configuración</th>
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
                              label={`${abierta ? "Plegar" : "Desplegar"} configuraciones de ${f.nombre}`}
                              aria-expanded={abierta} onClick={() => setAbiertas((a) => ({ ...a, [f.id]: !abierta }))} />
                          )}
                        </td>
                        <td>
                          <span className="row gap-5">
                            <span className="emph">{f.nombre}</span>
                            {f.descripcion && <InfoTooltip text={f.descripcion} label={`Descripción de ${f.nombre}`} />}
                          </span>
                        </td>
                        <td className="muted">{todas.length === 0 ? "—" : todas.length === 1 ? store.estructura(todas[0].estructuraId)?.nombre : `${todas.length} estructuras`}</td>
                        <td className="num">{total || "—"}</td>
                        <td>
                          <span className="row gap-5 wrap">
                            {todas.length === 0 && <span className="row gap-5"><Tag tone="attention">1/3</Tag><TareasPendientes label={`Tareas pendientes de ${f.nombre}`} tareas={tareasFlota(f)} /></span>}
                            {activas > 0 && <Tag tone="success" num={activas > 1 ? activas : undefined}>En uso</Tag>}
                            {enConf > 0 && <Tag tone="attention" num={enConf > 1 ? enConf : undefined}>2/3</Tag>}
                          </span>
                        </td>
                        <td className="actions">
                          <span className="row gap-5" style={{ justifyContent: "flex-end" }}>
                            {todas.length === 0 && <Button variant="tonal" small onClick={() => nuevaConfig(f.id)}>Asignar estructura</Button>}
                            <Menu label={`Acciones de ${f.nombre}`} items={[
                              { label: "Añadir configuración", icon: "add", onSelect: () => nuevaConfig(f.id) },
                              { label: "Modificar nombre y descripción", icon: "edit", onSelect: () => setEditando(f) },
                            ]} />
                          </span>
                        </td>
                      </tr>
                      {abierta && cs.map((c) => {
                        const est = store.estructura(c.estructuraId);
                        return (
                          <tr key={c.id} className="is-child">
                            <td />
                            <td />
                            <td>
                              {est ? (
                                <span className="row gap-5">
                                  <span className="emph">{est.nombre}</span>
                                  {est.descripcion && <InfoTooltip text={est.descripcion} label={`Descripción de ${est.nombre}`} />}
                                </span>
                              ) : <span className="muted">Sin elegir</span>}
                            </td>
                            <td className="num">{c.unidades ?? "—"}</td>
                            <td>
                              <span className="row gap-10">
                                {c.estado === "activa"
                                  ? <Tag tone="success">En uso</Tag>
                                  : <span className="row gap-5"><Tag tone="attention">2/3</Tag><TareasPendientes label={`Tareas pendientes de ${etiquetaCfg(store, c)}`} tareas={tareasConfig(c)} /></span>}
                              </span>
                            </td>
                            <td className="actions">
                              <span className="row gap-5" style={{ justifyContent: "flex-end" }}>
                                {c.estado === "en-configuracion" && (
                                  <Button variant="tonal" small onClick={() => router.push(`/configuracion-prueba/${c.id}`)}>{est ? "Continuar" : "Iniciar configuración"}</Button>
                                )}
                                <Menu label={`Acciones de ${etiquetaCfg(store, c)}`} items={[
                                  ...(c.estado === "activa"
                                    ? [
                                      { label: "Consultar", icon: "visibility", onSelect: () => router.push(`/configuracion-prueba/${c.id}?paso=1`) },
                                      { label: "Añadir unidad", icon: "add", onSelect: () => router.push(`/configuracion-prueba/${c.id}?paso=1&modo=anadir`) },
                                    ]
                                    : [{ label: "Eliminar", icon: "delete", danger: true, onSelect: () => setADescartar(c) }]),
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
          existentes={store.flotas.map((f) => f.nombre.trim().toLowerCase())}
          onClose={() => setDialogFlota(false)}
          onCrear={({ nombre, descripcion }) => {
            // Se crea la flota y queda en el listado en 1/3, con la acción Asignar estructura.
            const f = store.crearFlota({ nombre, descripcion });
            setDialogFlota(false);
            snack(`Flota ${f.nombre} creada`);
          }}
        />
      )}

      {editando && (
        <DialogNombre
          titulo={`Modificar ${editando.nombre}`}
          nombre={editando.nombre}
          descripcion={editando.descripcion}
          ocupados={store.flotas.filter((x) => x.id !== editando.id).map((x) => x.nombre.trim().toLowerCase())}
          onClose={() => setEditando(null)}
          onGuardar={(nombre, descripcion) => {
            store.actualizarFlota(editando.id, { nombre, descripcion });
            snack(`Cambios guardados en ${nombre}`);
            setEditando(null);
          }} />
      )}

      {aDescartar && (
        <Dialog title="¿Eliminar la configuración?" onClose={() => setADescartar(null)}
          message={`Se eliminará la configuración ${etiquetaCfg(store, aDescartar)} con lo que tenga configurado: unidades, drivers y datos cargados. La estructura sigue en el catálogo. Esta acción no se puede deshacer.`}
          footer={<>
            <Button variant="outlined" onClick={() => setADescartar(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => { store.descartarConfig(aDescartar.id); snack(`Configuración ${etiquetaCfg(store, aDescartar)} eliminada`); setADescartar(null); }}>Eliminar</Button>
          </>} />
      )}
    </main>
  );
}

/** Modificar el nombre y la descripción de una flota. */
function DialogNombre({ titulo, nombre: ini, descripcion: iniDesc, ocupados, onClose, onGuardar }: {
  titulo: string; nombre: string; descripcion: string; ocupados: string[];
  onClose: () => void; onGuardar: (nombre: string, descripcion: string) => void;
}) {
  const [nombre, setNombre] = useState(ini);
  const [descripcion, setDescripcion] = useState(iniDesc);
  const [intentado, setIntentado] = useState(false);
  const err = !nombre.trim() ? "Indica el nombre" : ocupados.includes(nombre.trim().toLowerCase()) ? "Ya existe otro con este nombre" : "";
  const cambiado = nombre.trim() !== ini || descripcion.trim() !== iniDesc;
  const guardar = () => { setIntentado(true); if (err) return; onGuardar(nombre.trim(), descripcion.trim()); };
  return (
    <Dialog title={titulo} onClose={onClose}
      footer={<>
        <Button variant="outlined" onClick={onClose}>Cancelar</Button>
        <Button disabled={!cambiado} onClick={guardar}>Guardar</Button>
      </>}>
      <div className="stack gap-20">
        <Field label="Nombre" required htmlFor="dn-nombre" error={intentado ? err : ""}>
          <input id="dn-nombre" className="lm-input" value={nombre}aria-invalid={intentado && !!err} onChange={(e) => setNombre(e.target.value)} />
        </Field>
        <Field label="Descripción" htmlFor="dn-desc">
          <input id="dn-desc" className="lm-input" value={descripcion} placeholder="Por ejemplo: Flota de metro de la línea 4" onChange={(e) => setDescripcion(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}

/**
 * (Prueba) Añadir flota: nombre y descripción. La flota queda en 1/3 en el listado
 * y desde allí se le asigna (Asignar estructura).
 */
function DialogNuevaFlota({ existentes, onClose, onCrear }: {
  existentes: string[]; onClose: () => void;
  onCrear: (datos: { nombre: string; descripcion: string }) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [intentado, setIntentado] = useState(false);

  const errNombre = !nombre.trim() ? "Indica el nombre de la flota" : existentes.includes(nombre.trim().toLowerCase()) ? "Ya existe una flota con este nombre" : "";
  const crear = () => {
    setIntentado(true);
    if (errNombre) return;
    onCrear({ nombre: nombre.trim(), descripcion: descripcion.trim() });
  };
  return (
    <Dialog title="Añadir flota" onClose={onClose}
      footer={<>
        <Button variant="outlined" onClick={onClose}>Cancelar</Button>
        <Button onClick={crear}>Aceptar</Button>
      </>}>
      <div className="stack gap-20">
        <Field label="Nombre de flota" required htmlFor="nf-nombre" error={intentado ? errNombre : ""}>
          <input id="nf-nombre" className="lm-input" value={nombre} aria-invalid={intentado && !!errNombre} onChange={(e) => setNombre(e.target.value)} placeholder="Por ejemplo: Metro Línea 4" />
        </Field>
        <Field label="Descripción" htmlFor="nf-desc">
          <input id="nf-desc" className="lm-input" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Por ejemplo: Flota de metro de la línea 4" />
        </Field>
      </div>
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
