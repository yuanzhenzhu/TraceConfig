"use client";

// (Prueba, 18-11-2026) Cargar valores de propiedades de categoría con plantilla: el mismo asistente de 4 pasos que
// Cambio de número de serie con plantilla (Ubicación, Descargar, Editar, Subir), con un campo más en Descargar:
// la propiedad de categoría. La plantilla sale con una fila por activo y propiedad, con su valor actual vacío.
// Al aceptar se vuelve a Propiedades de categoría con un snackbar. Prototipo: «error» en el nombre del archivo simula errores.

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Banner, Breadcrumb, Button, Field, Icon, IconButton, Spinner, useSnackbar } from "@/components/ds";
import { generarActivos, unidadesDe, type Activo } from "@/lib/activos";
import { PROPS_CATEGORIA } from "@/lib/model";
import { useStore } from "@/lib/store";
import { etiquetaCfg } from "@/components/configuracion-prueba/nombre";
import { useCambiosSerie } from "@/components/configuracion-prueba/series";

const PASOS = ["Ubicación", "Descargar", "Editar", "Subir"];
const nombreProp = (id: string) => PROPS_CATEGORIA.find((p) => p.id === id)?.nombre ?? id;

export default function ValoresPropsPlantillaPage() {
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const { cambios } = useCambiosSerie();
  const [paso, setPaso] = useState(0);
  const [donde, setDonde] = useState<"unidad" | "almacen">("unidad");
  const [flota, setFlota] = useState("");
  const [unidad, setUnidad] = useState(""); // "configId|1001"
  const [almacen, setAlmacen] = useState("");
  const [cat, setCat] = useState("");
  const [prop, setProp] = useState("");
  const [descargada, setDescargada] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<"nada" | "validando" | "ok" | "errores">("nada");
  const [cargados, setCargados] = useState<{ a: Activo; prop: string; valor: string }[]>([]);
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
  const propsDe = (c: string) => (store.propsCategoria[c] ?? []).map((p) => p.propId);

  const enAlcance = activos.filter((a) => a.donde === donde && (donde === "unidad"
    ? (!flota || a.flotaId === flota) && (!unidad || `${a.configId}|${a.unidad}` === unidad)
    : !almacen || a.almacenId === almacen));
  // Solo categorías que tienen alguna propiedad asignada
  const categorias = [...new Set(enAlcance.map((a) => a.categoria))].filter((c) => propsDe(c).length > 0);
  const propiedades = [...new Set((cat ? [cat] : categorias).flatMap(propsDe))];
  // Filas de la plantilla: una por activo y propiedad
  const filas = enAlcance
    .filter((a) => categorias.includes(a.categoria) && (!cat || a.categoria === cat))
    .flatMap((a) => propsDe(a.categoria).filter((p) => !prop || p === prop).map((p) => ({ a, prop: p })));
  const alcanceListo = donde === "unidad" ? !!flota : !!almacen;
  const cambiarAlcance = (fn: () => void) => { fn(); setDescargada(false); };

  const descargar = () => {
    const cab = ["Nº de serie", "Categoría", "Ubicación", "Propiedad de categoría", "Valor"];
    const csv = "﻿" + [cab, ...filas.map(({ a, prop: p }) => [serie(a), a.categoria, ubicacion(a), nombreProp(p), ""])]
      .map((f) => f.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const el = document.createElement("a");
    el.href = url; el.download = `valores-propiedades-${cat || "categorias"}${prop ? `-${nombreProp(prop)}` : ""}.csv`.toLowerCase().replace(/\s+/g, "-");
    el.click(); URL.revokeObjectURL(url);
    setDescargada(true);
    snack("Plantilla descargada");
  };
  const validar = (f: File) => {
    setArchivo(f); setEstado("validando");
    setTimeout(() => {
      if (f.name.toLowerCase().includes("error")) { setEstado("errores"); return; }
      // Simulación: se cargan valores en las primeras filas
      setCargados(filas.slice(0, Math.min(5, filas.length)).map((x, i) => ({ ...x, valor: String(840 + i * 2) })));
      setEstado("ok");
    }, 1200);
  };
  const quitarArchivo = () => { setArchivo(null); setEstado("nada"); setCargados([]); };
  const aceptar = () => {
    const n = cargados.length;
    snack(`${n} ${n === 1 ? "valor de propiedad cargado" : "valores de propiedades cargados"}`);
    router.push("/configuracion-prueba/propiedades-categoria");
  };
  const cancelar = () => router.push("/configuracion-prueba/propiedades-categoria");

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion-prueba" }, { label: "Propiedades de categoría", href: "/configuracion-prueba/propiedades-categoria" }, { label: "Con plantilla" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Cargar valores de propiedades de categoría con plantilla</h1>
        </div>
      </div>

      <section className="lm-surface lm-surface--p24 stack gap-20">
        <nav aria-label="Pasos de la carga con plantilla">
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
              <label className="lm-radio"><input type="radio" name="vp-donde" checked={donde === "unidad"} onChange={() => cambiarAlcance(() => { setDonde("unidad"); setCat(""); setProp(""); })} />Montado en unidad</label>
              <label className="lm-radio"><input type="radio" name="vp-donde" checked={donde === "almacen"} onChange={() => cambiarAlcance(() => { setDonde("almacen"); setCat(""); setProp(""); })} />En almacén</label>
            </div>
          </fieldset>
        )}

        {paso === 1 && (
          <div className="stack gap-15">
            <span className="lm-body-large">Selecciona los activos y la propiedad. La plantilla saldrá con una fila por activo y propiedad para escribir su valor.</span>
            <div className="row gap-15 wrap" style={{ alignItems: "flex-end" }}>
              {donde === "unidad" ? (
                <>
                  <Field label="Flota" required htmlFor="vp-flota" style={{ width: 220 }}>
                    <select id="vp-flota" className="lm-select" value={flota} onChange={(e) => cambiarAlcance(() => { setFlota(e.target.value); setUnidad(""); setCat(""); setProp(""); })}>
                      <option value="">Elige una flota</option>
                      {flotasConUnidades.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                    </select>
                  </Field>
                  <Field label="Unidad" htmlFor="vp-unidad" style={{ width: 220 }}>
                    <select id="vp-unidad" className="lm-select" value={unidad} disabled={!flota} onChange={(e) => cambiarAlcance(() => { setUnidad(e.target.value); setCat(""); setProp(""); })}>
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
                <Field label="Almacén" required htmlFor="vp-alm" style={{ width: 260 }}>
                  <select id="vp-alm" className="lm-select" value={almacen} onChange={(e) => cambiarAlcance(() => { setAlmacen(e.target.value); setCat(""); setProp(""); })}>
                    <option value="">Elige un almacén</option>
                    {store.almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Categoría" htmlFor="vp-cat" style={{ width: 220 }}>
                <select id="vp-cat" className="lm-select" value={cat} disabled={!alcanceListo} onChange={(e) => cambiarAlcance(() => { setCat(e.target.value); setProp(""); })}>
                  <option value="">Todas las categorías</option>
                  {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Propiedad de categoría" htmlFor="vp-prop" style={{ width: 240 }}>
                <select id="vp-prop" className="lm-select" value={prop} disabled={!alcanceListo} onChange={(e) => cambiarAlcance(() => setProp(e.target.value))}>
                  <option value="">Todas las propiedades</option>
                  {propiedades.map((p) => <option key={p} value={p}>{nombreProp(p)}</option>)}
                </select>
              </Field>
              <Button variant="tonal" icon="file_download" disabled={!alcanceListo || !filas.length} onClick={descargar}>Descargar plantilla</Button>
            </div>
            {alcanceListo && (filas.length === 0 ? (
              <Banner type="attention" title="No hay propiedades de categoría que cargar">
                Ninguna categoría de estos activos tiene propiedades asignadas. Asígnalas en Propiedades de categoría.
              </Banner>
            ) : (
              <span className="lm-body-small muted">
                {filas.length.toLocaleString("es-ES")} filas (activo y propiedad).{descargada ? " Plantilla descargada: ya puedes seguir." : " Descarga la plantilla para seguir."}
              </span>
            ))}
          </div>
        )}

        {paso === 2 && (
          <Banner type="info" title="Edita la plantilla en tu equipo">
            Escribe el valor de la propiedad solo en las filas que quieres cargar. Deja vacías las demás: esos activos se quedan como están.
          </Banner>
        )}

        {paso === 3 && (
          <div className="stack gap-10">
            <span className="lm-body-large">Sube la plantilla con los valores de las propiedades</span>
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
                  No se ha cargado ningún valor. Corrige las filas indicadas y súbela de nuevo.
                </Banner>
                <table className="lm-table">
                  <thead><tr><th>Fila</th><th>Propiedad de categoría</th><th>Error</th></tr></thead>
                  <tbody>
                    <tr><td>6</td><td>{propiedades[0] ? nombreProp(propiedades[0]) : "—"}</td><td>El valor no es un número</td></tr>
                    <tr><td>12</td><td>{propiedades[0] ? nombreProp(propiedades[0]) : "—"}</td><td>La propiedad no está asignada a la categoría del activo</td></tr>
                    <tr><td>19</td><td>—</td><td>Falta el nº de serie: no se puede identificar el activo</td></tr>
                  </tbody>
                </table>
              </>
            ) : (
              <>
                <div className="lm-card row gap-10">
                  <Icon name="attach_file" />
                  <span className="grow"><strong>{archivo?.name}</strong> · {cargados.length} valores a cargar</span>
                  <IconButton icon="close" label="Quitar archivo" onClick={quitarArchivo} />
                </div>
                <table className="lm-table">
                  <thead><tr><th>Nº de serie</th><th>Categoría</th><th>Propiedad de categoría</th><th>Valor</th></tr></thead>
                  <tbody>
                    {cargados.map(({ a, prop: p, valor }) => (
                      <tr key={`${a.id}-${p}`}><td>{serie(a)}</td><td>{a.categoria}</td><td>{nombreProp(p)}</td><td className="emph">{valor}</td></tr>
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
            ? <Button disabled={paso === 1 && !descargada} onClick={() => setPaso(paso + 1)}>Siguiente</Button>
            : <Button disabled={estado !== "ok"} onClick={aceptar}>Aceptar</Button>}
        </div>
      </section>
    </main>
  );
}
