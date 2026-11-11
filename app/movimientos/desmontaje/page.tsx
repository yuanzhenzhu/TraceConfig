"use client";

// Desmontaje: HU-M11 (de una unidad) y HU-M08 (en un almacén), en una sola entrada del menú.
// - De una unidad: se marca el activo, que sale con todo lo que lleva montado, a un almacén o de baja (fin de vida).
// - En un almacén: se elige un activo montado en otro y queda suelto en el mismo almacén.

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Banner, Button, Dialog, EmptyState, Loading, SearchInput, useSnackbar } from "@/components/ds";
import { TablaAntesDespues } from "@/components/movimientos/detalle";
import { useCabecera } from "@/components/movimientos/cabecera";
import { AhoraDespues, CabeceraPantalla, SelectorDonde } from "@/components/movimientos/pantalla";
import { Panel, PanelAlmacen, PanelUnidad } from "@/components/movimientos/paneles";
import type { SeleccionUnidad } from "@/components/movimientos/tablas";
import { SEP } from "@/lib/datos";
import { TIPOS, descendientes, formatoKm, planDesmontajeAlmacen, planDesmontajeUnidad, textoFecha, useMovimientos, useTextos } from "@/lib/movimientos";

type Modo = "unidad" | "almacen";

export default function Desmontaje() {
  const [modo, setModo] = useState<Modo>("unidad");
  const selector = (
    <SelectorDonde valor={modo} onChange={setModo} opciones={[{ value: "unidad", label: "De una unidad" }, { value: "almacen", label: "En un almacén" }]}
      texto={modo === "unidad" ? "Desmonta un activo de una unidad (con lo que lleva montado) y déjalo en un almacén o dalo de baja." : "Desmonta un activo que está montado en otro dentro de un almacén; queda suelto."} />
  );
  return <main className="lm-page">{modo === "unidad" ? <DeUnidad key="u" selector={selector} /> : <EnAlmacen key="a" selector={selector} />}</main>;
}

/* ---------- HU-M11 · Desmontaje de unidad ---------- */
function DeUnidad({ selector }: { selector: ReactNode }) {
  const mov = useMovimientos();
  const t = useTextos();
  const snack = useSnackbar();
  const router = useRouter();
  const [sel, setSel] = useState<SeleccionUnidad>(null);
  const [baja, setBaja] = useState(false);
  const [hijosBaja, setHijosBaja] = useState(true);
  const [busca, setBusca] = useState("");
  const [vista, setVista] = useState<"antes" | "despues">("antes");
  const [confirmar, setConfirmar] = useState(false);
  const cab = useCabecera({ conUnidad: true, conAlmacen: true, etiquetaAlmacen: "Almacén de destino", onCambio: () => { setSel(null); setVista("antes"); } });

  const A = sel ? mov.activos[sel.padre] : undefined;
  const hijos = A ? descendientes(mov.activos, A) : [];
  const necesitaAlmacen = !baja || (hijos.length > 0 && !hijosBaja);
  const plan = A ? planDesmontajeUnidad(mov.activos, A.serie, baja ? "baja" : { almacenId: cab.almacen || "—" }, hijosBaja, cab.almacen) : null;
  const planOk = !!plan && !plan.error && plan.filas.length > 0 && (!necesitaAlmacen || !!cab.almacen);
  const valido = cab.okSinAlmacen && planOk;
  const despues = useMemo(() => { const d = { ...mov.activos }; plan?.filas.forEach((f) => { d[f.serie] = { ...d[f.serie], lugar: f.despues }; }); return d; }, [mov.activos, plan]);
  const hueco = A?.lugar.tipo === "unidad" ? A.lugar.hueco : "";
  const vacios = new Set(planOk ? [hueco, ...hijos.map((h) => `${hueco}${SEP}${h.rel}`)] : []);

  const registrar = () => {
    if (!plan) return;
    const m = mov.registrar({ tipo: TIPOS.desmontajeUnidad, fecha: cab.iso, almacenes: necesitaAlmacen ? [cab.almacen] : [], filas: plan.filas, registros: [{ unidad: cab.unidad, km: cab.kmNum }] });
    setConfirmar(false); setSel(null); setBaja(false); setVista("antes");
    snack(`Movimiento ${m.id} registrado`, { label: "Ver en el historial", onClick: () => router.push("/movimientos") });
  };

  if (!mov.listo) return <Loading text="Cargando unidades" />;
  return (
    <>
      <CabeceraPantalla miga="Desmontaje" selector={selector} titulo="Desmontaje de unidad" texto="Marca el activo que se desmonta; sale con todo lo que lleva montado." valido={valido} hayDatos={cab.hayDatos || !!sel}
        onRegistrar={() => { cab.setIntentado(true); if (valido) setConfirmar(true); }} />
      <div className="stack gap-20">
        {cab.bloque}
        <AhoraDespues vista={vista} setVista={setVista} ok={planOk} texto="Marca el activo que se desmonta y su destino; después podrás ver cómo queda." />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", gap: "var(--lm-space-15)", alignItems: "start" }}>
          <Panel titulo={`Unidad ${cab.unidad || ""} · ${vista === "despues" ? "Después" : "Ahora"}`}
            subtitulo={vista === "despues" ? <>{hueco} queda vacío{hijos.length ? ` con sus ${hijos.length} posiciones` : ""}</> : A ? <>Marcado: <strong>{A.categoria.replace(/^./, (c) => c.toLowerCase())} {A.serie}</strong>{hijos.length ? ` con sus ${hijos.length} activos montados` : ""}</> : "Marca el activo que se desmonta"}
            accion={cab.info && vista === "antes" ? <SearchInput label="Buscar en la unidad por nº de serie" placeholder="Nº de serie" value={busca} onChange={setBusca} /> : undefined}>
            {!cab.info ? <EmptyState icon="train" title="Elige una unidad" text="Indica la flota y la unidad arriba" /> : (
              <>
                <div hidden={vista === "despues" && planOk}>
                  <PanelUnidad key={cab.unidad} raiz={cab.info.raiz} unidad={cab.unidad} activos={mov.activos} sel={sel} busca={busca} alto={420}
                    onSel={(s) => { setSel(s ? { padre: s.padre, quedan: [] } : null); setVista("antes"); }} />
                </div>
                {vista === "despues" && planOk && (
                  <PanelUnidad key={`d-${cab.unidad}`} raiz={cab.info.raiz} unidad={cab.unidad} activos={despues} sel={null} onSel={() => {}} busca="" soloLectura alto={420} vacios={vacios} abrirHasta={hueco} />
                )}
              </>
            )}
          </Panel>
          <Panel titulo="Destino" subtitulo={A ? `A dónde va el ${A.categoria.replace(/^./, (c) => c.toLowerCase())} ${A.serie}` : "Marca antes el activo"}>
            {!A ? <EmptyState icon="arrow_left" title="Marca el activo" text="Después elige a dónde va" /> : (
              <div className="stack gap-15" style={{ padding: "var(--lm-space-15)" }}>
                <label className="lm-radio row gap-10">
                  <input type="radio" name="destino" checked={!baja} onChange={() => setBaja(false)} />
                  <span>Al almacén de destino{cab.almacen ? `: ${t.nombreAlmacen(cab.almacen)}` : " (elígelo arriba)"}</span>
                </label>
                <label className="lm-radio row gap-10">
                  <input type="radio" name="destino" checked={baja} onChange={() => setBaja(true)} />
                  <span>Dar de baja al desmontar (fin de vida)</span>
                </label>
                {baja && hijos.length > 0 && (
                  <label className="lm-check row gap-10" style={{ paddingLeft: "var(--lm-space-30)" }}>
                    <input type="checkbox" checked={hijosBaja} onChange={(e) => setHijosBaja(e.target.checked)} />
                    <span>Incluir sus {hijos.length} activos montados{!hijosBaja ? ` (irán sueltos al almacén de destino${cab.almacen ? "" : ", elígelo arriba"})` : ""}</span>
                  </label>
                )}
                {vista === "despues" && planOk && (
                  <div className="lm-body-small muted">
                    {baja ? `El ${A.categoria.replace(/^./, (c) => c.toLowerCase())} ${A.serie}${hijos.length && hijosBaja ? " y sus activos montados" : ""} quedan De baja.` : `El ${A.categoria.replace(/^./, (c) => c.toLowerCase())} ${A.serie} queda suelto en ${t.nombreAlmacen(cab.almacen)}${hijos.length ? ", con sus activos montados" : ""}.`}
                  </div>
                )}
                {necesitaAlmacen && !cab.almacen && <Banner type="attention" title="Elige el almacén de destino arriba" />}
              </div>
            )}
          </Panel>
        </div>
        {plan?.error && <Banner type="error" title={plan.error} />}
      </div>
      {confirmar && plan && (
        <Dialog large title={baja ? "¿Desmontar y dar de baja?" : "¿Registrar el desmontaje?"} onClose={() => setConfirmar(false)}
          message={`${textoFecha(cab.iso)} · Unidad ${cab.unidad} (${t.flotaDeUnidad(cab.unidad)}) · ${formatoKm(cab.kmNum)} km${baja ? " · Los activos de baja no se podrán usar en ningún movimiento" : ` · a ${t.nombreAlmacen(cab.almacen)}`}`}
          footer={<><Button variant="outlined" onClick={() => setConfirmar(false)}>Cancelar</Button><Button onClick={registrar}>{baja ? "Desmontar y dar de baja" : "Registrar"}</Button></>}>
          <TablaAntesDespues filas={plan.filas} />
        </Dialog>
      )}
    </>
  );
}

/* ---------- HU-M08 · Desmontaje en almacén ---------- */
function EnAlmacen({ selector }: { selector: ReactNode }) {
  const mov = useMovimientos();
  const t = useTextos();
  const snack = useSnackbar();
  const router = useRouter();
  const [sel, setSel] = useState("");
  const [busca, setBusca] = useState("");
  const [vista, setVista] = useState<"antes" | "despues">("antes");
  const [confirmar, setConfirmar] = useState(false);
  const cab = useCabecera({ conUnidad: false, conAlmacen: true, onCambio: () => { setSel(""); setVista("antes"); } });

  const montados = useMemo(() => Object.values(mov.activos)
    .filter((a) => a.lugar.tipo === "almacen" && a.lugar.almacenId === cab.almacen && !!a.lugar.padre)
    .filter((a) => !busca || a.serie.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.serie.localeCompare(b.serie)), [mov.activos, cab.almacen, busca]);
  const plan = sel ? planDesmontajeAlmacen(mov.activos, sel) : null;
  const planOk = !!plan && !plan.error && plan.filas.length > 0;
  const valido = cab.ok && planOk;
  const despues = useMemo(() => { const d = { ...mov.activos }; plan?.filas.forEach((f) => { d[f.serie] = { ...d[f.serie], lugar: f.despues }; }); return d; }, [mov.activos, plan]);
  const A = sel ? mov.activos[sel] : undefined;
  const padre = A?.lugar.tipo === "almacen" ? A.lugar.padre : undefined;

  const registrar = () => {
    if (!plan) return;
    const m = mov.registrar({ tipo: TIPOS.desmontajeAlmacen, fecha: cab.iso, almacenes: [cab.almacen], filas: plan.filas, registros: [] });
    setConfirmar(false); setSel(""); setVista("antes");
    snack(`Movimiento ${m.id} registrado`, { label: "Ver en el historial", onClick: () => router.push("/movimientos") });
  };

  if (!mov.listo) return <Loading text="Cargando almacenes" />;
  return (
    <>
      <CabeceraPantalla miga="Desmontaje" selector={selector} titulo="Desmontaje en almacén" texto="Elige el activo montado que se desmonta; queda suelto en el mismo almacén." valido={valido} hayDatos={cab.hayDatos || !!sel}
        onRegistrar={() => { cab.setIntentado(true); if (valido) setConfirmar(true); }} />
      <div className="stack gap-20">
        {cab.bloque}
        <AhoraDespues vista={vista} setVista={setVista} ok={planOk} texto="Elige el activo que se desmonta; después podrás ver cómo queda." />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "var(--lm-space-15)", alignItems: "start" }}>
          <Panel titulo={`${cab.almacen ? t.nombreAlmacen(cab.almacen) : "Almacén"} · Ahora`} subtitulo={A ? <>Elegido: <strong>{A.categoria.replace(/^./, (c) => c.toLowerCase())} {A.serie}</strong>, montado en {padre}</> : "Activos montados en otro activo del almacén"}
            accion={cab.almacen ? <SearchInput label="Buscar en el almacén por nº de serie" placeholder="Nº de serie" value={busca} onChange={setBusca} /> : undefined}>
            {!cab.almacen ? <EmptyState icon="domain" title="Elige un almacén" text="Indícalo arriba" />
              : !montados.length ? <EmptyState icon={busca ? "search_off" : "domain"} title={busca ? "No hay resultados" : "No hay activos montados en este almacén"} text={busca ? "Ningún activo coincide" : "Elige otro almacén"} />
                : <PanelAlmacen candidatos={montados} activos={mov.activos} sel={sel} onSel={(s) => { setSel(s); setVista("antes"); }} conHijos sinRotar rotado={false} onRotar={() => {}} alto={420}
                    detalle={(a) => (a.lugar.tipo === "almacen" ? `en ${a.lugar.padre}${a.lugar.enHueco ? ` › ${a.lugar.enHueco}` : ""}` : "")} />}
          </Panel>
          <Panel titulo={vista === "despues" ? "Después" : "Cómo queda"} subtitulo={A ? `El ${A.categoria.replace(/^./, (c) => c.toLowerCase())} ${A.serie} y el activo del que se desmonta` : "Elige antes el activo"}>
            {!A ? <EmptyState icon="arrow_left" title="Elige el activo" text="Aquí verás cómo queda" /> : (
              <PanelAlmacen candidatos={[vista === "despues" ? despues[A.serie] : A, ...(padre ? [vista === "despues" ? despues[padre] : mov.activos[padre]] : [])].filter(Boolean)}
                activos={vista === "despues" ? despues : mov.activos} sel="" onSel={() => {}} conHijos sinRotar rotado={false} onRotar={() => {}} soloLectura alto={420}
                marcas={{ [A.serie]: "Sale" }} detalle={(a) => (a.lugar.tipo === "almacen" ? (a.lugar.padre ? `en ${a.lugar.padre}${a.lugar.enHueco ? ` › ${a.lugar.enHueco}` : ""}` : "suelto") : "")} />
            )}
          </Panel>
        </div>
      </div>
      {confirmar && plan && (
        <Dialog large title="¿Registrar el desmontaje?" onClose={() => setConfirmar(false)} message={`${textoFecha(cab.iso)} · ${t.nombreAlmacen(cab.almacen)}`}
          footer={<><Button variant="outlined" onClick={() => setConfirmar(false)}>Cancelar</Button><Button onClick={registrar}>Registrar</Button></>}>
          <TablaAntesDespues filas={plan.filas} />
        </Dialog>
      )}
    </>
  );
}
