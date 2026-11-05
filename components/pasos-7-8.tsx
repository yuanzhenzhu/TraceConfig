"use client";

// Pasos 7 (Carga de datos mediante plantillas) y 8 (Resumen y finalizar).

import { useRef, useState } from "react";
import { Banner, Button, Dialog, Icon, IconButton, Spinner, Tag, useSnackbar } from "./ds";
import { iconoCategoria } from "./arbol";
import {
  DRIVERS, PASOS, PROPS_CATEGORIA, categoriasDe, contarHuecos, driversEfectivos, primerNivelCargado, recorrer,
  unidadesTerminadas, type Configuracion, type EstadoPlantilla, type Estructura, type Flota, type Nodo, type DriversConfig, type PropsCategoria,
} from "@/lib/model";
import { useStore } from "@/lib/store";
import { resumenPropiedades } from "./propiedades";
import { textoSms } from "./sms";
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
  a.href = url; a.download = `plantilla-${c.nombre || "configuracion"}-${categoria}.csv`.toLowerCase().replace(/\s+/g, "-");
  a.click(); URL.revokeObjectURL(url);
}

export function Paso7({ c, set, est, soloLectura: consulta, anadir }: PasoProps) {
  const soloLectura = consulta && !anadir; // al añadir unidades sí se suben plantillas
  const snack = useSnackbar();
  const store = useStore();
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
        {anadir
          ? `Descarga la plantilla de unidades (${raiz.categoria}) con las ${c.unidades} unidades, rellena los datos de las nuevas y súbela. Si ya tienes los datos de sus activos, puedes subir también el resto de plantillas.`
          : soloLectura
          ? "Estado de las plantillas de cada categoría. Puedes descargar las plantillas, pero no subirlas."
          : "Descarga la plantilla de cada categoría, rellénala y súbela. Los niveles se habilitan a medida que cargas los anteriores. Puedes cargarlas poco a poco y salir cuando quieras."}
      </p>
      {anadir ? (primerNivelCargado(c, raiz) ? (
        <Banner type="success" title="Plantilla de unidades cargada">Ya puedes guardar: ve al resumen y pulsa Añadir unidades.</Banner>
      ) : (
        <Banner type="attention" title={`Carga de nuevo la plantilla de unidades (${raiz.categoria})`}>
          Es obligatoria para añadir las unidades. Si no la cargas y sales, no se guarda ningún cambio.
        </Banner>
      )) : c.estado === "activa" ? null : !primerNivelCargado(c, raiz) ? (
        <Banner type="attention" title="Carga primero la plantilla de unidades (Tren)">
          Es la única obligatoria para finalizar.
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
                <td className="num">
                  {anadir && (c.unidades ?? 0) > anadir.antes ? (
                    // Añadir unidades: registros que ya había + los de las unidades nuevas (rojo si la plantilla es obligatoria)
                    <span className="row gap-5" style={{ justifyContent: "flex-end" }}>
                      {(x.huecos * anadir.antes).toLocaleString("es-ES")}
                      <strong style={{ color: x.nivel === 1 ? "var(--lm-sys-error)" : "var(--lm-on-warning-container)" }}
                        aria-label={`${x.huecos * ((c.unidades ?? 0) - anadir.antes)} registros nuevos, ${x.nivel === 1 ? "obligatorios" : "opcionales"}`}>
                        + {(x.huecos * ((c.unidades ?? 0) - anadir.antes)).toLocaleString("es-ES")}
                      </strong>
                    </span>
                  ) : (x.huecos * (c.unidades ?? 0)).toLocaleString("es-ES")}
                </td>
                <td>
                  <span className="row gap-10">
                    <Tag tone={ESTADO[est].tone}>{ESTADO[est].txt}</Tag>
                    {!ok && !soloLectura && <span className="lm-body-small muted row gap-5"><Icon name="lock" size="m" />Carga antes el nivel anterior</span>}
                    {est === "errores" && !soloLectura && <Button variant="text" small onClick={() => setErrores(x.categoria)}>Ver errores</Button>}
                  </span>
                </td>
                <td className="actions">
                  <span className="row gap-5" style={{ justifyContent: "flex-end" }}>
                    <IconButton icon="file_download" label={`Descargar plantilla de ${x.categoria}`} disabled={!ok}
                      onClick={() => { descargarPlantilla(c, raiz, c.drivers, store.propsCategoria, x.categoria); snack(`Plantilla de ${x.categoria} descargada`); }} />
                    {!soloLectura && (
                      <Button variant={est === "cargada" ? "text" : "outlined"} small icon="file_upload" disabled={!ok} onClick={() => setSubiendo(x.categoria)}>
                        {est === "cargada" ? "Reemplazar" : "Subir"}
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
        <span className="row gap-20 lm-body-small muted">
          <span>Registros: actuales <strong>+ nuevos</strong> por las {(c.unidades ?? 0) - anadir.antes} unidades añadidas</span>
          <span className="row gap-5"><strong style={{ color: "var(--lm-sys-error)" }}>+ N</strong> obligatorio</span>
          <span className="row gap-5"><strong style={{ color: "var(--lm-on-warning-container)" }}>+ N</strong> opcional</span>
        </span>
      )}

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
              <tr><td>22</td><td>Km</td><td>El km es obligatorio</td></tr>
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
  const smsOk = (c.sms ?? []).some((x) => x.driver && x.forma);
  const catsConProps = cats.filter((x) => (store.propsCategoria[x.categoria] ?? []).length > 0).length;

  const bloques: { n: number; titulo: string; contenido: React.ReactNode; aviso?: string }[] = [
    { n: 1, titulo: "Estructura y unidades", contenido: <>
      <strong>{c.nombre}</strong>{c.descripcion && ` · ${c.descripcion}`}<br />
      {est.nombre}{est.descripcion && ` · ${est.descripcion}`}<br />
      {c.unidades} unidades<br />
      {nHuecosProps ? "Con propiedades de hueco asignadas" : "Sin propiedades de hueco asignadas"}
    </> },
    { n: 2, titulo: "Valores de propiedades de hueco", contenido: nHuecosProps
      ? `${huecosConValor(raiz, est.propsHueco ?? {}, c.valoresHueco ?? {})} de ${nHuecosProps} huecos con valores`
      : "No hay propiedades de hueco en esta configuración" },
    { n: 3, titulo: "Drivers", contenido: <>
      {conDrivers.length ? `Tiene ${lista(conDrivers)}` : "Sin drivers"}
      {flota.usaSms && <><br />{smsOk ? "Con cálculo en SMS configurado" : "Sin cálculo en SMS"}</>}
    </> },
    { n: 4, titulo: "Propiedades de categoría", contenido: <>Comunes a todas las flotas<br />{catsConProps} {catsConProps === 1 ? "categoría" : "categorías"} con propiedades</> },
    { n: 7, titulo: "Carga de datos", contenido: `${cats.length - pendientes.length} de ${cats.length} plantillas cargadas` },
  ];

  return (
    <section className="stack gap-20">
      {anadir ? (
        (c.unidades ?? 0) <= anadir.antes ? (
          <Banner type="attention" title="Todavía no has añadido unidades" actions={<Button variant="outlined" small onClick={() => irA(1)}>Ir a Estructura y unidades</Button>}>
            Indica un número de unidades mayor que las {anadir.antes} actuales.
          </Banner>
        ) : !primerNivelCargado(c, est.raiz) ? (
          <Banner type="attention" title="Falta cargar la plantilla de unidades" actions={<Button variant="outlined" small onClick={() => irA(7)}>Ir a Carga de datos</Button>}>
            Es obligatoria para añadir las {(c.unidades ?? 0) - anadir.antes} unidades nuevas.
          </Banner>
        ) : (
          <Banner type="info" title={`Todo listo para añadir ${(c.unidades ?? 0) - anadir.antes} unidades`}>
            La configuración pasará de {anadir.antes} a {c.unidades} unidades.{pendientes.length > 0 && ` Las unidades nuevas quedarán incompletas hasta cargar: ${pendientes.map((p) => p.categoria).join(", ")}.`}
          </Banner>
        )
      ) : soloLectura ? (
        pendientes.length ? (
          <Banner type="attention" title={`${c.unidades} unidades incompletas`}>
            La estructura {est.nombre} ha cambiado y faltan los datos de: {pendientes.map((p) => p.categoria).join(", ")}. 
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
        {bloques.map((b, i) => (
          <article key={b.titulo} className="lm-card stack gap-10">
            <div className="row gap-10">
              <span className="lm-step__dot" style={{ background: "var(--lm-sys-primary-container)", color: "var(--lm-sys-on-primary-container)" }}>{i + 1}</span>
              <span className="lm-title-small grow">{b.titulo}</span>
              {!soloLectura && <Button variant="text" small icon="edit" onClick={() => irA(b.n)}>Editar</Button>}
            </div>
            <span>{b.contenido}</span>
            {b.aviso && <span className="row gap-5 lm-body-small" style={{ color: "var(--lm-on-attention-container)" }}><Icon name="warning" size="m" />{b.aviso}</span>}
          </article>
        ))}
      </div>
      <span className="lm-body-small muted">{PASOS.length} pasos · Flota {flota.nombre}</span>
    </section>
  );
}
