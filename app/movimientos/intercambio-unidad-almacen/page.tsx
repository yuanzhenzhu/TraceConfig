"use client";

// HU-M03 · Intercambio entre unidad y almacén. Patrón común de registro (HU-M00 §2):
// 1 Cuándo y dónde · 2 Qué activos · 3 Resultado (Antes → Después en vivo) · Registrar movimiento con una sola confirmación.
// Al registrar se queda en la misma pantalla, con fecha, hora, unidad y almacén ya rellenos, para registrar otro seguido.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner, Breadcrumb, Button, ButtonToggle, Dialog, EmptyState, Field, Icon, Loading, SearchInput, useSnackbar } from "@/components/ds";
import { Panel, PanelAlmacen, PanelUnidad } from "@/components/movimientos/paneles";
import { ResultadoIntercambio } from "@/components/movimientos/resultado";
import { LineaKm } from "@/components/movimientos/linea-km";
import { useDrivers } from "@/components/movimientos/drivers";
import type { SeleccionUnidad } from "@/components/movimientos/tablas";
import { art,
  TIPOS, ahoraIso, descendientes, formatoKm, planIntercambioUA, textoFecha, useMovimientos, useTextos,
} from "@/lib/movimientos";
import { useStore } from "@/lib/store";
import { SEP } from "@/lib/datos";
import type { Nodo } from "@/lib/model";

// En este intercambio solo se rotan ejes (en el almacén, antes de montarlo)

export default function IntercambioUnidadAlmacen() {
  const store = useStore();
  const mov = useMovimientos();
  const t = useTextos();
  const snack = useSnackbar();
  const router = useRouter();

  const ahora = ahoraIso();
  const [fecha, setFecha] = useState(ahora.slice(0, 10));
  const [hora, setHora] = useState(ahora.slice(11, 16));
  const [flota, setFlota] = useState("");
  const [unidad, setUnidad] = useState("");
  const [km, setKm] = useState("");
  const [almacen, setAlmacen] = useState("");
  const [selU, setSelU] = useState<SeleccionUnidad>(null);
  const [selA, setSelA] = useState("");
  const [rotar, setRotar] = useState(false);
  const [vista, setVista] = useState<"antes" | "despues">("antes");
  const [buscaU, setBuscaU] = useState("");
  const [buscaA, setBuscaA] = useState("");
  const [intentado, setIntentado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [descartar, setDescartar] = useState(false);

  const flotasConUnidades = store.flotas.filter((f) => mov.unidades.some((u) => u.flotaId === f.id));
  const unidadesFlota = mov.unidades.filter((u) => u.flotaId === flota);
  const uInfo = mov.unidades.find((u) => u.serie === unidad);
  const iso = `${fecha}T${hora}`;
  const A = selU ? mov.activos[selU.padre] : undefined;
  const B = selA ? mov.activos[selA] : undefined;

  // Validaciones de "Cuándo y dónde"
  const rango = unidad && fecha && hora ? mov.rangoKm(unidad, iso) : {};
  // Registros de km cerca de la fecha: 1 anterior y 1 posterior; si no hay posterior, los 2 anteriores
  const cercanos = useMemo(() => {
    const l = unidad ? mov.historialKm(unidad) : [];
    const previos = l.filter((p) => p.fecha <= iso);
    const posterior = l.find((p) => p.fecha > iso);
    return { previos: previos.slice(posterior ? -1 : -2), posterior };
  }, [unidad, iso, mov]);
  const kmNum = km === "" ? null : Number(km);
  const errFecha = !fecha || !hora ? "Indica la fecha y la hora" : iso > ahoraIso() ? "La fecha no puede ser futura" : "";
  const errKm = kmNum === null ? "Indica el km" : !Number.isFinite(kmNum) || kmNum < 0 ? "El km tiene que ser un número"
    : rango.antes && kmNum < rango.antes.km ? `El km tiene que ser igual o mayor que ${formatoKm(rango.antes.km)} (registro del ${textoFecha(rango.antes.fecha).slice(0, 10)})`
      : rango.despues && kmNum > rango.despues.km ? `El km tiene que ser igual o menor que ${formatoKm(rango.despues.km)} (registro del ${textoFecha(rango.despues.fecha).slice(0, 10)})` : "";
  // Horas (motores) o ciclos (puertas) del activo que sale y del que entra
  const drv = useDrivers([A, B]);
  const errores = { fecha: errFecha, flota: flota ? "" : "Elige la flota", unidad: unidad ? "" : "Elige la unidad", km: errKm, almacen: almacen ? "" : "Elige el almacén" };
  const cabeceraOk = Object.values(errores).every((e) => !e);

  // Activos montados en el que sale: cuáles viajan con él y cuáles se quedan en la unidad
  const hijosA = useMemo(() => (A ? descendientes(mov.activos, A) : []), [A, mov.activos]);
  const quedan = useMemo(() => new Set(selU?.quedan ?? []), [selU]);
  const nViajan = hijosA.filter((d) => !quedan.has(d.a.serie)).length;
  // modo: todos viajan / ninguno viaja / solo una parte
  const modo: "todos" | "ninguno" | "parte" = !hijosA.length || nViajan === 0 ? "ninguno" : nViajan === hijosA.length ? "todos" : "parte";
  const modoHijos = modo !== "ninguno";
  // Candidatos del almacén: si viaja todo, los que tienen activos montados; si no viaja nada, los que no tienen;
  // si viaja una parte, los que no traen activos en las posiciones que se quedan ocupadas.
  const delAlmacen = useMemo(() => Object.values(mov.activos)
    .filter((a) => A && a.lugar.tipo === "almacen" && a.lugar.almacenId === almacen && a.categoria === A.categoria)
    .filter((a) => {
      const d = descendientes(mov.activos, a);
      if (modo === "todos") return d.length > 0;
      if (modo === "ninguno") return d.length === 0;
      // Una parte: solo los que encajan con lo que se queda (sin chocar y sin dejar activos sin su padre)
      return d.length > 0 && !planIntercambioUA(mov.activos, A!.serie, a.serie, quedan, false).error;
    })
    .filter((a) => !buscaA || a.serie.toLowerCase().includes(buscaA.toLowerCase()))
    .sort((a, b) => a.serie.localeCompare(b.serie)), [mov.activos, almacen, A, buscaA, modo, quedan]);

  const plan = A && B ? planIntercambioUA(mov.activos, A.serie, B.serie, quedan, modoHijos && rotar && B.categoria === "Eje") : null;
  // Huecos de la estructura por debajo del activo que sale (para avisar de los que quedan vacíos)
  const huecosPos = useMemo(() => {
    if (!uInfo || !A || A.lugar.tipo !== "unidad") return [];
    const base = A.lugar.hueco;
    const out: { rel: string; categoria: string }[] = [];
    const ir = (n: Nodo, ruta: string) => {
      if (ruta.startsWith(base + SEP)) out.push({ rel: ruta.slice(base.length + SEP.length), categoria: n.categoria });
      n.hijos.forEach((h) => ir(h, ruta ? `${ruta}${SEP}${h.nombre}` : h.nombre));
    };
    ir(uInfo.raiz, "");
    return out;
  }, [uInfo, A]);
  const valido = cabeceraOk && drv.ok && !!plan && !plan.error && plan.filas.length > 0;
  // Estado después (para "Ver cómo queda"): activos con el después de cada fila
  const despues = useMemo(() => {
    const d = { ...mov.activos };
    plan?.filas.forEach((f) => { d[f.serie] = { ...d[f.serie], lugar: f.despues }; });
    return d;
  }, [mov.activos, plan]);
  const almacenDespues = useMemo(() => !A ? [] : Object.values(despues)
    .filter((a) => a.lugar.tipo === "almacen" && a.lugar.almacenId === almacen && a.categoria === A.categoria && (a.serie === A.serie || (descendientes(despues, a).length > 0) === modoHijos))
    .sort((a, b) => (a.serie === A.serie ? -1 : b.serie === A.serie ? 1 : a.serie.localeCompare(b.serie))), [despues, almacen, A, modoHijos]);
  // Huecos de la unidad que quedan vacíos con este intercambio
  const vaciosRutas = useMemo(() => {
    if (!plan || plan.error || !A || A.lugar.tipo !== "unidad") return new Set<string>();
    const base = A.lugar.hueco;
    const ocupado = (estado: typeof despues, rel: string) => Object.values(estado).some((a) => a.lugar.tipo === "unidad" && a.lugar.unidad === unidad && a.lugar.hueco === `${base}${SEP}${rel}`);
    return new Set(huecosPos.filter((h) => ocupado(mov.activos, h.rel) && !ocupado(despues, h.rel)).map((h) => `${base}${SEP}${h.rel}`));
  }, [plan, A, huecosPos, mov.activos, despues, unidad]);
  const planOk = !!plan && !plan.error && plan.filas.length > 0;
  const hayDatos = !!(flota || unidad || km || almacen || selU || selA);

  const elegirUnidad = (s: SeleccionUnidad) => {
    if (!s || s.padre !== selU?.padre) drv.reset();
    if (!s || s.padre !== selU?.padre || s.quedan.join() !== selU?.quedan.join()) { setSelA(""); setRotar(false); }
    setSelU(s); setVista("antes");
  };
  const registrar = () => {
    if (!plan) return;
    const m = mov.registrar({
      tipo: TIPOS.intercambioUA, fecha: iso, almacenes: [almacen], filas: drv.aplicar(plan.filas),
      registros: [{ unidad, km: kmNum }],
    });
    setConfirmar(false); setVista("antes"); setSelU(null); setSelA(""); setRotar(false); drv.reset(); setIntentado(false); setBuscaU(""); setBuscaA("");
    snack(`Movimiento ${m.id} registrado`, { label: "Ver en el historial", onClick: () => router.push("/movimientos") });
  };

  if (!mov.listo) return <main className="lm-page"><Loading text="Cargando unidades y almacenes" /></main>;

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Movimientos", href: "/movimientos" }, { label: "Intercambio entre unidad y almacén" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Intercambio entre unidad y almacén</h1>
          <span className="lm-body-medium muted">Cambia un activo montado en una unidad por otro de la misma categoría que está en un almacén.</span>
        </div>
        <div className="lm-header__actions">
          <Button variant="outlined" onClick={() => (hayDatos ? setDescartar(true) : router.push("/movimientos"))}>Cancelar</Button>
          <Button icon="check" disabled={!valido} onClick={() => { setIntentado(true); if (valido) setConfirmar(true); }}>Registrar movimiento</Button>
        </div>
      </div>

      <div className="stack gap-20">
        {/* Cuándo y dónde: una fila de campos y, debajo, los registros de km cercanos en una línea */}
        <section className="lm-surface lm-surface--p16 stack gap-10" aria-label="Cuándo y dónde">
          <div className="row gap-15 wrap" style={{ alignItems: "flex-start" }}>
            <Field label="Fecha" required htmlFor="fecha" error={intentado || fecha ? errores.fecha : ""} style={{ width: 160 }}>
              <input id="fecha" type="date" className="lm-input lm-input--dense" value={fecha} max={ahora.slice(0, 10)} onChange={(e) => setFecha(e.target.value)} />
            </Field>
            <Field label="Hora" required htmlFor="hora" style={{ width: 110 }}>
              <input id="hora" type="time" className="lm-input lm-input--dense" value={hora} onChange={(e) => setHora(e.target.value)} />
            </Field>
            <Field label="Flota" required htmlFor="flota" error={intentado ? errores.flota : ""} style={{ width: 180 }}>
              <select id="flota" className="lm-select lm-select--dense" value={flota} onChange={(e) => { setFlota(e.target.value); setUnidad(""); elegirUnidad(null); }}>
                <option value="">Elige</option>
                {flotasConUnidades.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </Field>
            <Field label="Unidad" required htmlFor="unidad" error={intentado ? errores.unidad : ""} style={{ width: 110 }}>
              <select id="unidad" className="lm-select lm-select--dense" value={unidad} disabled={!flota} onChange={(e) => { setUnidad(e.target.value); elegirUnidad(null); }}>
                <option value="">Elige</option>
                {unidadesFlota.map((u) => <option key={u.serie} value={u.serie}>{u.serie}</option>)}
              </select>
            </Field>
            <Field label="Km" required htmlFor="km" error={(intentado || km) && unidad ? errores.km : ""} style={{ width: 150 }}>
              <input id="km" className="lm-input lm-input--dense" inputMode="numeric" value={km} disabled={!unidad} onChange={(e) => setKm(e.target.value.replace(/[^\d]/g, ""))} />
            </Field>
            <Field label="Almacén" required htmlFor="almacen" error={intentado ? errores.almacen : ""} style={{ width: 250 }}>
              <select id="almacen" className="lm-select lm-select--dense" value={almacen} onChange={(e) => { setAlmacen(e.target.value); setSelA(""); setRotar(false); }}>
                <option value="">Elige</option>
                {store.almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </Field>
          </div>
          {unidad && fecha && hora && (
            <div className="row gap-20" style={{ alignItems: "flex-start", paddingTop: "var(--lm-space-5)" }}>
              <span className="lm-label-medium muted" style={{ width: 110, paddingTop: 0 }}>KM DE LA UNIDAD {unidad}</span>
              <div className="grow">
                <LineaKm previos={cercanos.previos} posterior={cercanos.posterior} fechaNueva={iso} kmNuevo={kmNum} error={!!km && !!errores.km} />
              </div>
            </div>
          )}
        </section>

        {/* Ahora | Después, encima de los dos paneles */}
        <div className="row gap-15">
          <ButtonToggle label="Qué se muestra" value={vista} onChange={(v) => { if (v === "antes" || planOk) setVista(v); }}
            options={[{ value: "antes", label: "Ahora" }, { value: "despues", label: "Después" }]} />
          <span className="lm-body-small muted">
            {vista === "despues" ? "Así quedan la unidad y el almacén con este intercambio. Vuelve a Ahora para cambiar la selección."
              : planOk ? "Pulsa Después para ver cómo quedan la unidad y el almacén." : "Marca lo que sale de la unidad y elige lo que entra del almacén; después podrás ver cómo queda."}
          </span>
        </div>

        {/* Unidad y almacén, lado a lado */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)", gap: "var(--lm-space-15)", alignItems: "start" }}>
          <Panel titulo={`Unidad ${unidad || ""} · ${vista === "despues" ? "Después" : "Ahora"}`}
            subtitulo={vista === "despues" ? <>En {A?.lugar.tipo === "unidad" ? A.lugar.hueco : ""} queda <strong>{art(B?.categoria)} {B?.serie}</strong>{modoHijos ? " con sus activos montados" : ""}{vaciosRutas.size ? ` · ${vaciosRutas.size} huecos quedan vacíos` : ""}</> : A ? <>Marcado: <strong>{A.categoria.replace(/^./, (c) => c.toLowerCase())} {A.serie}</strong>{hijosA.length ? (modo === "todos" ? ` con sus ${hijosA.length} activos montados` : modo === "parte" ? ` con ${nViajan} de sus ${hijosA.length} activos montados (${hijosA.length - nViajan} se quedan en la unidad)` : " sin sus activos montados") : ""} · sale de la unidad</> : "Marca el activo que sale; sus activos montados se marcan con él"}
            accion={uInfo && vista === "antes" ? <SearchInput label="Buscar en la unidad por nº de serie" placeholder="Nº de serie" value={buscaU} onChange={setBuscaU} /> : undefined}>
            {!uInfo ? <EmptyState icon="train" title="Elige una unidad" text="Indica la flota y la unidad arriba" />
              : <>
                  {/* La selección se queda montada (oculta en Después) para no perder lo marcado ni lo desplegado al volver */}
                  <div hidden={vista === "despues" && !!plan}>
                    <PanelUnidad key={unidad} raiz={uInfo.raiz} unidad={unidad} activos={mov.activos} sel={selU} onSel={elegirUnidad} busca={buscaU}
                      marcas={A ? Object.fromEntries([[A.serie, "Sale" as const]]) : {}} />
                  </div>
                  {vista === "despues" && plan && (
                    <PanelUnidad key={`d-${unidad}`} raiz={uInfo.raiz} unidad={unidad} activos={despues} sel={null} onSel={() => {}} busca="" soloLectura
                      marcas={Object.fromEntries(plan.filas.filter((f) => f.despues.tipo === "unidad").map((f) => [f.serie, "Entra" as const]))}
                      vacios={vaciosRutas} abrirHasta={A?.lugar.tipo === "unidad" ? A.lugar.hueco : undefined} />
                  )}
                </>}
          </Panel>

          <span className="row" aria-hidden="true" style={{ alignSelf: "center", color: "var(--lm-sys-on-surface-variant)" }}><Icon name="swap_vert" /></span>

          <Panel titulo={`${almacen ? t.nombreAlmacen(almacen) : "Almacén"} · ${vista === "despues" ? "Después" : "Ahora"}`}
            subtitulo={vista === "despues" ? <>Queda <strong>{art(A?.categoria)} {A?.serie}</strong>{modoHijos ? " con sus activos montados" : ""}, que sale de la unidad</> : !A ? "Marca antes lo que sale de la unidad" : B ? <>Elegido: <strong>{B.categoria.replace(/^./, (c) => c.toLowerCase())} {B.serie}</strong>{rotar && modoHijos ? " rotado 180°" : ""} · entra en la unidad</> : modo === "todos" ? `Elige ${art(A.categoria, "un")} con activos montados` : modo === "parte" ? `Elige ${art(A.categoria, "un")} que encaje con lo que se queda en la unidad` : `Elige ${art(A.categoria, "un")} sin activos montados`}
            accion={almacen && A && vista === "antes" ? <SearchInput label="Buscar en el almacén por nº de serie" placeholder="Nº de serie" value={buscaA} onChange={setBuscaA} /> : undefined}>
            {!almacen ? <EmptyState icon="domain" title="Elige un almacén" text="Indica el almacén arriba" />
              : !A ? <EmptyState icon="arrow_left" title="Marca lo que sale" text="Aquí aparecerán los activos de la misma categoría" />
                : vista === "despues" && plan
                  ? <PanelAlmacen candidatos={almacenDespues} activos={despues} sel="" onSel={() => {}} conHijos={modoHijos} rotado={false} onRotar={() => {}} soloLectura
                      marcas={Object.fromEntries([[A.serie, "Sale" as const]])} />
                  : !delAlmacen.length ? (
                    <EmptyState icon={buscaA ? "search_off" : "domain"} title={buscaA ? "No hay resultados" : modo === "parte" ? `No hay ${A.categoria.replace(/^./, (c) => c.toLowerCase())}s que encajen` : `No hay ${A.categoria.replace(/^./, (c) => c.toLowerCase())}s ${modoHijos ? "con" : "sin"} activos montados`}
                      text={buscaA ? "Ningún activo coincide con el nº de serie" : modo === "parte" ? "Ningún activo del almacén encaja con lo que se queda en la unidad (sin chocar y sin dejar activos sin su padre): marca o desmarca otros activos montados, o elige otro almacén" : modoHijos ? "Desmarca sus activos montados para cambiar solo el activo, o elige otro almacén" : "Elige otro almacén"} />
                  ) : (
                    <PanelAlmacen candidatos={delAlmacen} activos={mov.activos} sel={selA} conHijos={modoHijos} rotado={rotar}
                      marcas={B ? Object.fromEntries([[B.serie, "Entra" as const]]) : {}}
                      onSel={(s) => { if (s !== selA) setRotar(false); setSelA(s); }}
                      onRotar={(s) => { if (s !== selA) { setSelA(s); setRotar(true); } else setRotar((r) => !r); }} />
                  )}
          </Panel>
        </div>

        <div className="row gap-15 wrap" style={{ alignItems: "flex-start" }}>
          {drv.campos}

        </div>

        {plan?.error && <Banner type="error" title={plan.error} />}
        {vaciosRutas.size > 0 && (
          <Banner type="attention" title={`${vaciosRutas.size === 1 ? "Queda 1 hueco vacío" : `Quedan ${vaciosRutas.size} huecos vacíos`} en la unidad ${unidad}`}>
            {[...vaciosRutas].join(" · ")}. {art(B?.categoria, "el", true)} {B?.serie} no tiene activos para esas posiciones; podrás montarlos después con Montaje.
          </Banner>
        )}
      </div>

      {confirmar && plan && (
        <Dialog large title="¿Registrar el intercambio?" onClose={() => setConfirmar(false)}
          message={`${textoFecha(iso)} · Unidad ${unidad} (${t.flotaDeUnidad(unidad)}) · ${formatoKm(kmNum)} km${drv.texto ? ` · ${drv.texto}` : ""} · ${t.nombreAlmacen(almacen)}${rotar ? " · con rotación" : ""}`}
          footer={<>
            <Button variant="outlined" onClick={() => setConfirmar(false)}>Cancelar</Button>
            <Button onClick={registrar}>Registrar</Button>
          </>}>
          <ResultadoIntercambio filas={plan.filas} activos={mov.activos} serieUnidad={A!.serie} serieAlmacen={B!.serie} huecos={huecosPos} />
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
