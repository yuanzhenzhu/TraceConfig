"use client";

// Desmontaje: HU-M11 (de una unidad) y HU-M08 (en un almacén), en una sola entrada del menú.
// - De una unidad: se marca el activo, que sale con todo lo que lleva montado, a un almacén o de baja (fin de vida).
// - En un almacén: se elige un activo montado en otro y queda suelto en el mismo almacén.

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Banner, Button, Dialog, EmptyState, Loading, SearchInput, useSnackbar } from "@/components/ds";
import { TablaAntesDespues } from "@/components/movimientos/detalle";
import { useCabecera } from "@/components/movimientos/cabecera";
import { useDrivers } from "@/components/movimientos/drivers";
import { AhoraDespues, CabeceraPantalla, SelectorDonde } from "@/components/movimientos/pantalla";
import { Panel, PanelAlmacen, PanelUnidad } from "@/components/movimientos/paneles";
import type { SeleccionUnidad } from "@/components/movimientos/tablas";
import { SEP } from "@/lib/datos";
import { TIPOS, descendientes, type ActivoM, type FilaMov, formatoKm, planDesmontajeAlmacen, planDesmontajeUnidad, textoFecha, useMovimientos, useTextos } from "@/lib/movimientos";

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
  // Horas (motor) o ciclos (puerta) del activo que sale
  const drv = useDrivers([A]);
  const valido = cab.okSinAlmacen && planOk && drv.ok;
  const despues = useMemo(() => { const d = { ...mov.activos }; plan?.filas.forEach((f) => { d[f.serie] = { ...d[f.serie], lugar: f.despues }; }); return d; }, [mov.activos, plan]);
  const hueco = A?.lugar.tipo === "unidad" ? A.lugar.hueco : "";
  const vacios = new Set(planOk ? [hueco, ...hijos.map((h) => `${hueco}${SEP}${h.rel}`)] : []);

  const registrar = () => {
    if (!plan) return;
    const m = mov.registrar({ tipo: TIPOS.desmontajeUnidad, fecha: cab.iso, almacenes: necesitaAlmacen ? [cab.almacen] : [], filas: drv.aplicar(plan.filas), registros: [{ unidad: cab.unidad, km: cab.kmNum }] });
    setConfirmar(false); setSel(null); setBaja(false); setVista("antes"); drv.reset();
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
        {drv.campos}
        {plan?.error && <Banner type="error" title={plan.error} />}
      </div>
      {confirmar && plan && (
        <Dialog large title={baja ? "¿Desmontar y dar de baja?" : "¿Registrar el desmontaje?"} onClose={() => setConfirmar(false)}
          message={`${textoFecha(cab.iso)} · Unidad ${cab.unidad} (${t.flotaDeUnidad(cab.unidad)}) · ${formatoKm(cab.kmNum)} km${drv.texto ? ` · ${drv.texto}` : ""}${baja ? " · Los activos de baja no se podrán usar en ningún movimiento" : ` · a ${t.nombreAlmacen(cab.almacen)}`}`}
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
  const [padre, setPadre] = useState("");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState("");
  const [vista, setVista] = useState<"antes" | "despues">("antes");
  const [confirmar, setConfirmar] = useState(false);
  const cab = useCabecera({ conUnidad: false, conAlmacen: true, onCambio: () => { setPadre(""); setMarcados(new Set()); setVista("antes"); } });

  const posDe = (a: ActivoM) => (a.lugar.tipo === "almacen" ? a.lugar.enHueco ?? a.categoria : a.categoria);
  // Hijos directos montados en un activo del almacén, por posición
  const hijosDe = (serie: string) => Object.values(mov.activos)
    .filter((a) => a.lugar.tipo === "almacen" && a.lugar.padre === serie)
    .sort((a, b) => posDe(a).localeCompare(posDe(b), "es", { numeric: true }));
  const padres = useMemo(() => Object.values(mov.activos)
    .filter((a) => a.lugar.tipo === "almacen" && a.lugar.almacenId === cab.almacen && Object.values(mov.activos).some((h) => h.lugar.tipo === "almacen" && h.lugar.padre === a.serie))
    .filter((a) => !busca || a.serie.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.serie.localeCompare(b.serie)), [mov.activos, cab.almacen, busca]);
  const P = padre ? mov.activos[padre] : undefined;
  const hijos = P ? hijosDe(P.serie) : [];
  // Un solo movimiento: el padre es el participante y los activos que se desmontan, sus hijos (con lo que llevan montado)
  const filas: FilaMov[] = [...marcados].flatMap((serie) => planDesmontajeAlmacen(mov.activos, serie).filas.map((f) => ({ ...f, conPadre: true })));
  const planOk = !!P && filas.length > 0;
  const valido = cab.ok && planOk;
  const despues = useMemo(() => { const d = { ...mov.activos }; filas.forEach((f) => { d[f.serie] = { ...d[f.serie], lugar: f.despues }; }); return d; }, [mov.activos, filas]);
  const conmutar = (serie: string) => setMarcados((m) => { const n = new Set(m); if (n.has(serie)) n.delete(serie); else n.add(serie); return n; });
  const minus = (c: string) => c.replace(/^./, (x) => x.toLowerCase());
  const donde = (a: ActivoM) => (a.lugar.tipo === "almacen" ? (a.lugar.padre ? `en ${a.lugar.padre}${a.lugar.enHueco ? ` › ${a.lugar.enHueco}` : ""}` : "suelto") : "");

  const registrar = () => {
    if (!P || !filas.length) return;
    // Un movimiento por activo desmontado, en orden; en cada uno el participante es el padre con lo que lleva montado en ese momento
    const ids = filas.map((f) => mov.registrar({ tipo: TIPOS.desmontajeAlmacen, fecha: cab.iso, almacenes: [cab.almacen], filas: [f], registros: [], principal: { serie: P.serie, categoria: P.categoria } }).id);
    setConfirmar(false); setPadre(""); setMarcados(new Set()); setVista("antes");
    snack(ids.length > 1 ? `${ids.length} movimientos registrados: ${ids.join(" y ")}` : `Movimiento ${ids[0]} registrado`, { label: "Ver en el historial", onClick: () => router.push("/movimientos") });
  };

  if (!mov.listo) return <Loading text="Cargando almacenes" />;
  return (
    <>
      <CabeceraPantalla miga="Desmontaje" selector={selector} titulo="Desmontaje en almacén" texto="Elige el activo padre y marca los activos que se desmontan; quedan sueltos en el mismo almacén." valido={valido} hayDatos={cab.hayDatos || !!padre}
        onRegistrar={() => { cab.setIntentado(true); if (valido) setConfirmar(true); }} />
      <div className="stack gap-20">
        {cab.bloque}
        <AhoraDespues vista={vista} setVista={setVista} ok={planOk} texto="Elige el padre y al menos un activo para desmontar; después podrás ver cómo queda." />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "var(--lm-space-15)", alignItems: "start" }}>
          <Panel titulo={`${cab.almacen ? t.nombreAlmacen(cab.almacen) : "Almacén"} · ${vista === "despues" ? "Después" : "Ahora"}`}
            subtitulo={vista === "despues" && P ? <>Así queda el <strong>{minus(P.categoria)} {P.serie}</strong> y, sueltos, los activos desmontados</> : P ? <>Padre: <strong>{minus(P.categoria)} {P.serie}</strong></> : "Elige el activo del que se desmonta (con activos montados)"}
            accion={cab.almacen && vista === "antes" ? <SearchInput label="Buscar el padre por nº de serie" placeholder="Nº de serie" value={busca} onChange={setBusca} /> : undefined}>
            {!cab.almacen ? <EmptyState icon="domain" title="Elige un almacén" text="Indícalo arriba" />
              : vista === "despues" && P ? (
                <PanelAlmacen candidatos={[despues[P.serie], ...[...marcados].map((s) => despues[s])]} activos={despues} sel="" onSel={() => {}} conHijos sinRotar rotado={false} onRotar={() => {}} soloLectura alto={420}
                  marcas={Object.fromEntries([...marcados].map((s) => [s, "Sale"]))} detalle={donde} />
              ) : !padres.length ? <EmptyState icon={busca ? "search_off" : "domain"} title={busca ? "No hay resultados" : "No hay activos con activos montados"} text={busca ? "Ningún activo coincide" : "Elige otro almacén"} />
                : <PanelAlmacen candidatos={padres} activos={mov.activos} sel={padre} onSel={(s) => { setPadre(s); setMarcados(new Set()); }} conHijos sinRotar rotado={false} onRotar={() => {}} alto={420}
                    detalle={(a) => `Montados: ${hijosDe(a.serie).map(posDe).join(", ")}`} />}
          </Panel>
          <Panel titulo="Activos que se desmontan" subtitulo={P ? `Marca los que se desmontan del ${minus(P.categoria)} ${P.serie}; si llevan activos montados, salen con ellos.` : "Elige antes el padre"}>
            {!P ? <EmptyState icon="arrow_left" title="Elige el padre" text="Aquí aparecerán sus activos montados" /> : (
              <div className="stack gap-10" style={{ padding: "var(--lm-space-15)" }}>
                {hijos.map((h) => {
                  const n = descendientes(mov.activos, h).length;
                  return (
                    <label key={h.serie} className="row gap-10" style={{ cursor: vista === "despues" ? "default" : "pointer" }}>
                      <input type="checkbox" checked={marcados.has(h.serie)} disabled={vista === "despues"} onChange={() => conmutar(h.serie)} />
                      <span className="muted" style={{ minWidth: 80 }}>{posDe(h)}</span>
                      <span style={{ fontWeight: 500 }}>{h.serie}</span>
                      {n > 0 && <span className="lm-body-small muted">· con {n} {n === 1 ? "activo montado" : "activos montados"}</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>
      {confirmar && P && (
        <Dialog large title="¿Registrar el desmontaje?" onClose={() => setConfirmar(false)}
          message={`${textoFecha(cab.iso)} · ${t.nombreAlmacen(cab.almacen)} · del ${minus(P.categoria)} ${P.serie}${marcados.size > 1 ? ` · ${marcados.size} activos` : ""}`}
          footer={<><Button variant="outlined" onClick={() => setConfirmar(false)}>Cancelar</Button><Button onClick={registrar}>Registrar</Button></>}>
          <TablaAntesDespues filas={filas} />
        </Dialog>
      )}
    </>
  );
}
