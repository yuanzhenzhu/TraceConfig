"use client";

// Vista y editor de estructuras (HU-05, HU-07, HU-08, HU-09).

import { useMemo, useState, type DragEvent, type ReactNode } from "react";
import { Banner, Icon, IconButton, Menu, SearchInput, Tag, useSnackbar } from "./ds";
import {
  CATEGORIAS, buscar, clonar, contarHuecos, insertarHijo, nodo, nombreSiguiente, quitar, recorrer,
  type Nodo,
} from "@/lib/model";

const ICONO: Record<string, string> = {
  Tren: "train", Coche: "crop_16_9", "Motor Coche": "settings", Puerta: "crop_portrait", "Motor Puerta": "settings",
  "Tarjeta Electrónica": "speaker_phone", Bogie: "hexagon", "Motor Bogie": "settings", Eje: "remove", Rueda: "circle",
};
export const iconoCategoria = (c: string) => ICONO[c] ?? "pentagon";

/* ---------- Fila de árbol genérica ---------- */
export function ArbolFilas({
  raiz, render, abiertosIni = 2, filtro,
}: {
  raiz: Nodo;
  render: (n: Nodo, nivel: number) => ReactNode; // contenido a la derecha del nombre
  abiertosIni?: number;
  filtro?: (n: Nodo) => boolean;
}) {
  const [cerrados, setCerrados] = useState<Record<string, boolean>>(() => {
    const c: Record<string, boolean> = {};
    recorrer(raiz, (n, nivel) => { if (nivel >= abiertosIni) c[n.id] = true; });
    return c;
  });
  const filas: { n: Nodo; nivel: number }[] = [];
  const ir = (n: Nodo, nivel: number) => {
    if (!filtro || filtro(n)) filas.push({ n, nivel });
    if (!cerrados[n.id]) n.hijos.forEach((h) => ir(h, nivel + 1));
  };
  ir(raiz, 1);
  return (
    <div role="tree" className="stack">
      {filas.map(({ n, nivel }) => (
        <div key={n.id} role="treeitem" aria-level={nivel} aria-expanded={n.hijos.length ? !cerrados[n.id] : undefined}
          className="row gap-10" style={{ minHeight: "var(--lm-space-50)", paddingLeft: `calc(${nivel - 1} * var(--lm-space-30))`, borderBottom: "1px solid var(--lm-sys-outline-variant)" }}>
          {n.hijos.length ? (
            <IconButton compact icon={cerrados[n.id] ? "chevron_right" : "expand_more"} label={`${cerrados[n.id] ? "Desplegar" : "Plegar"} ${n.nombre}`}
              onClick={() => setCerrados((c) => ({ ...c, [n.id]: !c[n.id] }))} />
          ) : <span style={{ width: "var(--lm-space-40)" }} />}
          {render(n, nivel)}
        </div>
      ))}
    </div>
  );
}

function Etiqueta({ n }: { n: Nodo }) {
  return (
    <span className="row gap-10 grow">
      <Icon name={iconoCategoria(n.categoria)} size="m" />
      <span className={n.hijos.length ? "lm-body-medium-emphasized" : ""} style={{ fontWeight: n.hijos.length ? 500 : 400 }}>{n.nombre}</span>
      {n.nombre !== n.categoria && !n.nombre.startsWith(n.categoria + " ") && <Tag tone="neutral">{n.categoria}</Tag>}
      {n.hijos.length > 0 && <span className="lm-body-small muted">{contarHuecos(n) - 1} huecos dentro</span>}
    </span>
  );
}

/* ---------- Vista de solo lectura ---------- */
export function ArbolVista({ raiz }: { raiz: Nodo }) {
  return <ArbolFilas raiz={raiz} render={(n) => <Etiqueta n={n} />} />;
}

/* ---------- Editor ---------- */
export function EditorEstructura({
  raiz, onChange, soloExtremos,
}: { raiz: Nodo; onChange: (r: Nodo) => void; soloExtremos?: boolean }) {
  const snack = useSnackbar();
  const [sel, setSel] = useState<string>(raiz.id);
  const [busca, setBusca] = useState("");
  const [portapapeles, setPortapapeles] = useState<Nodo | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);
  const seleccionado = buscar(raiz, sel) ?? raiz;
  const categorias = useMemo(() => CATEGORIAS.filter((c) => c !== "Tren" && c.toLowerCase().includes(busca.toLowerCase())), [busca]);

  const anadir = (padreId: string, categoria: string) => {
    const padre = buscar(raiz, padreId);
    if (!padre) return;
    const nuevo = nodo(categoria, nombreSiguiente(padre, categoria));
    onChange(insertarHijo(raiz, padreId, nuevo));
    snack(`${nuevo.nombre} añadido en ${padre.nombre}`);
  };
  const pegar = (padreId: string) => {
    if (!portapapeles) return;
    const padre = buscar(raiz, padreId)!;
    const copia = clonar(portapapeles);
    copia.nombre = nombreSiguiente(padre, copia.categoria);
    onChange(insertarHijo(raiz, padreId, copia));
    snack(`${copia.nombre} pegado en ${padre.nombre}`);
  };
  const eliminar = (n: Nodo) => {
    if (soloExtremos && n.hijos.length) { snack("Solo se pueden eliminar extremos: primero elimina sus hijos"); return; }
    onChange(quitar(raiz, n.id));
    if (sel === n.id) setSel(raiz.id);
    snack(`${n.nombre} eliminado`);
  };
  const mover = (id: string, destino: string) => {
    if (id === destino) return;
    const n = buscar(raiz, id);
    if (!n || buscar(n, destino)) { snack("No se puede mover un elemento dentro de sí mismo"); return; }
    const destinoN = buscar(quitar(raiz, id), destino)!;
    const movido = { ...n, nombre: nombreSiguiente(destinoN, n.categoria) };
    onChange(insertarHijo(quitar(raiz, id), destino, movido));
  };

  const onDrop = (e: DragEvent, destino: string) => {
    e.preventDefault(); setSobre(null);
    const cat = e.dataTransfer.getData("lm/categoria");
    const id = e.dataTransfer.getData("lm/nodo");
    if (cat) anadir(destino, cat);
    else if (id && !soloExtremos) mover(id, destino);
  };

  return (
    <div className="stack gap-15">
      {soloExtremos ? (
        <Banner type="attention" title="Solo se puede modificar por los extremos">
          La estructura ya está en uso. Puedes añadir elementos nuevos y eliminar extremos, pero no mover ni eliminar niveles intermedios.
        </Banner>
      ) : (
        <Banner type="info">
          Arrastra categorías al árbol o selecciona un elemento y pulsa una categoría. Cuando guardes las unidades, la estructura solo podrá modificarse por los extremos.
        </Banner>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "var(--lm-space-20)", alignItems: "start" }}>
        <aside className="lm-card stack gap-10" aria-label="Lista de categorías">
          <span className="lm-title-small">Categorías</span>
          <SearchInput label="Buscar categoría" placeholder="Buscar categoría" value={busca} onChange={setBusca} />
          <span className="lm-body-small muted">Se añadirán dentro de: <strong>{seleccionado.nombre}</strong></span>
          <div className="stack" style={{ maxHeight: 420, overflow: "auto" }}>
            {categorias.map((c) => (
              <button key={c} draggable onDragStart={(e) => e.dataTransfer.setData("lm/categoria", c)}
                onClick={() => anadir(seleccionado.id, c)}
                className="lm-palette-item row gap-10"
                title={`Añadir ${c} en ${seleccionado.nombre}`}>
                <Icon name={iconoCategoria(c)} size="m" />
                <span className="grow">{c}</span>
                <Icon name="add" size="m" />
              </button>
            ))}
            {categorias.length === 0 && <span className="lm-body-small muted">No hay categorías con ese nombre</span>}
          </div>
        </aside>

        <section className="lm-card" aria-label="Árbol de la estructura">
          <div className="row gap-10" style={{ marginBottom: "var(--lm-space-10)" }}>
            <span className="lm-title-small grow">Estructura · {contarHuecos(raiz)} huecos</span>
            {portapapeles && <Tag tone="info" icon="content_copy">Copiado: {portapapeles.nombre}</Tag>}
          </div>
          <ArbolFilas raiz={raiz} abiertosIni={3} render={(n) => {
            const esRaiz = n.id === raiz.id;
            const activo = sel === n.id;
            return (
              <div
                className="row gap-10 grow"
                draggable={!esRaiz && !soloExtremos}
                onDragStart={(e) => e.dataTransfer.setData("lm/nodo", n.id)}
                onDragOver={(e) => { e.preventDefault(); setSobre(n.id); }}
                onDragLeave={() => setSobre((s) => (s === n.id ? null : s))}
                onDrop={(e) => onDrop(e, n.id)}
                onClick={() => setSel(n.id)}
                style={{
                  cursor: "pointer", borderRadius: "var(--lm-corner-20)", padding: "0 var(--lm-space-10)", minHeight: "var(--lm-space-50)",
                  background: sobre === n.id ? "var(--lm-sys-secondary-container)" : activo ? "color-mix(in srgb, var(--lm-sys-primary) 10%, transparent)" : undefined,
                  outline: sobre === n.id ? "2px dashed var(--lm-sys-primary)" : undefined,
                }}
                aria-selected={activo}
              >
                <Etiqueta n={n} />
                <Menu label={`Acciones de ${n.nombre}`} items={[
                  { label: "Copiar", icon: "content_copy", onSelect: () => { setPortapapeles(n); snack(`${n.nombre} copiado`); }, disabled: esRaiz },
                  { label: portapapeles ? `Pegar ${portapapeles.nombre} dentro` : "Pegar dentro", icon: "add", onSelect: () => pegar(n.id), disabled: !portapapeles },
                  "divider",
                  { label: "Eliminar", icon: "delete", danger: true, onSelect: () => eliminar(n), disabled: esRaiz || (soloExtremos && n.hijos.length > 0) },
                ]} />
              </div>
            );
          }} />
          {raiz.hijos.length === 0 && (
            <div className="lm-center" style={{ padding: "var(--lm-space-50)" }}>
              <Icon name="placeholder" size="xl" />
              <span>Arrastra aquí la primera categoría, por ejemplo <strong>Coche</strong></span>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function ResumenArbol({ raiz, max }: { raiz: Nodo; max?: number }) {
  const c: Record<string, number> = {};
  recorrer(raiz, (n) => { c[n.categoria] = (c[n.categoria] ?? 0) + 1; });
  const todas = Object.entries(c).filter(([k]) => k !== raiz.categoria);
  const vis = max ? todas.slice(0, max) : todas;
  return (
    <span className="row gap-5 wrap">
      {vis.map(([k, v]) => <Tag key={k} tone="neutral" num={v}>{k}</Tag>)}
      {max && todas.length > max && <span className="lm-body-small muted">+{todas.length - max} más</span>}
    </span>
  );
}
