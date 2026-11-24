"use client";

// Pasos 7 (Plantillas) y 8 (Resumen y finalizar).
// (Prueba, 18-11-2026) Plantillas sin niveles ni candados: cualquier plantilla se puede cargar en cualquier orden y
// Sin contadores de unidades terminadas.
// (Prueba, 24-11-2026) Todas las plantillas son obligatorias, en el alta y al añadir unidades.
// Dos formas de cargarlas (pestañas): por categoría o por unidad (Excel con una pestaña por categoría).

import { useRef, useState } from "react";
import { Banner, Button, Dialog, Icon, IconButton, Spinner, Tag, useSnackbar } from "../ds";
import {
  DRIVERS, PROPS_CATEGORIA, categoriasDe, contarHuecos, driversEfectivos, primerNivelCargado, recorrer, rutaDe,
  type Configuracion, type EstadoPlantilla, type Estructura, type Flota, type Nodo, type DriversConfig, type PropsCategoria,
} from "@/lib/model";
import { useStore } from "@/lib/store";
import { resumenPropiedades } from "./propiedades";
import { todasCargadas } from "./plantillas";
import type { PasoProps } from "./pasos-1-3";

const ESTADO: Record<EstadoPlantilla, { tone: "neutral" | "success" | "error"; txt: string }> = {
  pendiente: { tone: "neutral", txt: "Pendiente" },
  cargada: { tone: "success", txt: "Cargada" },
  errores: { tone: "error", txt: "Con errores" },
};

/** Genera la plantilla CSV (separador ;) de una categoría y la descarga. */
function descargarPlantilla(c: Configuracion, raiz: Nodo, drivers: DriversConfig | null, propsCategoria: PropsCategoria, categoria: string) {
  const huecos: { id: string }[] = [];
  recorrer(raiz, (n) => { if (n.categoria === categoria) huecos.push({ id: n.id }); });
  // El km es obligatorio en todas las plantillas. Además, una columna por cada otro driver (ciclos, horas)
  // que tenga elegido algún hueco de la categoría, y luego las propiedades de categoría asignadas.
  const ef = driversEfectivos(drivers, raiz);
  const otros = DRIVERS.filter((d) => d.id !== "km" && huecos.some((h) => ef.drivers[h.id]?.[d.id])).map((d) => d.nombre);
  const props = (propsCategoria[categoria] ?? []).map((p) => PROPS_CATEGORIA.find((x) => x.id === p.propId)?.nombre ?? p.propId);
  const esRaiz = categoria === raiz.categoria;
  const cab = esRaiz
    ? ["Nº de serie de la unidad", "Km", "Fecha", ...otros, ...props]
    : ["Nº de serie de la unidad", "Nº de serie del activo", "Km", ...otros, ...props];
  const unidades = Array.from({ length: c.unidades ?? 0 }, (_, i) => (primerNivelCargado(c, raiz) ? String(1001 + i) : ""));
  const filas = esRaiz
    ? unidades.map(() => cab.map(() => ""))
    : unidades.flatMap((u) => huecos.map(() => [u, ...cab.slice(1).map(() => "")]));
  const csv = "﻿" + [cab, ...filas].map((f) => f.map((v) => `"${v.replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `plantilla-${c.nombre || "estructura"}-${categoria}.csv`.toLowerCase().replace(/\s+/g, "-");
  a.click(); URL.revokeObjectURL(url);
}

/** Nombre de una hoja de Excel: máximo 31 caracteres y sin \ / ? * [ ] : */
const nombreHoja = (s: string) => s.replace(/[\\/?*[\]:]/g, " ").slice(0, 31);

/**
 * (Prueba, 24-11-2026) Plantilla por unidad: un Excel con una pestaña por categoría y, en cada pestaña,
 * una fila por hueco de esa categoría en la unidad (km obligatorio, otros drivers y propiedades de categoría).
 */
async function descargarPlantillaUnidad(c: Configuracion, raiz: Nodo, drivers: DriversConfig | null, propsCategoria: PropsCategoria, unidad: number) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ef = driversEfectivos(drivers, raiz);
  categoriasDe(raiz).forEach(({ categoria }) => {
    const huecos: Nodo[] = [];
    recorrer(raiz, (n) => { if (n.categoria === categoria) huecos.push(n); });
    const otros = DRIVERS.filter((d) => d.id !== "km" && huecos.some((h) => ef.drivers[h.id]?.[d.id])).map((d) => d.nombre);
    const props = (propsCategoria[categoria] ?? []).map((p) => PROPS_CATEGORIA.find((x) => x.id === p.propId)?.nombre ?? p.propId);
    const ws = wb.addWorksheet(nombreHoja(categoria));
    const esRaiz = categoria === raiz.categoria;
    ws.addRow(esRaiz ? ["Nº de serie de la unidad", "Km", "Fecha", ...otros, ...props] : ["Hueco", "Nº de serie del activo", "Km", ...otros, ...props]);
    ws.getRow(1).font = { bold: true };
    if (esRaiz) ws.addRow([""]);
    else huecos.forEach((h) => ws.addRow([rutaDe(raiz, h.id).join(" › ")]));
    ws.columns.forEach((col) => { col.width = 28; });
  });
  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url; a.download = `plantilla-${c.nombre || "estructura"}-unidad-${unidad}.xlsx`.toLowerCase().replace(/\s+/g, "-");
  a.click(); URL.revokeObjectURL(url);
}

type Forma = "categoria" | "unidad";

export function Paso7({ c, set, est, soloLectura: consulta, anadir }: PasoProps) {
  const soloLectura = consulta && !anadir; // al añadir unidades sí se suben plantillas
  const snack = useSnackbar();
  const store = useStore();
  const raiz = est!.raiz;
  const cats = categoriasDe(raiz);
  const activosPorUnidad = contarHuecos(raiz);
  const desde = anadir?.antes ?? 0;
  // Por unidad: en el alta todas las unidades; al añadir unidades, solo las nuevas
  const unidades = Array.from({ length: Math.max(0, (c.unidades ?? 0) - desde) }, (_, i) => desde + i + 1);
  const pu = c.plantillasUnidad ?? {};
  const [forma, setForma] = useState<Forma>(() => (Object.keys(pu).length && !Object.values(c.plantillas).some((x) => x === "cargada") ? "unidad" : "categoria"));
  const [subiendo, setSubiendo] = useState<{ forma: Forma; clave: string } | null>(null);
  const [errores, setErrores] = useState<{ forma: Forma; clave: string } | null>(null);

  const pendCats = cats.filter((x) => c.plantillas[x.categoria] !== "cargada").length;
  const pendUnid = unidades.filter((u) => pu[String(u)] !== "cargada").length;
  const completo = todasCargadas(c, raiz, desde);
  const etiqueta = (f: Forma, clave: string) => (f === "categoria" ? clave : `la unidad ${clave}`);

  return (
    <section className="lm-surface lm-surface--p24 stack gap-20">
      <h2 className="lm-title-medium" style={{ margin: 0 }}>Plantillas</h2>
      <p className="muted" style={{ margin: 0 }}>
        {soloLectura
          ? "Estado de las plantillas. Puedes descargarlas, pero no subirlas."
          : `Carga los datos de ${anadir ? "las unidades nuevas" : "las unidades"} de una de estas dos formas: una plantilla por categoría (con todas las unidades) o una plantilla por unidad (un Excel con una pestaña por categoría). Hay que cargarlas todas para ${anadir ? "añadir las unidades" : "finalizar"}.`}
      </p>
      {!soloLectura && (completo ? (
        <Banner type="success" title={anadir ? "Plantillas cargadas: ya puedes añadir las unidades" : "Plantillas cargadas: ya puedes finalizar"} />
      ) : (
        <Banner type="attention" title={forma === "categoria" ? `Faltan ${pendCats} de ${cats.length} plantillas por categoría` : `Faltan ${pendUnid} de ${unidades.length} plantillas por unidad`}>
          {anadir ? "Si no las cargas y sales, no se guarda ningún cambio." : "Todas son obligatorias para finalizar."}
        </Banner>
      ))}

      <div className="lm-tabs" role="tablist" style={{ marginBottom: 0 }}>
        <button role="tab" className="lm-tab" aria-selected={forma === "categoria"} onClick={() => setForma("categoria")}>Por categoría</button>
        <button role="tab" className="lm-tab" aria-selected={forma === "unidad"} onClick={() => setForma("unidad")}>Por unidad</button>
      </div>

      {forma === "categoria" ? (
        <>
          <table className="lm-table">
            <thead>
              <tr><th>Categoría</th><th className="num">Huecos por unidad</th><th className="num">Registros</th><th>Estado</th><th className="actions">Acciones</th></tr>
            </thead>
            <tbody>
              {cats.map((x) => {
                const e = c.plantillas[x.categoria] ?? "pendiente";
                return (
                  <tr key={x.categoria}>
                    <td><span className="emph">{x.categoria}</span></td>
                    <td className="num">{x.huecos}</td>
                    <td className="num">
                      {anadir && (c.unidades ?? 0) > anadir.antes ? (
                        // Añadir unidades: registros que ya había + los de las unidades nuevas
                        <span className="row gap-5" style={{ justifyContent: "flex-end" }}>
                          {(x.huecos * anadir.antes).toLocaleString("es-ES")}
                          <strong aria-label={`${x.huecos * ((c.unidades ?? 0) - anadir.antes)} registros nuevos`}>
                            + {(x.huecos * ((c.unidades ?? 0) - anadir.antes)).toLocaleString("es-ES")}
                          </strong>
                        </span>
                      ) : (x.huecos * (c.unidades ?? 0)).toLocaleString("es-ES")}
                    </td>
                    <td>
                      <span className="row gap-10">
                        <Tag tone={ESTADO[e].tone}>{ESTADO[e].txt}</Tag>
                        {e === "errores" && !soloLectura && <Button variant="text" small onClick={() => setErrores({ forma: "categoria", clave: x.categoria })}>Ver errores</Button>}
                      </span>
                    </td>
                    <td className="actions">
                      <span className="row gap-5" style={{ justifyContent: "flex-end" }}>
                        <IconButton icon="file_download" label={`Descargar plantilla de ${x.categoria}`}
                          onClick={() => { descargarPlantilla(c, raiz, c.drivers, store.propsCategoria, x.categoria); snack(`Plantilla de ${x.categoria} descargada`); }} />
                        {!soloLectura && (
                          <Button variant={e === "cargada" ? "text" : "outlined"} small icon="file_upload" onClick={() => setSubiendo({ forma: "categoria", clave: x.categoria })}>
                            {e === "cargada" ? "Reemplazar" : "Subir"}
                          </Button>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {anadir && (c.unidades ?? 0) > anadir.antes && (
            <span className="lm-body-small muted">Registros: actuales <strong>+ nuevos</strong> por las {(c.unidades ?? 0) - anadir.antes} unidades añadidas</span>
          )}
        </>
      ) : unidades.length === 0 ? (
        <span className="muted">Indica primero el número de unidades en el paso Estructura y unidades.</span>
      ) : (
        <>
          <table className="lm-table">
            <thead>
              <tr><th>Unidad</th><th className="num">Activos por rellenar</th><th>Estado</th><th className="actions">Acciones</th></tr>
            </thead>
            <tbody>
              {unidades.map((u) => {
                const clave = String(u);
                const e = pu[clave] ?? "pendiente";
                return (
                  <tr key={u}>
                    <td><span className="emph">Unidad {u}</span>{anadir && <span className="muted"> · nueva</span>}</td>
                    <td className="num">{e === "cargada" ? 0 : activosPorUnidad}</td>
                    <td>
                      <span className="row gap-10">
                        <Tag tone={ESTADO[e].tone}>{ESTADO[e].txt}</Tag>
                        {e === "errores" && !soloLectura && <Button variant="text" small onClick={() => setErrores({ forma: "unidad", clave })}>Ver errores</Button>}
                      </span>
                    </td>
                    <td className="actions">
                      <span className="row gap-5" style={{ justifyContent: "flex-end" }}>
                        <IconButton icon="file_download" label={`Descargar plantilla de la unidad ${u}`}
                          onClick={() => { void descargarPlantillaUnidad(c, raiz, c.drivers, store.propsCategoria, u).then(() => snack(`Plantilla de la unidad ${u} descargada`)); }} />
                        {!soloLectura && (
                          <Button variant={e === "cargada" ? "text" : "outlined"} small icon="file_upload" onClick={() => setSubiendo({ forma: "unidad", clave })}>
                            {e === "cargada" ? "Reemplazar" : "Subir"}
                          </Button>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <span className="lm-body-small muted">Cada plantilla es un Excel con una pestaña por categoría ({cats.length}) y una fila por hueco: {activosPorUnidad} activos por unidad.</span>
        </>
      )}

      {subiendo && (
        <DialogSubida categoria={subiendo.forma === "categoria" ? subiendo.clave : `la unidad ${subiendo.clave}`} c={c} onClose={() => setSubiendo(null)}
          onResultado={(ok) => {
            const { forma: f, clave } = subiendo;
            if (f === "categoria") {
              set({ plantillas: { ...c.plantillas, [clave]: ok ? "cargada" : "errores" }, intentosPlantilla: { ...c.intentosPlantilla, [clave]: (c.intentosPlantilla[clave] ?? 0) + 1 } });
            } else {
              set({ plantillasUnidad: { ...pu, [clave]: ok ? "cargada" : "errores" } });
            }
            setSubiendo(null);
            if (ok) snack(`Plantilla de ${etiqueta(f, clave)} cargada`); else setErrores({ forma: f, clave });
          }} />
      )}
      {errores && (
        <Dialog large title={`Errores en la plantilla de ${etiqueta(errores.forma, errores.clave)}`} onClose={() => setErrores(null)}
          message="No se ha cargado ningún dato de esta plantilla. Corrige las filas indicadas y súbela de nuevo."
          footer={<>
            <Button variant="outlined" onClick={() => setErrores(null)}>Cerrar</Button>
            <Button icon="file_upload" onClick={() => { const x = errores; setErrores(null); setSubiendo(x); }}>Subir de nuevo</Button>
          </>}>
          <table className="lm-table">
            <thead><tr>{errores.forma === "unidad" && <th>Pestaña</th>}<th>Fila</th><th>Columna</th><th>Error</th></tr></thead>
            <tbody>
              <tr>{errores.forma === "unidad" && <td>Rueda</td>}<td>14</td><td>Nº de serie del activo</td><td>El nº de serie R-55210 está repetido en la fila 9</td></tr>
              <tr>{errores.forma === "unidad" && <td>Bogie</td>}<td>22</td><td>Km</td><td>El km es obligatorio</td></tr>
              <tr>{errores.forma === "unidad" && <td>{raiz.categoria}</td>}<td>{errores.forma === "unidad" ? 2 : 37}</td><td>Nº de serie de la unidad</td><td>{errores.forma === "unidad" ? "El nº de serie de la unidad es obligatorio" : "La unidad 1012 no existe en esta configuración"}</td></tr>
            </tbody>
          </table>
        </Dialog>
      )}
    </section>
  );
}

function DialogSubida({ categoria, c, onClose, onResultado }: {
  categoria: string; c: Configuracion; onClose: () => void; onResultado: (ok: boolean) => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [validando, setValidando] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const subir = () => {
    setValidando(true);
    // Simulación: la plantilla de Rueda falla la primera vez para enseñar el caso de error.
    const falla = archivo!.name.toLowerCase().includes("error") || (categoria === "Rueda" && !(c.intentosPlantilla[categoria] ?? 0));
    setTimeout(() => onResultado(!falla), 1200);
  };
  return (
    <Dialog title={`Subir plantilla de ${categoria}`} onClose={validando ? () => {} : onClose}
      footer={<>
        <Button variant="outlined" disabled={validando} onClick={onClose}>Cancelar</Button>
        <Button disabled={!archivo || validando} onClick={subir}>Subir y validar</Button>
      </>}>
      {validando ? (
        <div className="lm-center" style={{ padding: "var(--lm-space-50)" }}><Spinner label="Validando plantilla" /><span>Validando {archivo?.name}</span></div>
      ) : (
        <div className="stack gap-10 lm-center" style={{ padding: "var(--lm-space-40)", border: "1px dashed var(--lm-sys-outline)", borderRadius: "var(--lm-corner-30)" }}
          onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) setArchivo(e.dataTransfer.files[0]); }}>
          <Icon name="file_upload" size="xl" />
          {archivo ? (
            <span className="row gap-10"><Icon name="attach_file" /><strong>{archivo.name}</strong><IconButton compact icon="close" label="Quitar archivo" onClick={() => setArchivo(null)} /></span>
          ) : (
            <span>Arrastra aquí el archivo o</span>
          )}
          <Button variant="outlined" small onClick={() => input.current?.click()}>Seleccionar archivo</Button>
          <span className="lm-body-small">Formatos admitidos: .xlsx, .csv</span>
          <input ref={input} type="file" accept=".xlsx,.csv" hidden onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
        </div>
      )}
    </Dialog>
  );
}

function huecosConValor(raiz: Nodo, def: Record<string, Record<string, string>>, val: Record<string, Record<string, string>>) {
  let n = 0; recorrer(raiz, (h) => { if (Object.keys(def[h.id] ?? {}).some((p) => val[h.id]?.[p])) n++; });
  return n;
}

/* ---------- Paso 8 ---------- */
export function Paso8({ c, flota, est, irA, soloLectura, anadir }: { c: Configuracion; flota: Flota; est: Estructura; irA: (n: number) => void; soloLectura?: boolean; anadir?: { antes: number } }) {
  const raiz = est.raiz;
  const cats = categoriasDe(raiz);
  const pendientes = cats.filter((x) => c.plantillas[x.categoria] !== "cargada");
  const store = useStore();
  const ef = driversEfectivos(c.drivers, raiz);
  const nDrivers = DRIVERS.map((d) => ({
    d, n: Object.values(ef.drivers).filter((x) => x[d.id]).length, h: Object.values(ef.heredables).filter((x) => x[d.id]).length,
  }));
  const { nCat: nPropsCat, nHuecos: nHuecosProps } = resumenPropiedades(raiz, { propsCategoria: store.propsCategoria, propsHueco: est.propsHueco ?? {} });
  const omitido = (n: number) => c.pasosOmitidos.includes(n);

  // Textos del resumen (paso 6): solo lo esencial de cada paso.
  const conDrivers = nDrivers.filter(({ n }) => n > 0).map(({ d }) => d.nombre.toLowerCase());
  const lista = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} y ${xs[xs.length - 1]}` : xs[0] ?? "");
  const catsConProps = cats.filter((x) => (store.propsCategoria[x.categoria] ?? []).length > 0).length;

  // (Prueba) En el orden del asistente. La estructura y las unidades se eligieron en Asignar estructura: no se editan aquí.
  const bloques: { n: number; titulo: string; contenido: React.ReactNode; aviso?: string; fijo?: boolean }[] = [
    { n: 1, titulo: "Estructura y unidades", fijo: !anadir, contenido: <>
      <strong>{est.nombre}</strong>{est.descripcion && ` · ${est.descripcion}`}<br />
      {c.unidades} unidades<br />
      {nHuecosProps ? "Con propiedades de hueco asignadas" : "Sin propiedades de hueco asignadas"}
    </> },
    { n: 4, titulo: "Propiedades de categoría", contenido: <>Comunes a todas las flotas<br />{catsConProps} {catsConProps === 1 ? "categoría" : "categorías"} con propiedades</> },
    { n: 2, titulo: "Propiedades de hueco", contenido: nHuecosProps
      ? `${huecosConValor(raiz, est.propsHueco ?? {}, c.valoresHueco ?? {})} de ${nHuecosProps} huecos con valores`
      : "No hay propiedades de hueco en esta configuración" },
    { n: 3, titulo: "Drivers", contenido: <>
      {conDrivers.length ? `Tiene ${lista(conDrivers)}` : "Sin drivers"}
    </> },
    { n: 7, titulo: "Plantillas", contenido: <>{cats.length - pendientes.length} de {cats.length} plantillas cargadas<br />{pendientes.length ? `Faltan ${pendientes.map((p) => p.categoria).join(", ")}` : "Todas cargadas"}</> },
  ];

  return (
    <section className="stack gap-20">
      {anadir ? (
        (c.unidades ?? 0) <= anadir.antes ? (
          <Banner type="attention" title="Todavía no has añadido unidades" actions={<Button variant="outlined" small onClick={() => irA(1)}>Ir a Estructura y unidades</Button>}>
            Indica un número de unidades mayor que las {anadir.antes} actuales.
          </Banner>
        ) : !todasCargadas(c, est.raiz) ? (
          <Banner type="attention" title="Faltan plantillas por cargar" actions={<Button variant="outlined" small onClick={() => irA(7)}>Ir a Plantillas</Button>}>
            Todas son obligatorias para añadir las {(c.unidades ?? 0) - anadir.antes} unidades nuevas. Faltan: {pendientes.map((p) => p.categoria).join(", ")}.
          </Banner>
        ) : (
          <Banner type="info" title={`Todo listo para añadir ${(c.unidades ?? 0) - anadir.antes} unidades`}>
            La configuración pasará de {anadir.antes} a {c.unidades} unidades.
          </Banner>
        )
      ) : soloLectura ? (
        <Banner type="success" title="Configuración en uso">
          Sus unidades están operativas.
        </Banner>
      ) : todasCargadas(c, raiz) ? (
        <Banner type="info" title="Todo listo para finalizar">
          Al finalizar, la configuración pasará a En uso y sus {c.unidades} unidades quedarán disponibles para operar.
        </Banner>
      ) : (
        <Banner type="attention" title="Todavía no puedes finalizar" actions={<Button variant="outlined" small onClick={() => irA(7)}>Ir a Plantillas</Button>}>
          Todas las plantillas son obligatorias. Faltan: {pendientes.map((p) => p.categoria).join(", ")}.
        </Banner>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--lm-space-20)" }}>
        {bloques.map((b, i) => (
          <article key={b.titulo} className="lm-card stack gap-10">
            <div className="row gap-10">
              <span className="lm-step__dot" style={{ background: "var(--lm-sys-primary-container)", color: "var(--lm-sys-on-primary-container)" }}>{i + 1}</span>
              <span className="lm-title-small grow">{b.titulo}</span>
              {!soloLectura && !b.fijo && <Button variant="text" small icon="edit" onClick={() => irA(b.n)}>Editar</Button>}
            </div>
            <span>{b.contenido}</span>
            {b.aviso && <span className="row gap-5 lm-body-small" style={{ color: "var(--lm-on-attention-container)" }}><Icon name="warning" size="m" />{b.aviso}</span>}
          </article>
        ))}
      </div>
      <span className="lm-body-small muted">Flota {flota.nombre}</span>
    </section>
  );
}
