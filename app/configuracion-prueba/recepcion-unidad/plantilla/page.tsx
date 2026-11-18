"use client";

// (Prueba, 18-11-2026) Recepción en unidad con plantilla: mismo patrón que Cambio de número de serie con plantilla,
// en 3 pasos (aquí no hace falta elegir ubicación: siempre son huecos de unidades): 1 Descargar, 2 Editar, 3 Subir.
// La plantilla sale con los huecos pendientes y columnas para nº de serie, km y propiedades.

import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { Banner, Breadcrumb, Button, Field, Icon, IconButton, Spinner, useSnackbar } from "@/components/ds";
import { PROPS_CATEGORIA, PROPS_HUECO } from "@/lib/model";
import { useStore } from "@/lib/store";
import { etiquetaCfg } from "@/components/configuracion-prueba/nombre";
import { ORIGEN, huecosPendientes, useRecepcion, type Origen, type Recibido } from "@/components/configuracion-prueba/recepcion";

const PASOS = ["Descargar", "Editar", "Subir"];
const nombreProp = (id: string) => PROPS_CATEGORIA.find((p) => p.id === id)?.nombre ?? PROPS_HUECO.find((p) => p.id === id)?.nombre ?? id;

export default function RecepcionPlantillaPage() {
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const { recibidos, recibir } = useRecepcion();
  const [paso, setPaso] = useState(0);
  const [cfg, setCfg] = useState("");
  const [origen, setOrigen] = useState<Origen | "">("");
  const [descargada, setDescargada] = useState(false);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<"nada" | "validando" | "ok" | "errores">("nada");
  const [nuevos, setNuevos] = useState<Record<string, Recibido>>({});
  const input = useRef<HTMLInputElement>(null);

  const huecos = useMemo(() => huecosPendientes(store.configs, store.estructuras, store.propsCategoria), [store.configs, store.estructuras, store.propsCategoria]);
  const pendientes = huecos.filter((h) => !recibidos[h.id]);
  const configs = [...new Set(pendientes.map((h) => h.configId))];
  const nombreCfg = (id: string) => { const c = store.configs.find((x) => x.id === id); return c ? etiquetaCfg(store, c) : ""; };
  const seleccion = pendientes.filter((h) => (!cfg || h.configId === cfg) && (!origen || h.origen === origen));
  const cambiar = (fn: () => void) => { fn(); setDescargada(false); };

  const descargar = () => {
    const props = [...new Set(seleccion.flatMap((h) => [...h.propsCategoria, ...h.propsHueco]))];
    const cab = ["Configuración", "Unidad", "Hueco", "Categoría", "Origen", "Nº de serie", "Km", ...props.map(nombreProp)];
    const csv = "﻿" + [cab, ...seleccion.map((h) => [nombreCfg(h.configId), h.unidad, h.hueco, h.categoria, ORIGEN[h.origen], "", "", ...props.map(() => "")])]
      .map((f) => f.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `recepcion-en-unidad${cfg ? `-${nombreCfg(cfg)}` : ""}.csv`.toLowerCase().replace(/\s+/g, "-").replace(/·/g, "");
    a.click(); URL.revokeObjectURL(url);
    setDescargada(true);
    snack("Plantilla descargada");
  };
  const validar = (f: File) => {
    setArchivo(f); setEstado("validando");
    setTimeout(() => {
      if (f.name.toLowerCase().includes("error")) { setEstado("errores"); return; }
      // Simulación: la plantilla trae datos para los primeros 10 huecos de la selección
      const ahora = new Date().toISOString();
      setNuevos(Object.fromEntries(seleccion.slice(0, 10).map((h, i) => [h.id, {
        serie: `${h.categoria.slice(0, 2).toUpperCase()}-${h.unidad}-${String(900 + i)}`, km: String(120000 + i * 350), props: {}, fecha: ahora,
      }])));
      setEstado("ok");
    }, 1200);
  };
  const quitarArchivo = () => { setArchivo(null); setEstado("nada"); setNuevos({}); };
  const aceptar = () => {
    const n = Object.keys(nuevos).length;
    recibir(nuevos);
    snack(`${n} ${n === 1 ? "hueco recibido" : "huecos recibidos"}`);
    router.push("/configuracion-prueba/recepcion-unidad");
  };
  const volver = () => router.push("/configuracion-prueba/recepcion-unidad");

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion-prueba" }, { label: "Recepción en unidad", href: "/configuracion-prueba/recepcion-unidad" }, { label: "Con plantilla" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Recepción en unidad con plantilla</h1>
        </div>
      </div>

      <section className="lm-surface lm-surface--p24 stack gap-20">
        <nav aria-label="Pasos de la recepción con plantilla">
          <ol className="lm-stepper" style={{ listStyle: "none", margin: 0 }}>
            {PASOS.map((t, i) => (
              <li key={t} className="row gap-10" style={{ flex: i < PASOS.length - 1 ? 1 : undefined }}>
                <button className={`lm-step ${i === paso ? "is-current" : i < paso ? "is-done" : ""}`} disabled={i > paso} aria-current={i === paso ? "step" : undefined} onClick={() => setPaso(i)}>
                  <span className="lm-step__dot">{i < paso ? <Icon name="check" /> : i + 1}</span>
                  <span className="lm-step__label"><span>{t}</span></span>
                </button>
                {i < PASOS.length - 1 && <span className="lm-stepper__line" />}
              </li>
            ))}
          </ol>
        </nav>

        {paso === 0 && (
          <div className="stack gap-15">
            <span className="lm-body-large">Elige qué huecos pendientes incluir. La plantilla saldrá con una fila por hueco y columnas para nº de serie, km y propiedades.</span>
            <div className="row gap-15 wrap" style={{ alignItems: "flex-end" }}>
              <Field label="Flota y estructura" htmlFor="rp-cfg" style={{ width: 300 }}>
                <select id="rp-cfg" className="lm-select" value={cfg} onChange={(e) => cambiar(() => setCfg(e.target.value))}>
                  <option value="">Todas</option>
                  {configs.map((id) => <option key={id} value={id}>{nombreCfg(id)}</option>)}
                </select>
              </Field>
              <Field label="Origen" htmlFor="rp-origen" style={{ width: 240 }}>
                <select id="rp-origen" className="lm-select" value={origen} onChange={(e) => cambiar(() => setOrigen(e.target.value as Origen | ""))}>
                  <option value="">Todos</option>
                  <option value="estructura">{ORIGEN.estructura}</option>
                  <option value="unidad">{ORIGEN.unidad}</option>
                </select>
              </Field>
              <Button variant="tonal" icon="file_download" disabled={!seleccion.length} onClick={descargar}>Descargar plantilla</Button>
            </div>
            <span className="lm-body-small muted">{seleccion.length} huecos pendientes.{descargada ? " Plantilla descargada: ya puedes seguir." : " Descarga la plantilla para seguir."}</span>
          </div>
        )}

        {paso === 1 && (
          <Banner type="info" title="Rellena la plantilla en tu equipo">
            Escribe el nº de serie y los km de cada hueco (son obligatorios) y, si los tienes, los valores de sus propiedades. Las filas que dejes vacías siguen pendientes.
          </Banner>
        )}

        {paso === 2 && (
          <div className="stack gap-10">
            <span className="lm-body-large">Sube la plantilla con los datos de los huecos</span>
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
                  No se ha recibido ningún hueco. Corrige las filas indicadas y súbela de nuevo.
                </Banner>
                <table className="lm-table">
                  <thead><tr><th>Fila</th><th>Columna</th><th>Error</th></tr></thead>
                  <tbody>
                    <tr><td>4</td><td>Km</td><td>Los km son obligatorios</td></tr>
                    <tr><td>9</td><td>Nº de serie</td><td>Ya existe un activo con este nº de serie</td></tr>
                    <tr><td>17</td><td>Hueco</td><td>El hueco no está pendiente en esta unidad</td></tr>
                  </tbody>
                </table>
              </>
            ) : (
              <>
                <div className="lm-card row gap-10">
                  <Icon name="attach_file" />
                  <span className="grow"><strong>{archivo?.name}</strong> · {Object.keys(nuevos).length} huecos con datos</span>
                  <IconButton icon="close" label="Quitar archivo" onClick={quitarArchivo} />
                </div>
                <table className="lm-table">
                  <thead><tr><th>Unidad</th><th>Hueco</th><th>Categoría</th><th>Nº de serie</th><th className="num">Km</th></tr></thead>
                  <tbody>
                    {seleccion.filter((h) => nuevos[h.id]).map((h) => (
                      <tr key={h.id}><td>{h.unidad}</td><td className="muted">{h.hueco}</td><td>{h.categoria}</td><td className="emph">{nuevos[h.id].serie}</td><td className="num">{Number(nuevos[h.id].km).toLocaleString("es-ES")}</td></tr>
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
          <Button variant="outlined" onClick={volver}>Cancelar</Button>
          {paso < 2
            ? <Button disabled={paso === 0 && !descargada} onClick={() => setPaso(paso + 1)}>Siguiente</Button>
            : <Button disabled={estado !== "ok"} onClick={aceptar}>Aceptar</Button>}
        </div>
      </section>
    </main>
  );
}
