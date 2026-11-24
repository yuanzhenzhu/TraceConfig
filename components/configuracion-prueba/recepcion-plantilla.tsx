"use client";

// (Prueba, 24-11-2026) Recepción en unidad: descargar la plantilla de los huecos vacíos y subirla rellena.
// Un archivo con «error» en el nombre simula una plantilla con errores.

import { useRef, useState } from "react";
import { Banner, Button, Dialog, Icon, IconButton, Spinner, Tag } from "../ds";
import { PROPS_CATEGORIA, PROPS_HUECO } from "@/lib/model";
import { porcentaje, type HuecoPendiente } from "./recepcion";

const nombreProp = (id: string) => PROPS_CATEGORIA.find((p) => p.id === id)?.nombre ?? PROPS_HUECO.find((p) => p.id === id)?.nombre ?? id;

/** CSV (separador ;) con una fila por hueco vacío: unidad, hueco, nº de serie, km y propiedades. */
export function descargarPlantillaRecepcion(nombre: string, hs: HuecoPendiente[]) {
  const props = [...new Set(hs.flatMap((h) => [...h.propsCategoria, ...h.propsHueco]))];
  const cab = ["Unidad", "Hueco", "Categoría", "Nº de serie", "Km", ...props.map(nombreProp)];
  const csv = "﻿" + [cab, ...hs.map((h) => [h.unidad, h.hueco, h.categoria, "", "", ...props.map(() => "")])]
    .map((f) => f.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = `recepcion-${nombre}.csv`.toLowerCase().replace(/·/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
  a.click(); URL.revokeObjectURL(url);
}

export function DialogSubirRecepcion({ titulo, n, onClose, onCargada }: { titulo: string; n: number; onClose: () => void; onCargada: () => void }) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<"nada" | "validando" | "errores">("nada");
  const input = useRef<HTMLInputElement>(null);
  const subir = () => {
    setEstado("validando");
    setTimeout(() => { if (archivo!.name.toLowerCase().includes("error")) setEstado("errores"); else onCargada(); }, 1200);
  };
  return (
    <Dialog large={estado === "errores"} title={`Subir plantilla de ${titulo}`} onClose={estado === "validando" ? () => {} : onClose}
      footer={<>
        <Button variant="outlined" disabled={estado === "validando"} onClick={onClose}>Cancelar</Button>
        {estado === "errores"
          ? <Button icon="file_upload" onClick={() => { setArchivo(null); setEstado("nada"); }}>Subir otra</Button>
          : <Button disabled={!archivo || estado === "validando"} onClick={subir}>Subir y validar</Button>}
      </>}>
      {estado === "validando" ? (
        <div className="lm-center" style={{ padding: "var(--lm-space-50)" }}><Spinner label="Validando plantilla" /><span>Validando {archivo?.name}</span></div>
      ) : estado === "errores" ? (
        <div className="stack gap-15">
          <Banner type="error" title="La plantilla tiene errores">No se ha recibido ningún hueco. Corrige las filas indicadas y súbela de nuevo.</Banner>
          <table className="lm-table">
            <thead><tr><th>Fila</th><th>Columna</th><th>Error</th></tr></thead>
            <tbody>
              <tr><td>4</td><td>Km</td><td>Los km son obligatorios</td></tr>
              <tr><td>9</td><td>Nº de serie</td><td>Ya existe un activo con este nº de serie</td></tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="stack gap-10">
          <span className="muted">{n} {n === 1 ? "hueco vacío" : "huecos vacíos"}. Al subirla, todos quedan recibidos.</span>
          <div className="stack gap-10 lm-center" style={{ padding: "var(--lm-space-40)", border: "1px dashed var(--lm-sys-outline)", borderRadius: "var(--lm-corner-30)" }}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) setArchivo(e.dataTransfer.files[0]); }}>
            <Icon name="file_upload" size="xl" />
            {archivo
              ? <span className="row gap-10"><Icon name="attach_file" /><strong>{archivo.name}</strong><IconButton compact icon="close" label="Quitar archivo" onClick={() => setArchivo(null)} /></span>
              : <span>Arrastra aquí el archivo o</span>}
            <Button variant="outlined" small onClick={() => input.current?.click()}>Seleccionar archivo</Button>
            <span className="lm-body-small">Formatos admitidos: .xlsx, .csv · Prototipo: un archivo con «error» en el nombre simula errores</span>
            <input ref={input} type="file" accept=".xlsx,.csv" hidden onChange={(e) => setArchivo(e.target.files?.[0] ?? null)} />
          </div>
        </div>
      )}
    </Dialog>
  );
}

/** % de rellenado: verde al 100 %, amarillo si falta algo */
export function Rellenado({ total, vacios }: { total: number; vacios: number }) {
  const p = porcentaje(total, vacios);
  return <Tag tone={p === 100 ? "success" : "attention"}>{p} %</Tag>;
}
