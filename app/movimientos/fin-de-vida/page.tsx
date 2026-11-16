"use client";

// HU-M12 · Fin de vida. Dos pestañas:
// - Dar de baja: un activo suelto de un almacén queda De baja (con o sin sus activos montados), con un motivo opcional.
// - Activos de baja: todo lo dado de baja (también desde Desmontaje de unidad), con su driver, fecha, origen y motivo.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner, Button, Dialog, EmptyState, Field, Loading, SearchInput, useSnackbar } from "@/components/ds";
import { TablaAntesDespues } from "@/components/movimientos/detalle";
import { useCabecera } from "@/components/movimientos/cabecera";
import { CabeceraPantalla } from "@/components/movimientos/pantalla";
import { Panel, PanelAlmacen } from "@/components/movimientos/paneles";
import { textoDriver } from "@/components/movimientos/tablas";
import { art, TIPOS, descendientes, planBaja, textoFecha, useMovimientos, useTextos } from "@/lib/movimientos";

type Pestana = "dar" | "lista";

export default function FinDeVida() {
  const mov = useMovimientos();
  const [pestana, setPestana] = useState<Pestana>("dar");
  const nBaja = Object.values(mov.activos).filter((a) => a.lugar.tipo === "baja").length;
  const tabs = (
    <div className="lm-tabs" role="tablist" style={{ marginBottom: 0 }}>
      <button role="tab" className="lm-tab" aria-selected={pestana === "dar"} onClick={() => setPestana("dar")}>Dar de baja</button>
      <button role="tab" className="lm-tab" aria-selected={pestana === "lista"} onClick={() => setPestana("lista")}>Activos de baja ({nBaja})</button>
    </div>
  );
  return <main className="lm-page">{pestana === "dar" ? <DarDeBaja tabs={tabs} onHecho={() => setPestana("lista")} /> : <Listado tabs={tabs} />}</main>;
}

function DarDeBaja({ tabs, onHecho }: { tabs: React.ReactNode; onHecho: () => void }) {
  const mov = useMovimientos();
  const t = useTextos();
  const snack = useSnackbar();
  const router = useRouter();
  const [sel, setSel] = useState("");
  const [incluir, setIncluir] = useState(true);
  const [motivo, setMotivo] = useState("");
  const [busca, setBusca] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const cab = useCabecera({ conUnidad: false, conAlmacen: true, onCambio: () => setSel("") });

  const sueltos = useMemo(() => Object.values(mov.activos)
    .filter((a) => a.lugar.tipo === "almacen" && a.lugar.almacenId === cab.almacen && !a.lugar.padre)
    .filter((a) => !busca || a.serie.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.serie.localeCompare(b.serie)), [mov.activos, cab.almacen, busca]);
  const A = sel ? mov.activos[sel] : undefined;
  const hijos = A ? descendientes(mov.activos, A) : [];
  const plan = sel ? planBaja(mov.activos, sel, incluir) : null;
  const planOk = !!plan && !plan.error && plan.filas.length > 0;
  const valido = cab.ok && planOk;

  const registrar = () => {
    if (!plan) return;
    const m = mov.registrar({ tipo: TIPOS.finVida, fecha: cab.iso, almacenes: [cab.almacen], filas: plan.filas, registros: [], motivo: motivo.trim() || undefined });
    setConfirmar(false); setSel(""); setMotivo("");
    snack("Movimiento registrado", { label: "Ver activos de baja", onClick: onHecho });
  };

  if (!mov.listo) return <Loading text="Cargando almacenes" />;
  return (
    <>
      <CabeceraPantalla miga="Fin de vida" titulo="Fin de vida" texto="Da de baja un activo suelto que ha llegado al final de su vida útil; no se podrá volver a usar."
        valido={valido} hayDatos={cab.hayDatos || !!sel} accion="Dar de baja" onRegistrar={() => { cab.setIntentado(true); if (valido) setConfirmar(true); }} selector={tabs} />
      <div className="stack gap-20">
        {cab.bloque}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", gap: "var(--lm-space-15)", alignItems: "start" }}>
          <Panel titulo={cab.almacen ? t.nombreAlmacen(cab.almacen) : "Almacén"} subtitulo={A ? <>Elegido: <strong>{A.categoria.replace(/^./, (c) => c.toLowerCase())} {A.serie}</strong></> : "Activos sueltos (los montados en otro hay que desmontarlos antes)"}
            accion={cab.almacen ? <SearchInput label="Buscar en el almacén por nº de serie" placeholder="Nº de serie" value={busca} onChange={setBusca} /> : undefined}>
            {!cab.almacen ? <EmptyState icon="domain" title="Elige un almacén" text="Indícalo arriba" />
              : !sueltos.length ? <EmptyState icon={busca ? "search_off" : "domain"} title={busca ? "No hay resultados" : "No hay activos sueltos"} text={busca ? "Ningún activo coincide" : "Elige otro almacén"} />
                : <PanelAlmacen candidatos={sueltos} activos={mov.activos} sel={sel} onSel={setSel} conHijos sinRotar rotado={false} onRotar={() => {}} alto={420} />}
          </Panel>
          <Panel titulo="Baja" subtitulo={A ? `Qué queda de baja` : "Elige antes el activo"}>
            {!A ? <EmptyState icon="block" title="Elige el activo" text="Después indica si incluye sus activos montados" /> : (
              <div className="stack gap-15" style={{ padding: "var(--lm-space-15)" }}>
                {hijos.length > 0 && (
                  <label className="lm-check row gap-10">
                    <input type="checkbox" checked={incluir} onChange={(e) => setIncluir(e.target.checked)} />
                    <span>Incluir sus {hijos.length} activos montados{!incluir ? " (quedan sueltos en el almacén)" : ""}</span>
                  </label>
                )}
                <Field label="Motivo" htmlFor="motivo" support="Opcional">
                  <input id="motivo" className="lm-input lm-input--dense" value={motivo} placeholder="Por ejemplo: diámetro por debajo del mínimo" onChange={(e) => setMotivo(e.target.value)} />
                </Field>
                <div className="stack gap-5 lm-body-medium">
                  <span>Quedan <strong>De baja</strong>:</span>
                  <span style={{ paddingLeft: "var(--lm-space-15)" }}>{A.categoria} {A.serie}</span>
                  {incluir && hijos.map((h) => <span key={h.a.serie} className="lm-body-small" style={{ paddingLeft: "var(--lm-space-30)" }}>{h.rel} · {h.a.serie}</span>)}
                </div>
              </div>
            )}
          </Panel>
        </div>
        {plan?.error && <Banner type="error" title={plan.error} />}
      </div>
      {confirmar && plan && (
        <Dialog large title={`¿Dar de baja ${art(A?.categoria, "el")} ${A?.serie}?`} onClose={() => setConfirmar(false)}
          message={`${textoFecha(cab.iso)} · ${t.nombreAlmacen(cab.almacen)} · No se podrá usar en ningún movimiento${motivo.trim() ? ` · Motivo: ${motivo.trim()}` : ""}`}
          footer={<><Button variant="outlined" onClick={() => setConfirmar(false)}>Cancelar</Button><Button onClick={registrar}>Dar de baja</Button></>}>
          <TablaAntesDespues filas={plan.filas} />
        </Dialog>
      )}
    </>
  );
}

function Listado({ tabs }: { tabs: React.ReactNode }) {
  const mov = useMovimientos();
  const t = useTextos();
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState("");
  // Para cada activo de baja, el último movimiento (registrado) que lo dejó de baja
  const filas = useMemo(() => Object.values(mov.activos).filter((a) => a.lugar.tipo === "baja").map((a) => {
    const m = [...mov.movimientos].filter((x) => x.estado === "registrado" && x.filas.some((f) => f.serie === a.serie && f.despues.tipo === "baja"))
      .sort((x, y) => y.fecha.localeCompare(x.fecha))[0];
    const f = m?.filas.find((x) => x.serie === a.serie);
    return { a, m, antes: f ? t.lugar(f.antes) : "—" };
  }).sort((x, y) => (y.m?.fecha ?? "").localeCompare(x.m?.fecha ?? "")), [mov.activos, mov.movimientos, t]);
  const categorias = [...new Set(filas.map((f) => f.a.categoria))].sort();
  const lista = filas.filter((f) => (!cat || f.a.categoria === cat) && (!busca || f.a.serie.toLowerCase().includes(busca.toLowerCase())));

  if (!mov.listo) return <Loading text="Cargando activos de baja" />;
  return (
    <>
      <CabeceraPantalla miga="Fin de vida" titulo="Fin de vida" texto="Activos dados de baja: no aparecen en ningún movimiento, pero sí en Consulta." valido={false} hayDatos={false} selector={tabs} />
      <section className="lm-surface lm-surface--p16">
        {!filas.length ? <EmptyState icon="block" title="Todavía no hay activos dados de baja" text="Da de baja un activo en la pestaña Dar de baja o al desmontarlo de una unidad" /> : (
          <>
            <div className="lm-filters">
              <Field label="Categoría" htmlFor="f-cat" style={{ width: 220 }}>
                <select id="f-cat" className="lm-select lm-select--dense" value={cat} onChange={(e) => setCat(e.target.value)}>
                  <option value="">Todas</option>
                  {categorias.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Nº de serie" htmlFor="f-serie" style={{ width: 200 }}>
                <input id="f-serie" className="lm-input lm-input--dense" value={busca} placeholder="Por ejemplo: 415875" onChange={(e) => setBusca(e.target.value)} />
              </Field>
            </div>
            {!lista.length ? <EmptyState icon="search_off" title="No hay resultados" text="Ningún activo de baja cumple los filtros" /> : (
              <table className="lm-table">
                <thead><tr><th>Nº de serie</th><th>Categoría</th><th>Driver al darlo de baja</th><th>Fecha</th><th>Dónde estaba</th><th>Motivo</th><th>Movimiento</th></tr></thead>
                <tbody>
                  {lista.map(({ a, m, antes }) => (
                    <tr key={a.serie}>
                      <td className="emph">{a.serie}</td><td>{a.categoria}</td><td>{textoDriver(a)}</td>
                      <td>{m ? textoFecha(m.fecha) : "—"}</td><td>{antes}</td><td>{m?.motivo ?? "—"}</td><td>{m ? `${m.tipo} · ${textoFecha(m.fecha)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </section>
    </>
  );
}
