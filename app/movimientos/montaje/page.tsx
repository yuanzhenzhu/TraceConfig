"use client";

// Montaje: HU-M10 (en una unidad) y HU-M07 (en un almacén), en una sola entrada del menú.
// - En una unidad: se elige un hueco libre en el árbol y, a la derecha, un activo suelto del almacén de esa categoría
//   (entra con lo que lleva montado).
// - En un almacén: se elige el padre y, para cada posición libre, el activo suelto que se monta. Varios = movimientos seguidos.

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Banner, Button, Dialog, EmptyState, Field, Loading, SearchInput, useSnackbar } from "@/components/ds";
import { AhoraDespues, CabeceraPantalla, SelectorDonde } from "@/components/movimientos/pantalla";
import { TablaAntesDespues } from "@/components/movimientos/detalle";
import { useCabecera } from "@/components/movimientos/cabecera";
import { Panel, PanelAlmacen, PanelUnidad } from "@/components/movimientos/paneles";
import { SEP } from "@/lib/datos";
import { TIPOS, descendientes, formatoKm, nuevoGrupo, planMontajeAlmacen, planMontajeUnidad, posicionesDe, textoFecha, useMovimientos, useTextos, type FilaMov } from "@/lib/movimientos";
import { useStore } from "@/lib/store";

type Modo = "unidad" | "almacen";

export default function Montaje() {
  const [modo, setModo] = useState<Modo>("unidad");
  const selector = (
    <SelectorDonde valor={modo} onChange={setModo} opciones={[{ value: "unidad", label: "En una unidad" }, { value: "almacen", label: "En un almacén" }]}
      texto={modo === "unidad" ? "Monta en un hueco libre de una unidad un activo que está en un almacén." : "Monta activos sueltos en otro activo del mismo almacén (p. ej. ruedas en un eje)."} />
  );
  return <main className="lm-page">{modo === "unidad" ? <EnUnidad key="u" selector={selector} /> : <EnAlmacen key="a" selector={selector} />}</main>;
}

/* ---------- HU-M10 · Montaje en unidad ---------- */
function EnUnidad({ selector }: { selector: ReactNode }) {
  const mov = useMovimientos();
  const t = useTextos();
  const snack = useSnackbar();
  const router = useRouter();
  const [hueco, setHueco] = useState<{ ruta: string; categoria: string } | null>(null);
  const [selA, setSelA] = useState("");
  const [busca, setBusca] = useState("");
  const [vista, setVista] = useState<"antes" | "despues">("antes");
  const [confirmar, setConfirmar] = useState(false);
  const cab = useCabecera({ conUnidad: true, conAlmacen: true, etiquetaAlmacen: "Almacén de origen", onCambio: () => { setHueco(null); setSelA(""); setVista("antes"); } });

  const huecos = useMemo(() => {
    const s = new Set<string>();
    if (cab.info) { const ir = (n: typeof cab.info.raiz, ruta: string) => { if (ruta) s.add(ruta); n.hijos.forEach((h) => ir(h, ruta ? `${ruta}${SEP}${h.nombre}` : h.nombre)); }; ir(cab.info.raiz, ""); }
    return s;
  }, [cab.info]);
  const candidatos = useMemo(() => Object.values(mov.activos)
    .filter((a) => hueco && a.lugar.tipo === "almacen" && a.lugar.almacenId === cab.almacen && !a.lugar.padre && a.categoria === hueco.categoria)
    .filter((a) => !busca || a.serie.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => a.serie.localeCompare(b.serie)), [mov.activos, hueco, cab.almacen, busca]);
  const plan = hueco && selA ? planMontajeUnidad(mov.activos, cab.unidad, hueco.ruta, selA, huecos) : null;
  const planOk = !!plan && !plan.error && plan.filas.length > 0;
  const despues = useMemo(() => { const d = { ...mov.activos }; plan?.filas.forEach((f) => { d[f.serie] = { ...d[f.serie], lugar: f.despues }; }); return d; }, [mov.activos, plan]);
  const valido = cab.ok && planOk;

  const registrar = () => {
    if (!plan) return;
    const m = mov.registrar({ tipo: TIPOS.montajeUnidad, fecha: cab.iso, almacenes: [cab.almacen], filas: plan.filas, registros: [{ unidad: cab.unidad, km: cab.kmNum }] });
    setConfirmar(false); setHueco(null); setSelA(""); setVista("antes");
    snack(`Movimiento ${m.id} registrado`, { label: "Ver en el historial", onClick: () => router.push("/movimientos") });
  };

  if (!mov.listo) return <Loading text="Cargando unidades y almacenes" />;
  const B = selA ? mov.activos[selA] : undefined;
  return (
    <>
      <CabeceraPantalla miga="Montaje" selector={selector} titulo="Montaje en unidad" texto="Elige un hueco libre de la unidad y el activo del almacén que se monta en él." valido={valido} hayDatos={cab.hayDatos || !!hueco}
        onRegistrar={() => { cab.setIntentado(true); if (valido) setConfirmar(true); }} />
      <div className="stack gap-20">
        {cab.bloque}
        <AhoraDespues vista={vista} setVista={setVista} ok={planOk} texto="Elige un hueco libre y el activo que se monta; después podrás ver cómo queda." />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "var(--lm-space-15)", alignItems: "start" }}>
          <Panel titulo={`Unidad ${cab.unidad || ""} · ${vista === "despues" ? "Después" : "Ahora"}`}
            subtitulo={vista === "despues" ? <>En {hueco?.ruta} queda montado el <strong>{B?.categoria.replace(/^./, (c) => c.toLowerCase())} {B?.serie}</strong></> : hueco ? <>Hueco elegido: <strong>{hueco.ruta}</strong> ({hueco.categoria})</> : "Elige un hueco libre (su padre tiene que estar ocupado)"}>
            {!cab.info ? <EmptyState icon="train" title="Elige una unidad" text="Indica la flota y la unidad arriba" /> : (
              <>
                <div hidden={vista === "despues" && planOk}>
                  <PanelUnidad key={cab.unidad} raiz={cab.info.raiz} unidad={cab.unidad} activos={mov.activos} sel={null} onSel={() => {}} busca="" alto={420}
                    hueco={{ sel: hueco?.ruta ?? "", onSel: (ruta, categoria) => { setHueco({ ruta, categoria }); setSelA(""); } }} />
                </div>
                {vista === "despues" && planOk && (
                  <PanelUnidad key={`d-${cab.unidad}`} raiz={cab.info.raiz} unidad={cab.unidad} activos={despues} sel={null} onSel={() => {}} busca="" soloLectura alto={420}
                    marcas={Object.fromEntries(plan!.filas.map((f) => [f.serie, "Entra" as const]))} abrirHasta={hueco!.ruta} />
                )}
              </>
            )}
          </Panel>
          <Panel titulo={`${cab.almacen ? t.nombreAlmacen(cab.almacen) : "Almacén"} · ${vista === "despues" ? "Después" : "Ahora"}`}
            subtitulo={vista === "despues" ? `El ${B?.categoria.replace(/^./, (c) => c.toLowerCase())} ${B?.serie} sale del almacén` : !hueco ? "Elige antes el hueco" : B ? <>Elegido: <strong>{B.categoria.replace(/^./, (c) => c.toLowerCase())} {B.serie}</strong>{descendientes(mov.activos, B).length ? ` con sus ${descendientes(mov.activos, B).length} activos montados` : ""}</> : `${hueco.categoria}s sueltos`}
            accion={cab.almacen && hueco && vista === "antes" ? <SearchInput label="Buscar en el almacén por nº de serie" placeholder="Nº de serie" value={busca} onChange={setBusca} /> : undefined}>
            {!cab.almacen ? <EmptyState icon="domain" title="Elige el almacén de origen" text="Indícalo arriba" />
              : !hueco ? <EmptyState icon="arrow_left" title="Elige un hueco libre" text="Aquí aparecerán los activos sueltos de esa categoría" />
                : vista === "despues" ? <EmptyState icon="check" title={`Sale ${B?.categoria.replace(/^./, (c) => c.toLowerCase())} ${B?.serie}`} text="Queda montado en la unidad" />
                  : !candidatos.length ? <EmptyState icon={busca ? "search_off" : "domain"} title={busca ? "No hay resultados" : `No hay ${hueco.categoria.replace(/^./, (c) => c.toLowerCase())}s sueltos`} text={busca ? "Ningún activo coincide" : "Elige otro almacén"} />
                    : <PanelAlmacen candidatos={candidatos} activos={mov.activos} sel={selA} onSel={setSelA} conHijos sinRotar rotado={false} onRotar={() => {}} alto={420} />}
          </Panel>
        </div>
        {plan?.error && <Banner type="error" title={plan.error} />}
      </div>
      {confirmar && plan && (
        <Dialog large title="¿Registrar el montaje?" onClose={() => setConfirmar(false)}
          message={`${textoFecha(cab.iso)} · Unidad ${cab.unidad} (${t.flotaDeUnidad(cab.unidad)}) · ${formatoKm(cab.kmNum)} km · desde ${t.nombreAlmacen(cab.almacen)}`}
          footer={<><Button variant="outlined" onClick={() => setConfirmar(false)}>Cancelar</Button><Button onClick={registrar}>Registrar</Button></>}>
          <TablaAntesDespues filas={plan.filas} />
        </Dialog>
      )}
    </>
  );
}

/* ---------- HU-M07 · Montaje en almacén ---------- */
function EnAlmacen({ selector }: { selector: ReactNode }) {
  const store = useStore();
  const mov = useMovimientos();
  const t = useTextos();
  const snack = useSnackbar();
  const router = useRouter();
  const [padre, setPadre] = useState("");
  const [asig, setAsig] = useState<Record<string, string>>({}); // posición -> nº de serie
  const [busca, setBusca] = useState("");
  const [vista, setVista] = useState<"antes" | "despues">("antes");
  const [confirmar, setConfirmar] = useState(false);
  const cab = useCabecera({ conUnidad: false, conAlmacen: true, onCambio: () => { setPadre(""); setAsig({}); setVista("antes"); } });

  const raices = useMemo(() => store.estructuras.map((e) => e.raiz), [store.estructuras]);
  const libres = (serie: string) => {
    const p = mov.activos[serie];
    const ocupadas = new Set(Object.values(mov.activos).filter((x) => x.lugar.tipo === "almacen" && x.lugar.padre === serie).map((x) => (x.lugar as { enHueco?: string }).enHueco));
    return posicionesDe(raices, p.categoria).filter((x) => !ocupadas.has(x.nombre));
  };
  const padres = useMemo(() => Object.values(mov.activos)
    .filter((a) => a.lugar.tipo === "almacen" && a.lugar.almacenId === cab.almacen && libres(a.serie).length > 0)
    .filter((a) => !busca || a.serie.toLowerCase().includes(busca.toLowerCase()))
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.serie.localeCompare(b.serie)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [mov.activos, cab.almacen, busca, raices]);
  const sueltos = (categoria: string) => Object.values(mov.activos)
    .filter((a) => a.lugar.tipo === "almacen" && a.lugar.almacenId === cab.almacen && !a.lugar.padre && a.categoria === categoria && a.serie !== padre)
    .sort((a, b) => a.serie.localeCompare(b.serie));

  const elegidas = Object.entries(asig).filter(([, s]) => s);
  const planes = elegidas.map(([pos, s]) => planMontajeAlmacen(mov.activos, padre, pos, s));
  const filas: FilaMov[] = planes.flatMap((p) => p.filas);
  const error = planes.find((p) => p.error)?.error;
  const planOk = !!padre && filas.length > 0 && !error;
  const despues = useMemo(() => { const d = { ...mov.activos }; filas.forEach((f) => { d[f.serie] = { ...d[f.serie], lugar: f.despues }; }); return d; }, [mov.activos, filas]);
  const valido = cab.ok && planOk;
  const P = padre ? mov.activos[padre] : undefined;

  const registrar = () => {
    const grupo = elegidas.length > 1 ? nuevoGrupo() : undefined;
    const ids = planes.map((p) => mov.registrar({ tipo: TIPOS.montajeAlmacen, fecha: cab.iso, almacenes: [cab.almacen], filas: p.filas, registros: [], grupo }).id);
    setConfirmar(false); setPadre(""); setAsig({}); setVista("antes");
    snack(ids.length > 1 ? `${ids.length} movimientos registrados: ${ids.join(" y ")}` : `Movimiento ${ids[0]} registrado`, { label: "Ver en el historial", onClick: () => router.push("/movimientos") });
  };

  if (!mov.listo) return <Loading text="Cargando almacenes" />;
  return (
    <>
      <CabeceraPantalla miga="Montaje" selector={selector} titulo="Montaje en almacén" texto="Elige el activo padre y, para cada posición libre, el activo suelto que se monta." valido={valido} hayDatos={cab.hayDatos || !!padre}
        onRegistrar={() => { cab.setIntentado(true); if (valido) setConfirmar(true); }} />
      <div className="stack gap-20">
        {cab.bloque}
        <AhoraDespues vista={vista} setVista={setVista} ok={planOk} texto="Elige el padre y al menos un activo para montar; después podrás ver cómo queda." />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "var(--lm-space-15)", alignItems: "start" }}>
          <Panel titulo={`${cab.almacen ? t.nombreAlmacen(cab.almacen) : "Almacén"} · ${vista === "despues" ? "Después" : "Ahora"}`}
            subtitulo={vista === "despues" ? <>Así queda el <strong>{P?.categoria.replace(/^./, (c) => c.toLowerCase())} {P?.serie}</strong></> : P ? <>Padre: <strong>{P.categoria.replace(/^./, (c) => c.toLowerCase())} {P.serie}</strong></> : "Elige el activo en el que se monta (con posiciones libres)"}
            accion={cab.almacen && vista === "antes" ? <SearchInput label="Buscar el padre por nº de serie" placeholder="Nº de serie" value={busca} onChange={setBusca} /> : undefined}>
            {!cab.almacen ? <EmptyState icon="domain" title="Elige un almacén" text="Indícalo arriba" />
              : vista === "despues" && P ? <PanelAlmacen candidatos={[despues[P.serie]]} activos={despues} sel="" onSel={() => {}} conHijos sinRotar rotado={false} onRotar={() => {}} soloLectura alto={420} marcas={{ [P.serie]: "Entra" }} />
                : !padres.length ? <EmptyState icon={busca ? "search_off" : "domain"} title={busca ? "No hay resultados" : "No hay activos con posiciones libres"} text="Elige otro almacén" />
                  : <PanelAlmacen candidatos={padres} activos={mov.activos} sel={padre} onSel={(s) => { setPadre(s); setAsig({}); }} conHijos sinRotar rotado={false} onRotar={() => {}} alto={420}
                      detalle={(a) => `Libres: ${libres(a.serie).map((x) => x.nombre).join(", ")}`} />}
          </Panel>
          <Panel titulo="Activos que se montan" subtitulo={P ? `Una fila por posición libre del ${P.categoria.replace(/^./, (c) => c.toLowerCase())} ${P.serie}. Varios se registran como movimientos seguidos.` : "Elige antes el padre"}>
            {!P ? <EmptyState icon="arrow_left" title="Elige el padre" text="Aquí aparecerán sus posiciones libres" /> : (
              <div className="stack gap-15" style={{ padding: "var(--lm-space-15)" }}>
                {libres(P.serie).map((pos) => {
                  const ops = sueltos(pos.categoria).filter((a) => !Object.entries(asig).some(([p, s]) => p !== pos.nombre && s === a.serie));
                  return (
                    <Field key={pos.nombre} label={`${pos.nombre} (${pos.categoria})`} htmlFor={`pos-${pos.nombre}`} support={ops.length ? undefined : `No hay ${pos.categoria.replace(/^./, (c) => c.toLowerCase())}s sueltos en el almacén`}>
                      <select id={`pos-${pos.nombre}`} className="lm-select lm-select--dense" value={asig[pos.nombre] ?? ""} disabled={vista === "despues" || !ops.length}
                        onChange={(e) => setAsig((x) => ({ ...x, [pos.nombre]: e.target.value }))}>
                        <option value="">Sin montar</option>
                        {ops.map((a) => <option key={a.serie} value={a.serie}>{a.serie}{a.km != null ? ` · ${formatoKm(a.km)} km` : ""}</option>)}
                      </select>
                    </Field>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
        {error && <Banner type="error" title={error} />}
      </div>
      {confirmar && (
        <Dialog large title={elegidas.length > 1 ? `¿Registrar ${elegidas.length} montajes seguidos?` : "¿Registrar el montaje?"} onClose={() => setConfirmar(false)}
          message={`${textoFecha(cab.iso)} · ${t.nombreAlmacen(cab.almacen)} · en el ${P?.categoria.replace(/^./, (c) => c.toLowerCase())} ${P?.serie}${elegidas.length > 1 ? " · un movimiento por activo, enlazados" : ""}`}
          footer={<><Button variant="outlined" onClick={() => setConfirmar(false)}>Cancelar</Button><Button onClick={registrar}>Registrar</Button></>}>
          <TablaAntesDespues filas={filas} />
        </Dialog>
      )}
    </>
  );
}

