"use client";

// Pasos 7 (Carga de datos mediante plantillas) y 8 (Resumen y finalizar).

import { useRef, useState } from "react";
import { Banner, Button, Dialog, Icon, IconButton, Spinner, Tag, useSnackbar } from "./ds";
import { iconoCategoria } from "./arbol";
import {
  DRIVERS, FORMAS_CALCULO, PASOS, PROPS_CATEGORIA, categoriasDe, contarHuecos, driversEfectivos, primerNivelCargado, recorrer,
  rutaDe, unidadesTerminadas, type Configuracion, type EstadoPlantilla, type Estructura, type Flota, type Nodo, type PerfilDrivers, type PerfilPropiedades,
} from "@/lib/model";
import { useStore } from "@/lib/store";
import { resumenPropiedades } from "./propiedades";
import type { PasoProps } from "./pasos-1-3";

const ESTADO: Record<EstadoPlantilla, { tone: "neutral" | "success" | "error"; txt: string }> = {
  pendiente: { tone: "neutral", txt: "Pendiente" },
  cargada: { tone: "success", txt: "Cargada" },
  errores: { tone: "error", txt: "Con errores" },
};

/** Genera la plantilla CSV (separador ;) de una categoría y la descarga. */
function descargarPlantilla(c: Configuracion, raiz: Nodo, perfil: PerfilDrivers | undefined, propiedades: PerfilPropiedades | undefined, categoria: string) {
  const huecos: { id: string; ruta: string }[] = [];
  recorrer(raiz, (n) => { if (n.categoria === categoria) huecos.push({ id: n.id, ruta: rutaDe(raiz, n.id).join(" > ") || n.nombre }); });
  // Solo se pide el valor inicial de los drivers propios: si el driver es heredable, el valor viene del padre.
  const ef = driversEfectivos(perfil, raiz);
  const drvs = DRIVERS.filter((d) => ef.drivers[categoria]?.[d.id] && !ef.heredables[categoria]?.[d.id]); // los drivers son por categoría
  const props = (propiedades?.propsCategoria[categoria] ?? []).map((p) => PROPS_CATEGORIA.find((x) => x.id === p.propId)?.nombre ?? p.propId);
  const esRaiz = categoria === raiz.categoria;
  const cab = esRaiz
    ? ["Nº de serie de la unidad", "Fecha de alta", ...drvs.map((d) => `${d.nombre} inicial`), ...props]
    : ["Nº de serie de la unidad", "Hueco", "Nº de serie del activo", "Fecha de montaje", ...drvs.map((d) => `${d.nombre} inicial`), ...props];
  const unidades = Array.from({ length: c.unidades ?? 0 }, (_, i) => (primerNivelCargado(c, raiz) ? String(1001 + i) : ""));
  const filas = esRaiz
    ? unidades.map(() => cab.map(() => ""))
    : unidades.flatMap((u) => huecos.map((h) => [u, h.ruta, ...cab.slice(2).map(() => "")]));
  const csv = "﻿" + [cab, ...filas].map((f) => f.map((v) => `"${v.replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `plantilla-${c.nombre || "configuracion"}-${categoria}.csv`.toLowerCase().replace(/\s+/g, "-");
  a.click(); URL.revokeObjectURL(url);
}

export function Paso7({ c, set, est }: PasoProps) {
  const snack = useSnackbar();
  const store = useStore();
  const perfil = store.perfil(c.perfilDriversId);
  const propiedades = store.perfilProps(c.perfilPropiedadesId);
  const raiz = est!.raiz;
  const cats = categoriasDe(raiz);
  const [subiendo, setSubiendo] = useState<string | null>(null);
  const [errores, setErrores] = useState<string | null>(null);

  const habilitada = (nivel: number) => cats.filter((x) => x.nivel < nivel).every((x) => c.plantillas[x.categoria] === "cargada");
  const cargadas = cats.filter((x) => c.plantillas[x.categoria] === "cargada").length;
  const term = unidadesTerminadas(c, raiz);

  return (
    <section className="lm-surface lm-surface--p24 stack gap-20">
      <h2 className="lm-title-medium" style={{ margin: 0 }}>Carga de datos</h2>
      <p className="muted" style={{ margin: 0 }}>
        Descarga la plantilla de cada categoría, rellénala y súbela. Los niveles se habilitan a medida que cargas los anteriores. Puedes cargarlas poco a poco y salir cuando quieras.
      </p>
      {c.estado === "activa" ? null : !primerNivelCargado(c, raiz) ? (
        <Banner type="attention" title="Carga primero la plantilla de unidades (Tren)">
          Es la única obligatoria para finalizar: contiene el nº de serie y la fecha de alta de cada unidad.
        </Banner>
      ) : (
        <Banner type="success" title="Primer nivel cargado: ya puedes finalizar">
          Las plantillas que queden pendientes se podrán cargar después. Las unidades afectadas quedarán como incompletas.
        </Banner>
      )}
      <div className="row gap-30">
        <span className="stack"><span className="lm-headline-small">{cargadas}/{cats.length}</span><span className="lm-body-small muted">plantillas cargadas</span></span>
        <span className="stack"><span className="lm-headline-small">{term}/{c.unidades}</span><span className="lm-body-small muted">unidades terminadas</span></span>
      </div>
      <table className="lm-table">
        <thead>
          <tr><th>Nivel</th><th>Categoría</th><th className="num">Huecos por unidad</th><th className="num">Registros</th><th>Estado</th><th className="actions">Acciones</th></tr>
        </thead>
        <tbody>
          {cats.map((x) => {
            const est = c.plantillas[x.categoria] ?? "pendiente";
            const ok = habilitada(x.nivel);
            return (
              <tr key={x.categoria} style={{ opacity: ok ? 1 : 0.6 }}>
                <td className="muted">{x.nivel}</td>
                <td>
                  <span className="row gap-10">
                    <Icon name={iconoCategoria(x.categoria)} size="m" />
                    <span className="emph">{x.categoria}</span>
                    {x.nivel === 1 && <Tag tone="info">Obligatoria</Tag>}
                  </span>
                </td>
                <td className="num">{x.huecos}</td>
                <td className="num">{(x.huecos * (c.unidades ?? 0)).toLocaleString("es-ES")}</td>
                <td>
                  <span className="row gap-10">
                    <Tag tone={ESTADO[est].tone}>{ESTADO[est].txt}</Tag>
                    {!ok && <span className="lm-body-small muted row gap-5"><Icon name="lock" size="m" />Carga antes el nivel anterior</span>}
                    {est === "errores" && <Button variant="text" small onClick={() => setErrores(x.categoria)}>Ver errores</Button>}
                  </span>
                </td>
                <td className="actions">
                  <span className="row gap-5" style={{ justifyContent: "flex-end" }}>
                    <IconButton icon="file_download" label={`Descargar plantilla de ${x.categoria}`} disabled={!ok}
                      onClick={() => { descargarPlantilla(c, raiz, perfil, propiedades, x.categoria); snack(`Plantilla de ${x.categoria} descargada`); }} />
                    <Button variant={est === "cargada" ? "text" : "outlined"} small icon="file_upload" disabled={!ok} onClick={() => setSubiendo(x.categoria)}>
                      {est === "cargada" ? "Reemplazar" : "Subir"}
                    </Button>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {subiendo && (
        <DialogSubida categoria={subiendo} c={c} onClose={() => setSubiendo(null)}
          onResultado={(ok) => {
            const cat = subiendo;
            set({ plantillas: { ...c.plantillas, [cat]: ok ? "cargada" : "errores" }, intentosPlantilla: { ...c.intentosPlantilla, [cat]: (c.intentosPlantilla[cat] ?? 0) + 1 } });
            setSubiendo(null);
            if (ok) snack(`Plantilla de ${cat} cargada`); else setErrores(cat);
          }} />
      )}
      {errores && (
        <Dialog large title={`Errores en la plantilla de ${errores}`} onClose={() => setErrores(null)}
          message="No se ha cargado ningún dato de esta plantilla. Corrige las filas indicadas y súbela de nuevo."
          footer={<>
            <Button variant="outlined" onClick={() => setErrores(null)}>Cerrar</Button>
            <Button icon="file_upload" onClick={() => { const cat = errores; setErrores(null); setSubiendo(cat); }}>Subir de nuevo</Button>
          </>}>
          <table className="lm-table">
            <thead><tr><th>Fila</th><th>Columna</th><th>Error</th></tr></thead>
            <tbody>
              <tr><td>14</td><td>Nº de serie del activo</td><td>El nº de serie R-55210 está repetido en la fila 9</td></tr>
              <tr><td>22</td><td>Fecha de montaje</td><td>La fecha 31/02/2026 no es válida (formato dd/mm/aaaa)</td></tr>
              <tr><td>37</td><td>Nº de serie de la unidad</td><td>La unidad 1012 no existe en esta configuración</td></tr>
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

/* ---------- Paso 8 ---------- */
export function Paso8({ c, flota, est, irA, soloLectura }: { c: Configuracion; flota: Flota; est: Estructura; irA: (n: number) => void; soloLectura?: boolean }) {
  const raiz = est.raiz;
  const cats = categoriasDe(raiz);
  const pendientes = cats.filter((x) => c.plantillas[x.categoria] !== "cargada");
  const store = useStore();
  const perfil = store.perfil(c.perfilDriversId);
  const propiedades = store.perfilProps(c.perfilPropiedadesId);
  const ef = driversEfectivos(perfil, raiz);
  const nDrivers = DRIVERS.map((d) => ({
    d, n: Object.values(ef.drivers).filter((x) => x[d.id]).length, h: Object.values(ef.heredables).filter((x) => x[d.id]).length,
  }));
  const { nCat: nPropsCat, nHuecos: nHuecosProps } = propiedades ? resumenPropiedades(raiz, propiedades) : { nCat: 0, nHuecos: 0 };
  const omitido = (n: number) => c.pasosOmitidos.includes(n);
  const sms = flota.sms;

  const bloques: { n: number; titulo: string; contenido: React.ReactNode; aviso?: string }[] = [
    { n: 1, titulo: "Datos y estructura", contenido: <>{c.nombre}{c.descripcion && ` · ${c.descripcion}`}<br />{est.nombre}: {contarHuecos(raiz)} huecos por unidad</> },
    { n: 2, titulo: "Unidades", contenido: <>{c.unidades} unidades</> },
    { n: 3, titulo: "Drivers", contenido: <>{perfil ? `Perfil: ${perfil.nombre}` : "Sin perfil: kilometraje por defecto"}<br />{nDrivers.filter(({ n }) => n > 0).map(({ d, n, h }) => `${d.nombre}: ${n} categorías (${h} heredables)`).join(" · ") || "Sin drivers"}</>, aviso: omitido(3) || !perfil ? "Paso omitido: se aplican los drivers por defecto" : undefined },
    { n: 4, titulo: "Propiedades de categoría", contenido: <>{propiedades ? `Perfil: ${propiedades.nombre}` : "Sin perfil de propiedades"}<br />{nPropsCat ? `${nPropsCat} propiedades asignadas` : "Sin propiedades asignadas"}</>, aviso: omitido(4) ? "Paso omitido" : undefined },
    { n: 5, titulo: "Propiedades de hueco", contenido: nHuecosProps ? `${nHuecosProps} huecos con propiedades` : "Sin propiedades de hueco", aviso: omitido(5) ? "Paso omitido" : undefined },
    ...(flota.usaSms ? [{ n: 6, titulo: "Cálculos en SMS (de la flota)", contenido: sms ? `${sms.ambito === "flota" ? "Flota completa" : "Por línea"} · ${DRIVERS.find((d) => d.id === sms.driver)?.nombre} · ${FORMAS_CALCULO.find((f) => f.id === sms.calculo)?.nombre}` : "No se envían datos a SMS", aviso: omitido(6) ? "Paso omitido" : undefined }] : []),
    { n: 7, titulo: "Carga de datos", contenido: `${cats.length - pendientes.length} de ${cats.length} plantillas cargadas · ${unidadesTerminadas(c, raiz)}/${c.unidades} unidades terminadas`, aviso: pendientes.length ? `Pendientes: ${pendientes.map((p) => p.categoria).join(", ")}` : undefined },
  ];

  return (
    <section className="stack gap-20">
      {soloLectura ? (
        pendientes.length ? (
          <Banner type="attention" title={`${c.unidades} unidades incompletas`}>
            La estructura {est.nombre} ha cambiado y faltan los datos de: {pendientes.map((p) => p.categoria).join(", ")}. Cárgalos más abajo.
          </Banner>
        ) : (
          <Banner type="success" title="Configuración activa">Sus unidades están operativas y todos sus datos están cargados.</Banner>
        )
      ) : primerNivelCargado(c, raiz) ? (
        <Banner type="info" title="Todo listo para finalizar">
          Al finalizar, la configuración pasará a Activa y sus {c.unidades} unidades quedarán disponibles para operar.
          {pendientes.length > 0 && " Las plantillas pendientes se podrán cargar después."}
        </Banner>
      ) : (
        <Banner type="attention" title="Todavía no puedes finalizar" actions={<Button variant="outlined" small onClick={() => irA(7)}>Ir a Carga de datos</Button>}>
          Falta cargar la plantilla de primer nivel (Tren).
        </Banner>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--lm-space-20)" }}>
        {bloques.map((b) => (
          <article key={b.n} className="lm-card stack gap-10">
            <div className="row gap-10">
              <span className="lm-step__dot" style={{ background: "var(--lm-sys-primary-container)", color: "var(--lm-sys-on-primary-container)" }}>{b.n}</span>
              <span className="lm-title-small grow">{b.titulo}</span>
              {!soloLectura && <Button variant="text" small icon="edit" onClick={() => irA(b.n)}>Editar</Button>}
            </div>
            <span>{b.contenido}</span>
            {b.aviso && <span className="row gap-5 lm-body-small" style={{ color: "var(--lm-on-attention-container)" }}><Icon name="warning" size="m" />{b.aviso}</span>}
          </article>
        ))}
      </div>
      <span className="lm-body-small muted">{PASOS.length} pasos · Flota {flota.codigo} · {flota.nombre}</span>
    </section>
  );
}
