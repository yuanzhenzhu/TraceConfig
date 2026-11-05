"use client";

// HU-01: listado de flotas y configuraciones.

import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Banner, Breadcrumb, Button, Dialog, EmptyState, Field, IconButton, InfoTooltip, Loading, Menu, Tag, useSnackbar,
} from "@/components/ds";
import { erroresFilas, filaVacia, unidadesTerminadas, type Configuracion, type FilaConfig, type Flota } from "@/lib/model";
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
  // true: nueva flota · Flota: iniciar la configuración de una flota que aún no tiene ninguna
  const [dialogFlota, setDialogFlota] = useState<boolean | Flota>(false);
  const [aDescartar, setADescartar] = useState<Configuracion | null>(null);
  // Modificar nombre y descripción de una flota o de una configuración
  const [editando, setEditando] = useState<{ tipo: "flota"; f: Flota } | { tipo: "config"; c: Configuracion } | null>(null);

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
              {store.flotas.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </Field>
          <Field label="Estructura" htmlFor="f-est">
            <select id="f-est" className="lm-select lm-select--dense" value={fEstructura} onChange={(e) => { setFEstructura(e.target.value); setPagina(0); }}>
              <option value="">Todas</option>
              {store.estructuras.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
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
                  <th>Estructura</th>
                  <th className="num">Unidades</th>
                  <th>Estado</th>
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
                        <td className="muted">{todas.length === 0 ? "—" : todas.length === 1 ? store.estructura(todas[0].estructuraId)?.nombre : `${todas.length} configuraciones`}</td>
                        <td className="num">{total || "—"}</td>
                        <td>
                          <span className="row gap-5 wrap">
                            {todas.length === 0 && <Tag tone="neutral">Sin configurar</Tag>}
                            {activas > 0 && <Tag tone="success" num={activas}>{activas === 1 ? "Activa" : "Activas"}</Tag>}
                            {enConf > 0 && <Tag tone="attention" num={enConf}>En configuración</Tag>}
                          </span>
                        </td>
                        <td className="actions">
                          <span className="row gap-5" style={{ justifyContent: "flex-end" }}>
                            {todas.length === 0 && <Button variant="tonal" small onClick={() => setDialogFlota(f)}>Iniciar configuración</Button>}
                            <Menu label={`Acciones de ${f.nombre}`} items={[
                              { label: "Añadir configuración", icon: "add", onSelect: () => (todas.length === 0 ? setDialogFlota(f) : nuevaConfig(f.id)) },
                              { label: "Modificar nombre y descripción", icon: "edit", onSelect: () => setEditando({ tipo: "flota", f }) },
                            ]} />
                          </span>
                        </td>
                      </tr>
                      {abierta && cs.map((c) => {
                        const est = store.estructura(c.estructuraId);
                        const term = unidadesTerminadas(c, est?.raiz);
                        const incompletas = (c.unidades ?? 0) - term;
                        return (
                          <tr key={c.id} className="is-child">
                            <td />
                            <td style={{ paddingLeft: "var(--lm-space-30)" }}>
                              <span className="row gap-5">
                                <span className="emph">{c.nombre}</span>
                                {c.descripcion && <InfoTooltip text={c.descripcion} label={`Descripción de ${c.nombre}`} />}
                              </span>
                            </td>
                            <td>{est?.nombre ?? <span className="muted">Sin elegir</span>}</td>
                            <td className="num">{c.unidades ?? "—"}</td>
                            <td>
                              <span className="row gap-10">
                                {c.estado === "activa"
                                  ? <Tag tone="success">Activa</Tag>
                                  : <Tag tone="attention">En configuración</Tag>}
                                {c.estado === "en-configuracion" && (
                                  <span className="lm-body-small muted">{est ? `${term}/${c.unidades} unidades terminadas` : "Sin iniciar"}</span>
                                )}
                                {c.estado === "activa" && incompletas > 0 && <Tag tone="warning" icon="warning">{incompletas} unidades incompletas</Tag>}
                              </span>
                            </td>
                            <td className="actions">
                              <span className="row gap-5" style={{ justifyContent: "flex-end" }}>
                                {c.estado === "en-configuracion" && (
                                  <Button variant="tonal" small onClick={() => router.push(`/configuracion/${c.id}`)}>{est ? "Continuar" : "Iniciar configuración"}</Button>
                                )}
                                <Menu label={`Acciones de ${c.nombre}`} items={[
                                  { label: "Modificar nombre y descripción", icon: "edit", onSelect: () => setEditando({ tipo: "config", c }) },
                                  ...(c.estado === "activa"
                                    ? [
                                      { label: "Consultar", icon: "visibility", onSelect: () => router.push(`/configuracion/${c.id}?paso=8`) },
                                      { label: "Añadir unidad", icon: "add", onSelect: () => snack("Añadir unidades a una configuración activa está fuera del alcance de este prototipo") },
                                    ]
                                    : ["divider" as const, { label: "Eliminar", icon: "delete", danger: true, onSelect: () => setADescartar(c) }]),
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
          flota={dialogFlota === true ? undefined : dialogFlota}
          existentes={store.flotas.map((f) => f.nombre.trim().toLowerCase())}
          onClose={() => setDialogFlota(false)}
          onCrear={({ nombre, descripcion, unica, filas }) => {
            const f = dialogFlota === true ? store.crearFlota({ nombre, descripcion }) : dialogFlota;
            // Se crean ya todas sus configuraciones (nombre y unidades); la estructura se elige en el paso 1 de cada una.
            const ids = filas.map((r) => {
              const id = store.iniciarConfig(f.id);
              store.actualizarConfig(id, { nombre: unica ? f.nombre : r.nombre.trim(), descripcion: "", unidades: r.unidades, unica, guardada: true });
              return id;
            });
            setDialogFlota(false);
            if (unica) {
              // Una sola estructura: se sigue directamente con su configuración.
              snack(dialogFlota === true ? `Flota ${f.nombre} creada` : `Configuración de ${f.nombre} creada`);
              router.push(`/configuracion/${ids[0]}?paso=1`);
            } else {
              // Varias: termina aquí; cada configuración se inicia desde el listado.
              setAbiertas((a) => ({ ...a, [f.id]: true }));
              snack(`${dialogFlota === true ? `Flota ${f.nombre} creada con ` : `${f.nombre}: `}${filas.length} configuraciones. Inicia cada una desde el listado`);
            }
          }}
        />
      )}

      {editando && (
        <DialogNombre
          titulo={editando.tipo === "flota" ? `Modificar ${editando.f.nombre}` : `Modificar ${editando.c.nombre}`}
          nombre={editando.tipo === "flota" ? editando.f.nombre : editando.c.nombre}
          descripcion={editando.tipo === "flota" ? editando.f.descripcion : editando.c.descripcion}
          nombreFijo={editando.tipo === "config" && editando.c.unica ? "La flota tiene una sola estructura: la configuración se llama como la flota. Cambia el nombre de la flota" : undefined}
          ocupados={editando.tipo === "flota"
            ? store.flotas.filter((x) => x.id !== editando.f.id).map((x) => x.nombre.trim().toLowerCase())
            : configs.filter((x) => x.flotaId === editando.c.flotaId && x.id !== editando.c.id).map((x) => x.nombre.trim().toLowerCase())}
          onClose={() => setEditando(null)}
          onGuardar={(nombre, descripcion) => {
            if (editando.tipo === "flota") {
              store.actualizarFlota(editando.f.id, { nombre, descripcion });
              // Las configuraciones únicas se llaman como la flota
              configs.filter((x) => x.flotaId === editando.f.id && x.unica).forEach((x) => store.actualizarConfig(x.id, { nombre }));
            } else store.actualizarConfig(editando.c.id, { nombre, descripcion });
            snack(`Cambios guardados en ${nombre}`);
            setEditando(null);
          }} />
      )}

      {aDescartar && (
        <Dialog title="¿Eliminar la configuración?" onClose={() => setADescartar(null)}
          message={`Se eliminará "${aDescartar.nombre}" con lo que tenga configurado: unidades, drivers y datos cargados. La estructura sigue en el catálogo. Esta acción no se puede deshacer.`}
          footer={<>
            <Button variant="outlined" onClick={() => setADescartar(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => { store.descartarConfig(aDescartar.id); snack(`Configuración "${aDescartar.nombre}" eliminada`); setADescartar(null); }}>Eliminar</Button>
          </>} />
      )}
    </main>
  );
}

/** Modificar el nombre y la descripción de una flota o de una configuración. */
function DialogNombre({ titulo, nombre: ini, descripcion: iniDesc, nombreFijo, ocupados, onClose, onGuardar }: {
  titulo: string; nombre: string; descripcion: string; nombreFijo?: string; ocupados: string[];
  onClose: () => void; onGuardar: (nombre: string, descripcion: string) => void;
}) {
  const [nombre, setNombre] = useState(ini);
  const [descripcion, setDescripcion] = useState(iniDesc);
  const [intentado, setIntentado] = useState(false);
  const err = nombreFijo ? "" : !nombre.trim() ? "Indica el nombre" : ocupados.includes(nombre.trim().toLowerCase()) ? "Ya existe otro con este nombre" : "";
  const cambiado = nombre.trim() !== ini || descripcion.trim() !== iniDesc;
  const guardar = () => { setIntentado(true); if (err) return; onGuardar(nombre.trim(), descripcion.trim()); };
  return (
    <Dialog title={titulo} onClose={onClose}
      footer={<>
        <Button variant="outlined" onClick={onClose}>Cancelar</Button>
        <Button disabled={!cambiado} onClick={guardar}>Guardar</Button>
      </>}>
      <div className="stack gap-20">
        <Field label="Nombre" required htmlFor="dn-nombre" error={intentado ? err : ""} support={nombreFijo}>
          <input id="dn-nombre" className="lm-input" value={nombre} disabled={!!nombreFijo} aria-invalid={intentado && !!err} onChange={(e) => setNombre(e.target.value)} />
        </Field>
        <Field label="Descripción" htmlFor="dn-desc">
          <input id="dn-desc" className="lm-input" value={descripcion} placeholder="Por ejemplo: Flota de metro de la línea 4" onChange={(e) => setDescripcion(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}

/**
 * (Prueba) Nueva flota con sus datos básicos: nombre, descripción, si tiene una o varias estructuras,
 * y la estructura y el nº de unidades de cada configuración. Al crear, se crean la flota y sus configuraciones.
 */
function DialogNuevaFlota({ flota, existentes, onClose, onCrear }: {
  flota?: Flota; existentes: string[]; onClose: () => void;
  onCrear: (datos: { nombre: string; descripcion: string; unica: boolean; filas: FilaConfig[] }) => void;
}) {
  const [nombre, setNombre] = useState(flota?.nombre ?? "");
  const [descripcion, setDescripcion] = useState("");
  const [unica, setUnica] = useState(true);
  const [varias, setVarias] = useState<FilaConfig[]>([filaVacia(), filaVacia()]);
  const [textoN, setTextoN] = useState("2");
  const [intentado, setIntentado] = useState(false);

  const errNombre = flota ? "" : !nombre.trim() ? "Indica el nombre de la flota" : existentes.includes(nombre.trim().toLowerCase()) ? "Ya existe una flota con este nombre" : "";
  const errVarias = erroresFilas(varias);
  const filasOk = unica || errVarias.every((e) => !e.nombre);
  const crear = () => {
    setIntentado(true);
    if (errNombre || !filasOk) return;
    onCrear({ nombre: nombre.trim(), descripcion: descripcion.trim(), unica, filas: unica ? [{ ...filaVacia(), nombre: nombre.trim() }] : varias });
  };
  const rojo = { color: "var(--lm-sys-error)" };

  return (
    <Dialog large title={flota ? `Iniciar la configuración de ${flota.nombre}` : "Nueva flota"} message={flota ? "Indica si la flota tiene una o varias estructuras. La estructura y las unidades se indican después, al configurar cada una." : "Indica los datos básicos de la flota. La estructura y las unidades se indican después, al configurar cada configuración."} onClose={onClose}
      footer={<>
        <Button variant="outlined" onClick={onClose}>Cancelar</Button>
        <Button onClick={crear}>{unica ? "Crear y configurar" : "Crear"}</Button>
      </>}>
      <div className="stack gap-20">
        {!flota && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--lm-space-20)" }}>
          <Field label="Nombre" required htmlFor="nf-nombre" error={intentado ? errNombre : ""}>
            <input id="nf-nombre" className="lm-input" value={nombre} aria-invalid={intentado && !!errNombre} onChange={(e) => setNombre(e.target.value)} placeholder="Por ejemplo: Metro Línea 4" />
          </Field>
          <Field label="Descripción" htmlFor="nf-desc">
            <input id="nf-desc" className="lm-input" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </Field>
        </div>}

        <fieldset className="stack gap-10" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="lm-field__label" style={{ marginBottom: "var(--lm-space-10)" }}>¿Cuántas estructuras tiene la flota? <span aria-hidden="true" style={rojo}>*</span></legend>
          <div className="row gap-30">
            <label className="lm-radio" style={{ alignItems: "flex-start" }}>
              <input type="radio" name="nf-unica" checked={unica} onChange={() => setUnica(true)} />
              <span className="lm-radio__text"><span>Una</span><span className="lm-radio__support">Todas sus unidades tienen la misma estructura. La configuración se llamará como la flota</span></span>
            </label>
            <label className="lm-radio" style={{ alignItems: "flex-start" }}>
              <input type="radio" name="nf-unica" checked={!unica} onChange={() => setUnica(false)} />
              <span className="lm-radio__text"><span>Varias</span><span className="lm-radio__support">Una configuración por estructura, cada una con su nombre. Después configurarás cada una desde el listado</span></span>
            </label>
          </div>
        </fieldset>

        {!unica && (
          <div className="stack gap-10">
            <Field label="Número de estructuras" required htmlFor="nf-n" support="Entre 2 y 10" style={{ width: 200 }}>
              <input id="nf-n" className="lm-input" inputMode="numeric" value={textoN}
                onChange={(e) => { setTextoN(e.target.value); const n = Number(e.target.value); if (Number.isInteger(n) && n >= 2 && n <= 10) setVarias(Array.from({ length: n }, (_, i) => varias[i] ?? filaVacia())); }} />
            </Field>
            <table className="lm-table">
              <thead><tr><th style={{ width: 32 }}>Nº</th><th>Nombre de la configuración *</th></tr></thead>
              <tbody>
                {varias.map((fila, i) => {
                  const err = intentado ? errVarias[i] : { nombre: "" };
                  const upd = (x: Partial<FilaConfig>) => setVarias(varias.map((g, j) => (j === i ? { ...g, ...x } : g)));
                  return (
                    <tr key={i}>
                      <td className="muted">{i + 1}</td>
                      <td>
                        <input className="lm-input lm-input--dense" aria-label={`Nombre de la configuración ${i + 1}`} aria-invalid={!!err.nombre} value={fila.nombre} placeholder={`Por ejemplo: Serie ${String.fromCharCode(65 + i)}`} onChange={(ev) => upd({ nombre: ev.target.value })} />
                        {err.nombre && <span className="lm-body-small" style={rojo}>{err.nombre}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
