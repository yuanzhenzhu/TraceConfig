"use client";

// HU-M04 · Intercambio entre unidades y HU-M05 · Intercambio dentro de la unidad, con el mismo diseño que HU-M03:
// datos en una fila (con la línea de tiempo del km de cada unidad), dos árboles lado a lado con casillas
// (un activo y, uno a uno, sus hijos y nietos), Rotar en ejes y bogies de los dos lados, y Ahora | Después.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner, Breadcrumb, Button, ButtonToggle, Dialog, EmptyState, Field, Icon, Loading, SearchInput, useSnackbar } from "@/components/ds";
import { TablaAntesDespues } from "./detalle";
import { LineaKm } from "./linea-km";
import { Panel, PanelUnidad } from "./paneles";
import type { SeleccionUnidad } from "./tablas";
import { SEP } from "@/lib/datos";
import { TIPOS, ahoraIso, descendientes, formatoKm, planIntercambioUU, textoFecha, useMovimientos, useTextos, type ActivoM, type PuntoKm } from "@/lib/movimientos";
import type { Nodo } from "@/lib/model";
import { useStore } from "@/lib/store";

const ROTABLES = ["Eje", "Bogie"];

/** Huecos por debajo de una posición que estaban ocupados y quedan vacíos. */
function vacios(raiz: Nodo | undefined, unidad: string, hueco: string | undefined, antes: Record<string, ActivoM>, despues: Record<string, ActivoM>) {
  const out = new Set<string>();
  if (!raiz || !hueco) return out;
  const ocupado = (estado: Record<string, ActivoM>, h: string) => Object.values(estado).some((a) => a.lugar.tipo === "unidad" && a.lugar.unidad === unidad && a.lugar.hueco === h);
  const ir = (n: Nodo, ruta: string) => {
    if (ruta.startsWith(hueco + SEP) && ocupado(antes, ruta) && !ocupado(despues, ruta)) out.add(ruta);
    n.hijos.forEach((h) => ir(h, ruta ? `${ruta}${SEP}${h.nombre}` : h.nombre));
  };
  ir(raiz, "");
  return out;
}

export function IntercambioUnidades({ misma }: { misma: boolean }) {
  const store = useStore();
  const mov = useMovimientos();
  const t = useTextos();
  const snack = useSnackbar();
  const router = useRouter();
  const titulo = misma ? "Intercambio dentro de la unidad" : "Intercambio entre unidades";

  const ahora = ahoraIso();
  const [fecha, setFecha] = useState(ahora.slice(0, 10));
  const [hora, setHora] = useState(ahora.slice(11, 16));
  const [flota, setFlota] = useState(["", ""]);
  const [unidad, setUnidad] = useState(["", ""]);
  const [km, setKm] = useState(["", ""]);
  const [sel, setSel] = useState<SeleccionUnidad[]>([null, null]);
  const [rot, setRot] = useState([false, false]);
  const [busca, setBusca] = useState(["", ""]);
  const [vista, setVista] = useState<"antes" | "despues">("antes");
  const [intentado, setIntentado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [descartar, setDescartar] = useState(false);
  const set = <T,>(arr: T[], i: number, v: T) => arr.map((x, j) => (j === i ? v : x));

  const iso = `${fecha}T${hora}`;
  const flotasConUnidades = store.flotas.filter((f) => mov.unidades.some((u) => u.flotaId === f.id));
  const lados = misma ? [0] : [0, 1]; // lados con datos de unidad propios
  const uDe = (i: number) => (misma ? unidad[0] : unidad[i]);
  const info = (i: number) => mov.unidades.find((u) => u.serie === uDe(i));
  const act = (i: number) => (sel[i] ? mov.activos[sel[i]!.padre] : undefined);
  const [A, B] = [act(0), act(1)];

  // Km de cada unidad: registros cercanos y validación (igual o mayor que el anterior e igual o menor que el siguiente)
  const kmInfo = (i: number) => {
    const u = uDe(i);
    const l: PuntoKm[] = u ? mov.historialKm(u) : [];
    const previos = l.filter((p) => p.fecha <= iso), posterior = l.find((p) => p.fecha > iso);
    const n = km[i] === "" ? null : Number(km[i]);
    const r = u ? mov.rangoKm(u, iso) : {};
    const error = n === null ? "Indica el km"
      : r.antes && n < r.antes.km ? `Igual o mayor que ${formatoKm(r.antes.km)} (${textoFecha(r.antes.fecha).slice(0, 10)})`
        : r.despues && n > r.despues.km ? `Igual o menor que ${formatoKm(r.despues.km)} (${textoFecha(r.despues.fecha).slice(0, 10)})` : "";
    return { previos: previos.slice(posterior ? -1 : -2), posterior, n, error };
  };
  const errFecha = !fecha || !hora ? "Indica la fecha y la hora" : iso > ahoraIso() ? "La fecha no puede ser futura" : "";
  const errUnidades = !misma && unidad[0] && unidad[0] === unidad[1] ? "Elige dos unidades distintas (para la misma, usa Intercambio dentro de la unidad)" : "";
  const cabeceraOk = !errFecha && !errUnidades && lados.every((i) => uDe(i) && !kmInfo(i).error);

  // Qué se puede marcar en cada árbol: misma categoría que lo marcado en el otro, y en la misma unidad, nada de la otra rama
  const elegible = (i: number) => (a: ActivoM) => {
    const otro = act(1 - i);
    if (!otro) return null;
    if (a.categoria !== otro.categoria) return `Solo ${otro.categoria.toLowerCase()}s, como el marcado en el otro lado`;
    if (misma && a.lugar.tipo === "unidad" && otro.lugar.tipo === "unidad" && (a.serie === otro.serie || a.lugar.hueco.startsWith(otro.lugar.hueco + SEP) || otro.lugar.hueco.startsWith(a.lugar.hueco + SEP)))
      return "Está en la rama marcada en el otro lado";
    return null;
  };
  const rotable = (i: number) => {
    const a = act(i);
    if (!a || !ROTABLES.includes(a.categoria)) return false;
    return descendientes(mov.activos, a).filter((d) => !sel[i]!.quedan.includes(d.a.serie)).length > 1;
  };
  const plan = A && B ? planIntercambioUU(mov.activos,
    { serie: A.serie, quedan: new Set(sel[0]!.quedan), rotar: rot[0] && rotable(0) },
    { serie: B.serie, quedan: new Set(sel[1]!.quedan), rotar: rot[1] && rotable(1) }) : null;
  const planOk = !!plan && !plan.error && plan.filas.length > 0;
  const valido = cabeceraOk && planOk;

  const despues = useMemo(() => {
    const d = { ...mov.activos };
    plan?.filas.forEach((f) => { d[f.serie] = { ...d[f.serie], lugar: f.despues }; });
    return d;
  }, [mov.activos, plan]);
  const vac = [0, 1].map((i) => {
    const a = act(i);
    return planOk && a?.lugar.tipo === "unidad" ? vacios(info(i)?.raiz, a.lugar.unidad, a.lugar.hueco, mov.activos, despues) : new Set<string>();
  });
  const hayDatos = !!(flota[0] || unidad[0] || km[0] || sel[0] || sel[1]);

  const elegir = (i: number) => (s: SeleccionUnidad) => { setSel((x) => set(x, i, s)); setRot((x) => set(x, i, false)); setVista("antes"); };
  const registrar = () => {
    if (!plan) return;
    const m = mov.registrar({
      tipo: misma ? TIPOS.intercambioMU : TIPOS.intercambioUU, fecha: iso, almacenes: [], filas: plan.filas,
      registros: lados.map((i) => ({ unidad: uDe(i), km: kmInfo(i).n })),
    });
    setConfirmar(false); setVista("antes"); setSel([null, null]); setRot([false, false]); setBusca(["", ""]); setIntentado(false);
    snack(`Movimiento ${m.id} registrado`, { label: "Ver en el historial", onClick: () => router.push("/movimientos") });
  };

  if (!mov.listo) return <main className="lm-page"><Loading text="Cargando unidades" /></main>;

  const subtitulo = (i: number) => {
    const a = act(i);
    if (vista === "despues") {
      const otro = act(1 - i);
      return otro && a?.lugar.tipo === "unidad" ? <>En {a.lugar.hueco} queda el <strong>{otro.categoria.toLowerCase()} {otro.serie}</strong>{vac[i].size ? ` · ${vac[i].size} huecos quedan vacíos` : ""}</> : "";
    }
    if (!a) return i === 1 && A ? `Marca un ${A.categoria.toLowerCase()} para intercambiar` : "Marca el activo; sus activos montados se marcan con él";
    const d = descendientes(mov.activos, a), n = d.filter((x) => !sel[i]!.quedan.includes(x.a.serie)).length;
    return <>Marcado: <strong>{a.categoria.toLowerCase()} {a.serie}</strong>{d.length ? (n === d.length ? ` con sus ${d.length} activos montados` : n ? ` con ${n} de sus ${d.length} activos montados` : " sin sus activos montados") : ""}{rot[i] && rotable(i) ? " · rotado 180°" : ""}</>;
  };

  const panel = (i: number) => {
    const u = uDe(i), inf = info(i);
    const titulo = `${misma ? `Posición ${i + 1} · ` : ""}Unidad ${u || ""} · ${vista === "despues" ? "Después" : "Ahora"}`;
    return (
      <Panel titulo={titulo} subtitulo={subtitulo(i)}
        accion={inf && vista === "antes" ? <SearchInput label={`Buscar en la unidad ${u} por nº de serie`} placeholder="Nº de serie" value={busca[i]} onChange={(v) => setBusca((x) => set(x, i, v))} /> : undefined}>
        {!inf ? <EmptyState icon="train" title="Elige una unidad" text="Indica la flota y la unidad arriba" /> : (
          <>
            <div hidden={vista === "despues" && planOk}>
              <PanelUnidad key={`${i}-${u}`} raiz={inf.raiz} unidad={u} activos={mov.activos} sel={sel[i]} onSel={elegir(i)} busca={busca[i]} elegible={elegible(i)} alto={400} />
              {rotable(i) && (
                <div className="row gap-10" style={{ padding: "var(--lm-space-10) var(--lm-space-15)", borderTop: "1px solid var(--lm-sys-outline-variant)" }}>
                  <span className="grow lm-body-small muted">Rotar el {act(i)!.categoria.toLowerCase()} {act(i)!.serie} (180°): sus activos montados cambian de lado</span>
                  <Button variant={rot[i] ? "tonal" : "text"} small onClick={() => { setRot((x) => set(x, i, !x[i])); }}>{rot[i] ? "Deshacer rotación" : "Rotar"}</Button>
                </div>
              )}
            </div>
            {vista === "despues" && planOk && (
              <PanelUnidad key={`d${i}-${u}`} raiz={inf.raiz} unidad={u} activos={despues} sel={null} onSel={() => {}} busca="" soloLectura alto={400}
                marcas={Object.fromEntries(plan!.filas.filter((f) => f.despues.tipo === "unidad" && f.despues.unidad === u && act(i)?.lugar.tipo === "unidad" && (f.despues.hueco === (act(i)!.lugar as { hueco: string }).hueco || f.despues.hueco.startsWith((act(i)!.lugar as { hueco: string }).hueco + SEP))).map((f) => [f.serie, "Entra" as const]))}
                vacios={vac[i]} abrirHasta={act(i)?.lugar.tipo === "unidad" ? (act(i)!.lugar as { hueco: string }).hueco : undefined} />
            )}
          </>
        )}
      </Panel>
    );
  };

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Movimientos", href: "/movimientos" }, { label: titulo }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>{titulo}</h1>
          <span className="lm-body-medium muted">{misma ? "Cambia de posición dos activos de la misma categoría dentro de una unidad." : "Cambia un activo de una unidad por otro de la misma categoría de otra unidad."}</span>
        </div>
        <div className="lm-header__actions">
          <Button variant="outlined" onClick={() => (hayDatos ? setDescartar(true) : router.push("/movimientos"))}>Cancelar</Button>
          <Button icon="check" disabled={!valido} onClick={() => { setIntentado(true); if (valido) setConfirmar(true); }}>Registrar movimiento</Button>
        </div>
      </div>

      <div className="stack gap-20">
        <section className="lm-surface lm-surface--p16 stack gap-10" aria-label="Cuándo y dónde">
          <div className="row gap-15 wrap" style={{ alignItems: "flex-start" }}>
            <Field label="Fecha" required htmlFor="fecha" error={errFecha} style={{ width: 160 }}>
              <input id="fecha" type="date" className="lm-input lm-input--dense" value={fecha} max={ahora.slice(0, 10)} onChange={(e) => setFecha(e.target.value)} />
            </Field>
            <Field label="Hora" required htmlFor="hora" style={{ width: 110 }}>
              <input id="hora" type="time" className="lm-input lm-input--dense" value={hora} onChange={(e) => setHora(e.target.value)} />
            </Field>
            {lados.map((i) => {
              const k = kmInfo(i);
              const suf = misma ? "" : ` ${i + 1}`;
              return (
                <div key={i} className="row gap-15" style={{ alignItems: "flex-start", ...(i === 1 ? { paddingLeft: "var(--lm-space-15)", borderLeft: "1px solid var(--lm-sys-outline-variant)" } : {}) }}>
                  <Field label={`Flota${suf}`} required htmlFor={`flota${i}`} error={intentado && !flota[i] ? "Elige la flota" : ""} style={{ width: 170 }}>
                    <select id={`flota${i}`} className="lm-select lm-select--dense" value={flota[i]} onChange={(e) => { setFlota((x) => set(x, i, e.target.value)); setUnidad((x) => set(x, i, "")); setSel(misma ? [null, null] : (x) => set(x, i, null)); }}>
                      <option value="">Elige</option>
                      {flotasConUnidades.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                    </select>
                  </Field>
                  <Field label={`Unidad${suf}`} required htmlFor={`unidad${i}`} error={i === 1 ? errUnidades : intentado && !unidad[i] ? "Elige la unidad" : ""} style={{ width: 110 }}>
                    <select id={`unidad${i}`} className="lm-select lm-select--dense" value={unidad[i]} disabled={!flota[i]} onChange={(e) => { setUnidad((x) => set(x, i, e.target.value)); setSel(misma ? [null, null] : (x) => set(x, i, null)); }}>
                      <option value="">Elige</option>
                      {mov.unidades.filter((u) => u.flotaId === flota[i]).map((u) => <option key={u.serie} value={u.serie}>{u.serie}</option>)}
                    </select>
                  </Field>
                  <Field label={`Km${suf}`} required htmlFor={`km${i}`} error={(intentado || km[i]) && uDe(i) ? k.error : ""} style={{ width: 140 }}>
                    <input id={`km${i}`} className="lm-input lm-input--dense" inputMode="numeric" value={km[i]} disabled={!uDe(i)} onChange={(e) => setKm((x) => set(x, i, e.target.value.replace(/[^\d]/g, "")))} />
                  </Field>
                </div>
              );
            })}
          </div>
          {fecha && hora && lados.filter((i) => uDe(i)).map((i) => {
            const k = kmInfo(i);
            return (
              <div key={i} className="row gap-20" style={{ alignItems: "flex-start", paddingTop: "var(--lm-space-5)" }}>
                <span className="lm-label-medium muted" style={{ width: 110 }}>KM DE LA UNIDAD {uDe(i)}</span>
                <div className="grow"><LineaKm previos={k.previos} posterior={k.posterior} fechaNueva={iso} kmNuevo={k.n} error={!!km[i] && !!k.error} /></div>
              </div>
            );
          })}
        </section>

        <div className="row gap-15">
          <ButtonToggle label="Qué se muestra" value={vista} onChange={(v) => { if (v === "antes" || planOk) setVista(v); }}
            options={[{ value: "antes", label: "Ahora" }, { value: "despues", label: "Después" }]} />
          <span className="lm-body-small muted">
            {vista === "despues" ? "Así quedan las dos posiciones con este intercambio. Vuelve a Ahora para cambiar la selección."
              : planOk ? "Pulsa Después para ver cómo quedan las dos posiciones." : `Marca un activo en cada árbol${misma ? " (en ramas distintas)" : ""}; después podrás ver cómo queda.`}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)", gap: "var(--lm-space-15)", alignItems: "start" }}>
          {panel(0)}
          <span className="row" aria-hidden="true" style={{ alignSelf: "center", color: "var(--lm-sys-on-surface-variant)" }}><Icon name="swap_vert" /></span>
          {panel(1)}
        </div>

        {plan?.error && <Banner type="error" title={plan.error} />}
        {[0, 1].map((i) => vac[i].size > 0 && (
          <Banner key={i} type="attention" title={`${vac[i].size === 1 ? "Queda 1 hueco vacío" : `Quedan ${vac[i].size} huecos vacíos`} en la unidad ${uDe(i)}`}>
            {[...vac[i]].join(" · ")}. Podrás montar activos en ellos después con Montaje.
          </Banner>
        ))}
      </div>

      {confirmar && plan && (
        <Dialog large title="¿Registrar el intercambio?" onClose={() => setConfirmar(false)}
          message={`${textoFecha(iso)} · ${lados.map((i) => `Unidad ${uDe(i)} (${t.flotaDeUnidad(uDe(i))}) · ${formatoKm(kmInfo(i).n)} km`).join(" · ")}`}
          footer={<>
            <Button variant="outlined" onClick={() => setConfirmar(false)}>Cancelar</Button>
            <Button onClick={registrar}>Registrar</Button>
          </>}>
          <TablaAntesDespues filas={plan.filas} />
        </Dialog>
      )}
      {descartar && (
        <Dialog title="¿Descartar el movimiento?" message="Se perderán los datos que has introducido." onClose={() => setDescartar(false)}
          footer={<>
            <Button variant="outlined" onClick={() => setDescartar(false)}>Cancelar</Button>
            <Button onClick={() => router.push("/movimientos")}>Descartar</Button>
          </>} />
      )}
    </main>
  );
}
