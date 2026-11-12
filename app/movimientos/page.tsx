"use client";

// HU-M01 · Historial de movimientos: pantalla de inicio del módulo. Filtros, tabla, movimientos seguidos agrupados,
// detalle (Antes | Después) y deshacer (HU-M02). Los movimientos se empiezan desde el menú lateral.

import { useEffect, useMemo, useState } from "react";
import { Banner, Breadcrumb, Button, EmptyState, FieldOutlined, Icon, IconButton, Loading, Menu, Tag } from "@/components/ds";
import { CeldaParticipante, DialogAnular, DialogDetalle, participantes, type Participante } from "@/components/movimientos/detalle";
import { textoFecha, useMovimientos, type Movimiento } from "@/lib/movimientos";
import { useStore } from "@/lib/store";

type Demo = "normal" | "cargando" | "vacio" | "error";
const POR_PAGINA = [10, 25, 50];
// Estado: por defecto solo los registrados (los deshechos se ven eligiéndolos)
const VACIO = { estado: "registrado", fecha: "", categoria: "", tipo: "", busca: "" };
const VACIO_UNIDAD = { flota: "", unidad: "" };

export default function HistorialMovimientos() {
  const store = useStore();
  const mov = useMovimientos();
  const [demo, setDemo] = useState<Demo>("normal");
  const [f, setF] = useState(VACIO);
  // Flota y unidad se eligen y se aplican con el botón Aplicar
  const [borrador, setBorrador] = useState(VACIO_UNIDAD);
  const [aplicado, setAplicado] = useState(VACIO_UNIDAD);
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  // Activos montados de cada movimiento: plegados por defecto para que la tabla quede limpia
  const [hijosAbiertos, setHijosAbiertos] = useState<Record<string, boolean>>({});
  const [detalle, setDetalle] = useState<string | null>(null);
  const [anular, setAnular] = useState<string | null>(null);
  const [pagina, setPagina] = useState(0);
  const [porPagina, setPorPagina] = useState(10);
  const cambiar = (k: keyof typeof VACIO, v: string) => { setF((x) => ({ ...x, [k]: v })); setPagina(0); };

  const unidadesFlota = mov.unidades.filter((u) => !borrador.flota || u.flotaId === borrador.flota);
  const tipos = [...new Set(mov.movimientos.map((m) => m.tipo))].sort();
  const categorias = [...new Set(mov.movimientos.flatMap((m) => m.filas.map((x) => x.categoria)))].sort();
  const lista = useMemo(() => {
    const s = f.busca.trim().toLowerCase();
    // Unidades del movimiento: las de sus registros de km y las de los huecos de antes y después
    const unidadesDe = (m: Movimiento) => [...m.registros.map((r) => r.unidad), ...m.filas.flatMap((x) => [x.antes, x.despues]).filter((l) => l.tipo === "unidad").map((l) => (l as { unidad: string }).unidad)];
    return mov.movimientos
      .filter((m) => !aplicado.flota || unidadesDe(m).some((u) => mov.unidades.find((x) => x.serie === u)?.flotaId === aplicado.flota))
      .filter((m) => !aplicado.unidad || unidadesDe(m).includes(aplicado.unidad))
      .filter((m) => !f.estado || m.estado === f.estado)
      .filter((m) => !f.fecha || m.fecha.slice(0, 10) === f.fecha)
      .filter((m) => !f.categoria || m.filas.some((x) => x.categoria === f.categoria))
      .filter((m) => !f.tipo || m.tipo === f.tipo)
      .filter((m) => !s || m.principal?.serie.toLowerCase().includes(s) || m.filas.some((x) => x.serie.toLowerCase().includes(s) || x.categoria.toLowerCase().includes(s)) || unidadesDe(m).some((u) => u.includes(s)))
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
  }, [mov.movimientos, mov.unidades, f, aplicado]);

  // Movimientos seguidos: una fila de grupo por cada grupo con más de un movimiento
  type Fila = { tipo: "mov"; m: Movimiento; enGrupo?: boolean } | { tipo: "grupo"; id: string; ms: Movimiento[] };
  const filas: Fila[] = useMemo(() => {
    const out: Fila[] = [];
    const vistos = new Set<string>();
    lista.forEach((m) => {
      const grupo = m.grupo ? lista.filter((x) => x.grupo === m.grupo) : [];
      if (grupo.length > 1) {
        if (vistos.has(m.grupo!)) return;
        vistos.add(m.grupo!);
        out.push({ tipo: "grupo", id: m.grupo!, ms: grupo });
        if (abiertos[m.grupo!]) grupo.forEach((x) => out.push({ tipo: "mov", m: x, enGrupo: true }));
      } else out.push({ tipo: "mov", m });
    });
    return out;
  }, [lista, abiertos]);

  const paginas = Math.max(1, Math.ceil(filas.length / porPagina));
  useEffect(() => { if (pagina >= paginas) setPagina(0); }, [pagina, paginas]);
  const visibles = filas.slice(pagina * porPagina, (pagina + 1) * porPagina);
  const hayFiltros = (Object.keys(VACIO) as (keyof typeof VACIO)[]).some((k) => f[k] !== VACIO[k]) || Object.values(aplicado).some(Boolean);
  const restablecer = () => { setF(VACIO); setBorrador(VACIO_UNIDAD); setAplicado(VACIO_UNIDAD); setPagina(0); };

  const exportar = () => {
    const cab = ["Fecha", "Tipo", "Participante 1", "Participante 2", "Deshecho"];
    const txt = (p?: Participante) => (p ? [`${p.categoria} ${p.serie}`, ...p.hijos.map((h) => `${h.pos}${h.cambio ? ` → ${h.cambio}` : ""} ${h.serie}`)].join(" / ") : "");
    const datos = lista.map((m) => { const p = participantes(m); return [textoFecha(m.fecha), m.tipo, txt(p[0]), txt(p[1]), m.estado === "anulado" ? "Sí" : ""]; });
    const csv = "﻿" + [cab, ...datos].map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "historial-de-movimientos.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const cargando = !mov.listo || demo === "cargando";
  const vacio = demo === "vacio" || (mov.listo && mov.movimientos.length === 0);

  const filaMov = (m: Movimiento, enGrupo?: boolean) => {
    const anulado = m.estado === "anulado";
    const tachado = anulado ? { textDecoration: "line-through", color: "var(--lm-sys-on-surface-variant)" } : undefined;
    return (
      <tr key={m.id} className={enGrupo ? "is-child" : undefined} style={{ cursor: "pointer", verticalAlign: "top" }} onClick={() => setDetalle(m.id)} title="Ver el detalle">
        <td style={{ ...tachado, verticalAlign: "top", paddingTop: "var(--lm-space-10)", whiteSpace: "nowrap" }}>{enGrupo && <Icon name="link" size="m" />} {textoFecha(m.fecha)}</td>
        <td style={{ ...tachado, verticalAlign: "top", paddingTop: "var(--lm-space-10)" }}>{m.tipo}{anulado && <div><Tag tone="neutral">Deshecho</Tag></div>}</td>
        {[0, 1].map((i) => <td key={i} style={{ verticalAlign: "top" }}>
          <CeldaParticipante p={participantes(m)[i]} tachado={anulado} abierto={hijosAbiertos[m.id]}
            onToggle={() => setHijosAbiertos((a) => ({ ...a, [m.id]: !a[m.id] }))} />
        </td>)}
        <td className="actions" onClick={(e) => e.stopPropagation()}>
          <Menu label={`Acciones de ${m.id}`} items={[
            { label: "Ver detalle", icon: "visibility", onSelect: () => setDetalle(m.id) },
            { label: "Deshacer", icon: "restart_alt", disabled: anulado, onSelect: () => setAnular(m.id) },
          ]} />
        </td>
      </tr>
    );
  };

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Movimientos" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Historial de movimientos</h1>
          <span className="lm-body-medium muted">Para registrar un movimiento, elige su tipo en el menú lateral.</span>
        </div>
      </div>

      {/* Filtros en dos barras: flota y unidad (con Aplicar) y el resto, con Descargar CSV */}
      <section className="lm-surface" aria-label="Filtro por flota y unidad" style={{ marginBottom: "var(--lm-space-15)" }}>
        <div className="lm-filter-bar">
          <FieldOutlined label="Flota" htmlFor="f-flota" width={280}>
            <select id="f-flota" className="lm-select lm-select--dense" value={borrador.flota} onChange={(e) => setBorrador({ flota: e.target.value, unidad: "" })}>
              <option value="">Todas</option>
              {store.flotas.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
            </select>
          </FieldOutlined>
          <FieldOutlined label="Unidad" htmlFor="f-unidad" width={280}>
            <select id="f-unidad" className="lm-select lm-select--dense" value={borrador.unidad} onChange={(e) => setBorrador((x) => ({ ...x, unidad: e.target.value }))}>
              <option value="">Todas</option>
              {unidadesFlota.map((u) => <option key={u.serie} value={u.serie}>{u.serie}</option>)}
            </select>
          </FieldOutlined>
          <Button variant="tonal" disabled={borrador.flota === aplicado.flota && borrador.unidad === aplicado.unidad} onClick={() => { setAplicado(borrador); setPagina(0); }}>Aplicar</Button>
        </div>
      </section>
      <section className="lm-surface" aria-label="Filtros del historial" style={{ marginBottom: "var(--lm-space-15)" }}>
        <div className="lm-filter-bar">
          <FieldOutlined label="Estado" htmlFor="f-estado" width={150}>
            <select id="f-estado" className="lm-select lm-select--dense" value={f.estado} onChange={(e) => cambiar("estado", e.target.value)}>
              <option value="registrado">Registrados</option>
              <option value="anulado">Deshechos</option>
              <option value="">Todos</option>
            </select>
          </FieldOutlined>
          <FieldOutlined label="Fecha" htmlFor="f-fecha" grow>
            <input id="f-fecha" type="date" className="lm-input lm-input--dense" value={f.fecha} onChange={(e) => cambiar("fecha", e.target.value)} />
          </FieldOutlined>
          <FieldOutlined label="Categoría" htmlFor="f-categoria" grow>
            <select id="f-categoria" className="lm-select lm-select--dense" value={f.categoria} onChange={(e) => cambiar("categoria", e.target.value)}>
              <option value="">Seleccionar</option>
              {categorias.map((x) => <option key={x}>{x}</option>)}
            </select>
          </FieldOutlined>
          <FieldOutlined label="Tipo de movimiento" htmlFor="f-tipo" grow>
            <select id="f-tipo" className="lm-select lm-select--dense" value={f.tipo} onChange={(e) => cambiar("tipo", e.target.value)}>
              <option value="">Seleccionar</option>
              {tipos.map((x) => <option key={x}>{x}</option>)}
            </select>
          </FieldOutlined>
          <FieldOutlined htmlFor="f-busca" grow>
            <input id="f-busca" className="lm-input lm-input--dense" aria-label="Buscar" placeholder="Buscar nº de serie, activo, unidad..." value={f.busca} onChange={(e) => cambiar("busca", e.target.value)} />
          </FieldOutlined>
          <Button icon="file_download" style={{ flexShrink: 0 }} disabled={cargando || vacio || demo === "error" || !lista.length} onClick={exportar}>Descargar CSV</Button>
          {hayFiltros && <Button variant="text" icon="restart_alt" onClick={restablecer}>Restablecer</Button>}
        </div>
      </section>

      <section className="lm-surface lm-surface--p16">
        {demo === "error" ? (
          <Banner type="error" title="No se ha podido cargar el historial" actions={<Button variant="text" onClick={() => setDemo("normal")}>Reintentar</Button>}>
            Comprueba la conexión e inténtalo de nuevo.
          </Banner>
        ) : cargando ? <Loading text="Cargando movimientos" /> : vacio ? (
          <EmptyState icon="swap_vert" title="Todavía no hay movimientos" text="Elige un tipo de movimiento en el menú lateral para registrar el primero" />
        ) : (
          <>
            {!lista.length ? (
              <EmptyState icon="search_off" title="No hay resultados" text="Ningún movimiento cumple los filtros"
                action={<Button variant="outlined" onClick={restablecer}>Restablecer filtros</Button>} />
            ) : (
              <>
                <table className="lm-table">
                  <thead>
                    <tr><th>Fecha</th><th>Tipo</th><th>Participante 1</th><th>Participante 2</th><th className="actions"><span className="sr-only">Acciones</span></th></tr>
                  </thead>
                  <tbody>
                    {visibles.map((x) => x.tipo === "mov" ? filaMov(x.m, x.enGrupo) : (
                      <tr key={x.id} style={{ cursor: "pointer" }} onClick={() => setAbiertos((a) => ({ ...a, [x.id]: !a[x.id] }))}>
                        <td style={{ verticalAlign: "top", whiteSpace: "nowrap" }}>
                          <span className="row gap-5">
                            <IconButton compact icon={abiertos[x.id] ? "expand_less" : "expand_more"} label={`${abiertos[x.id] ? "Plegar" : "Desplegar"} movimientos seguidos`} />
                            {textoFecha(x.ms[0].fecha)}
                          </span>
                        </td>
                        <td style={{ verticalAlign: "top", paddingTop: "var(--lm-space-10)" }}>{x.ms[0].tipo}<div className="row gap-5 lm-body-small muted"><Icon name="link" size="m" /> {x.ms.length} movimientos seguidos</div></td>
                        <td style={{ verticalAlign: "top" }}><div className="stack" style={{ padding: "var(--lm-space-10) 0" }}>{x.ms.map((m) => { const p = participantes(m)[0]; return p ? <span key={m.id} style={{ fontWeight: 500 }}>{p.categoria} {p.serie}</span> : null; })}</div></td>
                        <td />
                        <td />
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="lm-paginator">
                  <span className="row gap-10">
                    <label htmlFor="mov-pp">Elementos por página</label>
                    <select id="mov-pp" className="lm-select lm-select--dense" value={porPagina} onChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(0); }}>
                      {POR_PAGINA.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </span>
                  <span>{pagina * porPagina + 1} - {Math.min(filas.length, (pagina + 1) * porPagina)} de {filas.length}</span>
                  <span className="row">
                    <IconButton icon="first_page" label="Primera página" disabled={pagina === 0} onClick={() => setPagina(0)} />
                    <IconButton icon="chevron_left" label="Página anterior" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)} />
                    <IconButton icon="chevron_right" label="Página siguiente" disabled={pagina >= paginas - 1} onClick={() => setPagina((p) => p + 1)} />
                    <IconButton icon="last_page" label="Última página" disabled={pagina >= paginas - 1} onClick={() => setPagina(paginas - 1)} />
                  </span>
                </div>
              </>
            )}
          </>
        )}
      </section>

      <footer className="row gap-10 wrap" style={{ marginTop: "var(--lm-space-40)", color: "var(--lm-sys-on-surface-variant)" }}>
        <span className="lm-label-medium">PROTOTIPO · Ver estado:</span>
        {(["normal", "cargando", "vacio", "error"] as Demo[]).map((d) => (
          <button key={d} className="lm-chip" aria-pressed={demo === d} onClick={() => setDemo(d)}>
            {{ normal: "Con datos", cargando: "Cargando", vacio: "Vacío", error: "Error" }[d]}
          </button>
        ))}
        <span className="grow" />
        <Button variant="text" icon="restart_alt" onClick={() => mov.restablecer()}>Restablecer datos de ejemplo</Button>
      </footer>

      {detalle && <DialogDetalle id={detalle} onClose={() => setDetalle(null)} onVer={setDetalle} onAnular={(id) => { setDetalle(null); setAnular(id); }} />}
      {anular && <DialogAnular id={anular} onClose={() => setAnular(null)} onVer={(id) => { setAnular(null); setDetalle(id); }} />}
    </main>
  );
}
