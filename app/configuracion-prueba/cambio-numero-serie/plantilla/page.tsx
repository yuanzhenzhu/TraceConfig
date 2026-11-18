"use client";

// (Prueba, 18-11-2026) Cambio de número de serie con plantilla: asistente de 4 pasos (Figma Main-Trace 1136:58787,
// 1142:53667, 1142:53936 y 1142:54193): 1 Ubicación, 2 Descargar, 3 Editar, 4 Subir. Al aceptar se aplican los
// cambios, se vuelve al listado y sale un snackbar. Prototipo: un archivo con «error» en el nombre simula errores.

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Banner, Breadcrumb, Button, Field, Icon, IconButton, Spinner, useSnackbar } from "@/components/ds";
import { descargarCsv, generarActivos, unidadesDe, type Activo } from "@/lib/activos";
import { useStore } from "@/lib/store";
import { etiquetaCfg } from "@/components/configuracion-prueba/nombre";
import { useCambiosSerie } from "@/components/configuracion-prueba/series";

const PASOS = ["Ubicación", "Descargar", "Editar", "Subir"];

export default function CambioSeriePlantillaPage() {
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const { cambios, aplicar } = useCambiosSerie();
  const [paso, setPaso] = useState(0);
  const [donde, setDonde] = useState<"unidad" | "almacen">("unidad");
  const [flota, setFlota] = useState("");
  const [unidad, setUnidad] = useState(""); // "configId|1001"
  const [almacen, setAlmacen] = useState("");
  const [cat, setCat] = useState("");
  const [descargada, setDescargada] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<"nada" | "validando" | "ok" | "errores">("nada");
  const [nuevos, setNuevos] = useState<Record<string, string>>({});
  const input = useRef<HTMLInputElement>(null);

  const serie = (a: Activo) => cambios[a.id] ?? a.serie;
  const activos = useMemo(() => generarActivos(store.flotas, store.configs, store.estructuras, store.almacenes),
    [store.flotas, store.configs, store.estructuras, store.almacenes]);
  const unidades = unidadesDe(store.configs, store.estructuras);
  const flotasConUnidades = store.flotas.filter((f) => unidades.some((u) => u.c.flotaId === f.id));
  const unidadesFlota = unidades.filter((u) => u.c.flotaId === flota);
  const ubicacion = (a: Activo) => {
    if (a.donde === "almacen") return store.almacenes.find((x) => x.id === a.almacenId)?.nombre ?? "Almacén";
    const c = store.configs.find((x) => x.id === a.configId);
    return `${c ? etiquetaCfg(store, c) : ""} · Unidad ${a.unidad} › ${a.hueco}`;
  };

  const enAlcance = activos.filter((a) => a.donde === donde && (donde === "unidad"
    ? (!flota || a.flotaId === flota) && (!unidad || `${a.configId}|${a.unidad}` === unidad)
    : !almacen || a.almacenId === almacen));
  const categorias = [...new Set(enAlcance.map((a) => a.categoria))];
  const seleccion = enAlcance.filter((a) => !cat || a.categoria === cat);
  // Para descargar hay que elegir la flota (en unidad) o el almacén
  const alcanceListo = donde === "unidad" ? !!flota : !!almacen;
  const cambiarAlcance = (fn: () => void) => { fn(); setDescargada(false); };

  const descargar = () => {
    const nombre = donde === "unidad"
      ? `${store.flotas.find((f) => f.id === flota)?.nombre}${unidad ? `-unidad-${unidad.split("|")[1]}` : ""}`
      : store.almacenes.find((x) => x.id === almacen)?.nombre ?? "almacen";
    descargarCsv(`cambio-numero-serie-${nombre}${cat ? `-${cat}` : ""}`, seleccion.map((a) => ({ ...a, serie: serie(a) })), ubicacion);
    setDescargada(true);
    snack("Plantilla descargada");
  };
  const validar = (f: File) => {
    setArchivo(f); setEstado("validando");
    setTimeout(() => {
      if (f.name.toLowerCase().includes("error")) { setEstado("errores"); return; }
      // Simulación: cambian los primeros activos de la selección
      const muestra = seleccion.slice(0, Math.min(5, seleccion.length));
      setNuevos(Object.fromEntries(muestra.map((a) => [a.id, serie(a).replace(/(\d{3})$/, (m) => String(500 + Number(m)).padStart(3, "0"))])));
      setEstado("ok");
    }, 1200);
  };
  const quitarArchivo = () => { setArchivo(null); setEstado("nada"); setNuevos({}); };
  const aceptar = () => {
    const n = Object.keys(nuevos).length;
    aplicar(nuevos);
    snack(`${n} ${n === 1 ? "número de serie actualizado" : "números de serie actualizados"}`);
    router.push("/configuracion-prueba/cambio-numero-serie");
  };
  const cancelar = () => router.push("/configuracion-prueba/cambio-numero-serie");
  const puedeSeguir = paso === 0 ? true : paso === 1 ? descargada : true;

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion-prueba" }, { label: "Cambio de número de serie", href: "/configuracion-prueba/cambio-numero-serie" }, { label: "Con plantilla" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Cambio de número de serie con plantilla</h1>
        </div>
      </div>

      <section className="lm-surface lm-surface--p24 stack gap-20">
        <nav aria-label="Pasos del cambio con plantilla">
          <ol className="lm-stepper" style={{ listStyle: "none", margin: 0 }}>
            {PASOS.map((t, i) => {
              const cls = i === paso ? "is-current" : i < paso ? "is-done" : "";
              return (
                <li key={t} className="row gap-10" style={{ flex: i < PASOS.length - 1 ? 1 : undefined }}>
                  <button className={`lm-step ${cls}`} disabled={i > paso} aria-current={i === paso ? "step" : undefined} onClick={() => setPaso(i)}>
                    <span className="lm-step__dot">{i < paso ? <Icon name="check" /> : i + 1}</span>
                    <span className="lm-step__label"><span>{t}</span></span>
                  </button>
                  {i < PASOS.length - 1 && <span className="lm-stepper__line" />}
                </li>
              );
            })}
          </ol>
        </nav>

        {paso === 0 && (
          <fieldset className="stack gap-10" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="lm-body-large" style={{ marginBottom: "var(--lm-space-15)" }}>¿Dónde se ubican los activos?</legend>
            <div className="row gap-30">
              <label className="lm-radio"><input type="radio" name="cp-donde" checked={donde === "unidad"} onChange={() => cambiarAlcance(() => { setDonde("unidad"); setCat(""); })} />Montado en unidad</label>
              <label className="lm-radio"><input type="radio" name="cp-donde" checked={donde === "almacen"} onChange={() => cambiarAlcance(() => { setDonde("almacen"); setCat(""); })} />En almacén</label>
            </div>
          </fieldset>
        )}

        {paso === 1 && (
          <div className="stack gap-15">
            <span className="lm-body-large">Selecciona los activos que quieres incluir. La plantilla saldrá con sus números de serie actuales.</span>
            <div className="row gap-15 wrap" style={{ alignItems: "flex-end" }}>
              {donde === "unidad" ? (
                <>
                  <Field label="Flota" required htmlFor="cp-flota" style={{ width: 240 }}>
                    <select id="cp-flota" className="lm-select" value={flota} onChange={(e) => cambiarAlcance(() => { setFlota(e.target.value); setUnidad(""); setCat(""); })}>
                      <option value="">Elige una flota</option>
                      {flotasConUnidades.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                    </select>
                  </Field>
                  <Field label="Unidad" htmlFor="cp-unidad" style={{ width: 240 }}>
                    <select id="cp-unidad" className="lm-select" value={unidad} disabled={!flota} onChange={(e) => cambiarAlcance(() => { setUnidad(e.target.value); setCat(""); })}>
                      <option value="">{flota ? "Todas las unidades" : "Elige antes la flota"}</option>
                      {unidadesFlota.map(({ c, series }) => (
                        <optgroup key={c.id} label={etiquetaCfg(store, c)}>
                          {series.map((s) => <option key={s} value={`${c.id}|${s}`}>Unidad {s}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </Field>
                </>
              ) : (
                <Field label="Almacén" required htmlFor="cp-alm" style={{ width: 280 }}>
                  <select id="cp-alm" className="lm-select" value={almacen} onChange={(e) => cambiarAlcance(() => { setAlmacen(e.target.value); setCat(""); })}>
                    <option value="">Elige un almacén</option>
                    {store.almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Categoría" htmlFor="cp-cat" style={{ width: 240 }}>
                <select id="cp-cat" className="lm-select" value={cat} disabled={!alcanceListo} onChange={(e) => cambiarAlcance(() => setCat(e.target.value))}>
                  <option value="">Todas las categorías</option>
                  {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Button variant="tonal" icon="file_download" disabled={!alcanceListo || !seleccion.length} onClick={descargar}>Descargar plantilla</Button>
            </div>
            {alcanceListo && (
              <span className="lm-body-small muted">
                {seleccion.length.toLocaleString("es-ES")} activos.{descargada ? " Plantilla descargada: ya puedes seguir." : " Descarga la plantilla para seguir."}
              </span>
            )}
          </div>
        )}

        {paso === 2 && (
          <Banner type="info" title="Edita la plantilla en tu equipo">
            Escribe el número de serie nuevo solo en las filas que cambian. Deja vacías las demás: esos activos se quedan como están.
          </Banner>
        )}

        {paso === 3 && (
          <div className="stack gap-10">
            <span className="lm-body-large">Sube la plantilla con los números de serie nuevos</span>
            {estado === "nada" ? (
              <div className="stack gap-5">
                <div className="lm-center" style={{ padding: "var(--lm-space-20)", border: "1px dashed var(--lm-sys-outline)", borderRadius: "var(--lm-corner-30)" }}
                  onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) validar(e.dataTransfer.files[0]); }}>
                  <Button variant="tonal" small icon="file_upload" onClick={() => input.current?.click()}>Subir archivo</Button>
                  <input ref={input} type="file" accept=".xlsx,.csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) validar(f); }} />
                </div>
                <span className="lm-body-small muted">Formatos admitidos: .xlsx, .csv · Hasta 1 archivo</span>
              </div>
            ) : estado === "validando" ? (
              <div className="lm-center" style={{ padding: "var(--lm-space-30)" }}><Spinner label="Validando plantilla" /><span>Validando {archivo?.name}</span></div>
            ) : estado === "errores" ? (
              <>
                <Banner type="error" title="La plantilla tiene errores" actions={<Button variant="outlined" small icon="file_upload" onClick={quitarArchivo}>Subir otra</Button>}>
                  No se ha cambiado ningún nº de serie. Corrige las filas indicadas y súbela de nuevo.
                </Banner>
                <table className="lm-table">
                  <thead><tr><th>Fila</th><th>Nº de serie nuevo</th><th>Error</th></tr></thead>
                  <tbody>
                    <tr><td>8</td><td>RU-1001-014</td><td>Ya existe un activo con este nº de serie</td></tr>
                    <tr><td>15</td><td>EJ-1002-007</td><td>Está repetido en la fila 11</td></tr>
                    <tr><td>23</td><td>—</td><td>Falta el nº de serie actual: no se puede identificar el activo</td></tr>
                  </tbody>
                </table>
              </>
            ) : (
              <>
                <div className="lm-card row gap-10">
                  <Icon name="attach_file" />
                  <span className="grow"><strong>{archivo?.name}</strong> · {Object.keys(nuevos).length} números de serie a cambiar</span>
                  <IconButton icon="close" label="Quitar archivo" onClick={quitarArchivo} />
                </div>
                <table className="lm-table">
                  <thead><tr><th>Ubicación</th><th>Categoría</th><th>Nº de serie actual</th><th>Nº de serie nuevo</th></tr></thead>
                  <tbody>
                    {seleccion.filter((a) => nuevos[a.id]).map((a) => (
                      <tr key={a.id}><td className="muted">{ubicacion(a)}</td><td>{a.categoria}</td><td>{serie(a)}</td><td className="emph">{nuevos[a.id]}</td></tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            <span className="lm-body-small muted">Prototipo: un archivo con «error» en el nombre simula una plantilla con errores.</span>
          </div>
        )}

        <div className="row gap-10" style={{ justifyContent: "flex-end" }}>
          {paso > 0 && <Button variant="text" onClick={() => setPaso(paso - 1)}>Anterior</Button>}
          <Button variant="outlined" onClick={cancelar}>Cancelar</Button>
          {paso < 3
            ? <Button disabled={!puedeSeguir} onClick={() => setPaso(paso + 1)}>Siguiente</Button>
            : <Button disabled={estado !== "ok"} onClick={aceptar}>Aceptar</Button>}
        </div>
      </section>
    </main>
  );
}
