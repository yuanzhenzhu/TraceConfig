"use client";

// (Prueba, 18-11-2026) Asignación de línea: en qué línea circula cada unidad (tren) de las flotas del cliente.
// Se asigna a una unidad o a un grupo: se marcan varias (o todas las filtradas, por ejemplo un grupo de trenes
// entero) y se elige la línea nueva con su fecha y hora. No se pide km. Cada unidad guarda su historial.
// Las líneas vienen del Excel; la línea inicial de cada unidad es ficticia.

import { useMemo, useState } from "react";
import { Banner, Breadcrumb, Button, Dialog, EmptyState, Field, IconButton, Loading, Menu, Tag, useSnackbar } from "@/components/ds";
import { unidadesDe } from "@/lib/activos";
import { LINEAS } from "@/lib/model";
import { useStore } from "@/lib/store";
import { fechaHora, nombreLinea, useAsignacionLinea, type Asignacion } from "@/components/configuracion-prueba/lineas";

const POR_PAGINA = 25;
type Fila = { clave: string; serie: string; flotaId: string; flota: string; configId: string; estructura: string; hist: Asignacion[] };

export default function AsignacionLineaPage() {
  const store = useStore();
  const snack = useSnackbar();
  const { historial, asignar, restablecer } = useAsignacionLinea();
  const [fFlota, setFFlota] = useState("");
  const [fLinea, setFLinea] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pagina, setPagina] = useState(0);
  const [asignando, setAsignando] = useState<Fila[] | null>(null);
  const [verHist, setVerHist] = useState<Fila | null>(null);

  // Una fila por unidad (tren) de las configuraciones dadas de alta
  const filas: Fila[] = useMemo(() => unidadesDe(store.configs, store.estructuras).flatMap(({ c, series }) => {
    const flota = store.flotas.find((f) => f.id === c.flotaId)?.nombre ?? "";
    const estructura = store.estructura(c.estructuraId)?.nombre ?? "";
    return series.map((s, i) => ({ clave: `${c.id}|${s}`, serie: s, flotaId: c.flotaId, flota, configId: c.id, estructura, hist: historial(`${c.id}|${s}`, flota, i) }));
  }), [store, historial]);

  const actual = (f: Fila) => f.hist[f.hist.length - 1];
  const lista = filas.filter((f) => (!fFlota || f.flotaId === fFlota) && (!fLinea || actual(f).lineaId === fLinea));
  const visibles = lista.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);
  const todasMarcadas = lista.length > 0 && lista.every((f) => sel.has(f.clave));
  const marcar = (clave: string) => setSel((s) => { const n = new Set(s); if (n.has(clave)) n.delete(clave); else n.add(clave); return n; });
  const marcarTodas = () => setSel(todasMarcadas ? new Set() : new Set(lista.map((f) => f.clave)));
  const filtrar = (fn: () => void) => { fn(); setPagina(0); setSel(new Set()); };
  const hayFiltros = !!(fFlota || fLinea);
  const caja = { width: 18, height: 18, accentColor: "var(--lm-sys-primary)" };

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion-prueba" }, { label: "Asignación de línea" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Asignación de línea</h1>
          <span className="muted">En qué línea circula cada unidad. Marca una o varias para asignarles una línea nueva desde una fecha.</span>
        </div>
      </div>

      <section className="lm-surface lm-surface--p16">
        <div className="lm-filters">
          <Field label="Flota" htmlFor="al-flota">
            <select id="al-flota" className="lm-select lm-select--dense" value={fFlota} onChange={(e) => filtrar(() => setFFlota(e.target.value))}>
              <option value="">Todas</option>
              {store.flotas.filter((f) => filas.some((x) => x.flotaId === f.id)).map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </Field>
          <Field label="Línea actual" htmlFor="al-linea">
            <select id="al-linea" className="lm-select lm-select--dense" value={fLinea} onChange={(e) => filtrar(() => setFLinea(e.target.value))}>
              <option value="">Todas</option>
              {LINEAS.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </select>
          </Field>
          {hayFiltros && <Button variant="text" icon="restart_alt" onClick={() => filtrar(() => { setFFlota(""); setFLinea(""); })}>Restablecer</Button>}
        </div>

        {/* Barra de selección: asignar por grupo */}
        <div className="row gap-15" style={{ minHeight: 48, padding: "var(--lm-space-5) 0" }}>
          {sel.size > 0 ? (
            <>
              <span className="lm-title-small">{sel.size} {sel.size === 1 ? "unidad seleccionada" : "unidades seleccionadas"}</span>
              <Button variant="text" onClick={() => setSel(new Set())}>Quitar selección</Button>
              <span className="grow" />
              <Button icon="swap_vert" onClick={() => setAsignando(filas.filter((f) => sel.has(f.clave)))}>Asignar línea</Button>
            </>
          ) : (
            <span className="muted">Marca las unidades a las que quieres asignar una línea. Con la casilla de la cabecera marcas todas las que se ven con los filtros.</span>
          )}
        </div>

        {!store.listo ? <Loading text="Cargando unidades" /> : filas.length === 0 ? (
          <EmptyState icon="train" title="Todavía no hay unidades" text="Las unidades aparecen cuando una configuración tiene cargada la plantilla del Tren" />
        ) : lista.length === 0 ? (
          <EmptyState icon="search_off" title="No hay resultados" text="Ninguna unidad coincide con los filtros"
            action={<Button variant="outlined" onClick={() => filtrar(() => { setFFlota(""); setFLinea(""); })}>Restablecer filtros</Button>} />
        ) : (
          <>
            <table className="lm-table">
              <thead>
                <tr>
                  <th style={{ width: 48 }}><input type="checkbox" style={caja} checked={todasMarcadas} onChange={marcarTodas} aria-label={`Seleccionar las ${lista.length} unidades filtradas`} /></th>
                  <th>Unidad</th><th>Flota</th><th>Grupo de trenes</th><th>Línea actual</th><th>Desde</th>
                  <th className="actions"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((f) => (
                  <tr key={f.clave}>
                    <td><input type="checkbox" style={caja} checked={sel.has(f.clave)} onChange={() => marcar(f.clave)} aria-label={`Seleccionar la unidad ${f.serie}`} /></td>
                    <td className="emph">{f.serie}</td>
                    <td>{f.flota}</td>
                    <td>{f.estructura}</td>
                    <td><Tag tone="primary">{nombreLinea(actual(f).lineaId)}</Tag></td>
                    <td className="muted">{fechaHora(actual(f).fecha)}</td>
                    <td className="actions">
                      <Menu label={`Acciones de la unidad ${f.serie}`} items={[
                        { label: "Asignar línea", icon: "swap_vert", onSelect: () => setAsignando([f]) },
                        { label: "Ver historial", icon: "today", onSelect: () => setVerHist(f) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="lm-paginator">
              <span>{pagina * POR_PAGINA + 1} - {Math.min((pagina + 1) * POR_PAGINA, lista.length)} de {lista.length}</span>
              <span className="row">
                <IconButton icon="chevron_left" label="Página anterior" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)} />
                <IconButton icon="chevron_right" label="Página siguiente" disabled={(pagina + 1) * POR_PAGINA >= lista.length} onClick={() => setPagina((p) => p + 1)} />
              </span>
            </div>
          </>
        )}
      </section>

      <footer className="row gap-10 wrap" style={{ marginTop: "var(--lm-space-40)", color: "var(--lm-sys-on-surface-variant)" }}>
        <span className="lm-label-medium">PROTOTIPO · Las líneas iniciales de cada unidad son ficticias.</span>
        <span className="grow" />
        <Button variant="text" icon="restart_alt" onClick={() => { restablecer(); snack("Asignaciones de línea restablecidas"); }}>Restablecer asignaciones</Button>
      </footer>

      {asignando && (
        <DialogAsignar unidades={asignando} actual={actual} onClose={() => setAsignando(null)}
          onAsignar={(lineaId, fecha) => {
            const cambian = asignando.filter((f) => actual(f).lineaId !== lineaId);
            asignar(cambian.map((f) => ({ clave: f.clave, previo: f.hist })), lineaId, fecha);
            setAsignando(null);
            setSel(new Set());
            snack(cambian.length === 1
              ? `Unidad ${cambian[0].serie} asignada a ${nombreLinea(lineaId)}`
              : `${cambian.length} unidades asignadas a ${nombreLinea(lineaId)}`);
          }} />
      )}

      {verHist && (
        <Dialog large title={`Historial de líneas de la unidad ${verHist.serie}`} message={`${verHist.flota} · ${verHist.estructura}`} onClose={() => setVerHist(null)}
          footer={<Button variant="outlined" onClick={() => setVerHist(null)}>Cerrar</Button>}>
          <table className="lm-table">
            <thead><tr><th>Línea</th><th>Desde</th><th>Hasta</th></tr></thead>
            <tbody>
              {[...verHist.hist].reverse().map((a, i, arr) => (
                <tr key={a.fecha + i}>
                  <td>{i === 0 ? <Tag tone="primary">{nombreLinea(a.lineaId)}</Tag> : nombreLinea(a.lineaId)}</td>
                  <td>{fechaHora(a.fecha)}</td>
                  <td className="muted">{i === 0 ? "Actual" : fechaHora(arr[i - 1].fecha)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Dialog>
      )}
    </main>
  );
}

/** Asignar una línea a una o varias unidades, desde una fecha y hora. Sin km. */
function DialogAsignar({ unidades, actual, onClose, onAsignar }: {
  unidades: Fila[]; actual: (f: Fila) => Asignacion; onClose: () => void; onAsignar: (lineaId: string, fechaIso: string) => void;
}) {
  const ahora = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const [linea, setLinea] = useState("");
  const [fecha, setFecha] = useState(`${ahora.getFullYear()}-${p(ahora.getMonth() + 1)}-${p(ahora.getDate())}`);
  const [hora, setHora] = useState(`${p(ahora.getHours())}:${p(ahora.getMinutes())}`);
  const [intentado, setIntentado] = useState(false);

  const cuando = new Date(`${fecha}T${hora || "00:00"}`);
  const cambian = unidades.filter((f) => actual(f).lineaId !== linea);
  const yaEstan = unidades.length - cambian.length;
  // La fecha no puede ser anterior a la última asignación de ninguna unidad que cambia
  const posterior = cambian.reduce<Fila | null>((m, f) => (!m || actual(f).fecha > actual(m).fecha ? f : m), null);
  const errLinea = !linea ? "Elige la línea" : cambian.length === 0 ? (unidades.length === 1 ? "La unidad ya está en esta línea" : "Todas las unidades ya están en esta línea") : "";
  const errFecha = !fecha ? "Indica la fecha" : isNaN(cuando.getTime()) ? "Fecha no válida"
    : cuando > new Date() ? "La fecha no puede ser posterior a ahora"
    : posterior && cuando.toISOString() <= actual(posterior).fecha ? `Tiene que ser posterior a la última asignación (${fechaHora(actual(posterior).fecha)}, unidad ${posterior.serie})` : "";
  const guardar = () => { setIntentado(true); if (!errLinea && !errFecha) onAsignar(linea, cuando.toISOString()); };

  const resumen = unidades.length === 1 ? `Unidad ${unidades[0].serie} · ${unidades[0].flota}` : `${unidades.length} unidades: ${unidades.slice(0, 8).map((f) => f.serie).join(", ")}${unidades.length > 8 ? "…" : ""}`;
  return (
    <Dialog title="Asignar línea" message={resumen} onClose={onClose}
      footer={<>
        <Button variant="outlined" onClick={onClose}>Cancelar</Button>
        <Button onClick={guardar}>Asignar</Button>
      </>}>
      <div className="stack gap-20">
        {unidades.length === 1 && <span>Línea actual: <strong>{nombreLinea(actual(unidades[0]).lineaId)}</strong> desde {fechaHora(actual(unidades[0]).fecha)}</span>}
        <Field label="Línea nueva" required htmlFor="al-nueva" error={intentado ? errLinea : ""}>
          <select id="al-nueva" className="lm-select" value={linea} aria-invalid={intentado && !!errLinea} onChange={(e) => setLinea(e.target.value)}>
            <option value="">Elige una línea</option>
            {LINEAS.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
          </select>
        </Field>
        <div className="row gap-15" style={{ alignItems: "flex-start" }}>
          <Field label="Fecha" required htmlFor="al-fecha" error={intentado ? errFecha : ""} style={{ flex: 1 }}>
            <input id="al-fecha" type="date" className="lm-input" value={fecha} aria-invalid={intentado && !!errFecha} onChange={(e) => setFecha(e.target.value)} />
          </Field>
          <Field label="Hora" required htmlFor="al-hora" style={{ width: 140 }}>
            <input id="al-hora" type="time" className="lm-input" value={hora} onChange={(e) => setHora(e.target.value)} />
          </Field>
        </div>
        {linea && yaEstan > 0 && cambian.length > 0 && (
          <Banner type="info">{yaEstan} {yaEstan === 1 ? "unidad ya está" : "unidades ya están"} en {nombreLinea(linea)}: no cambian. Se asignará a {cambian.length}.</Banner>
        )}
      </div>
    </Dialog>
  );
}
