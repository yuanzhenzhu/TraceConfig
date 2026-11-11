"use client";

// HU-M03 · Intercambio entre unidad y almacén. Patrón común de registro (HU-M00 §2):
// 1 Cuándo y dónde · 2 Qué activos · 3 Resultado (Antes → Después en vivo) · Registrar movimiento con una sola confirmación.
// Al registrar se queda en la misma pantalla, con fecha, hora, unidad y almacén ya rellenos, para registrar otro seguido.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner, Breadcrumb, Button, Dialog, EmptyState, Field, Loading, SearchInput, Tag, useSnackbar } from "@/components/ds";
import { ResultadoIntercambio } from "@/components/movimientos/resultado";
import { TablaAlmacen, TablaArbolUnidad, type SeleccionUnidad } from "@/components/movimientos/tablas";
import {
  TIPOS, ahoraIso, descendientes, formatoKm, planIntercambioUA, textoFecha, useMovimientos, useTextos,
} from "@/lib/movimientos";
import { useStore } from "@/lib/store";
import { SEP } from "@/lib/datos";
import type { Nodo } from "@/lib/model";

// En este intercambio solo se rotan ejes (en el almacén, antes de montarlo)
const driverExtra = (categoria?: string) => (!categoria ? null : categoria.startsWith("Motor") ? "horas" : categoria === "Puerta" ? "ciclos" : null);

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
  const [extra, setExtra] = useState(""); // horas o ciclos
  const [almacen, setAlmacen] = useState("");
  const [selU, setSelU] = useState<SeleccionUnidad>(null);
  const [selA, setSelA] = useState("");
  const [rotar, setRotar] = useState(false);
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
  const tipoExtra = driverExtra(A?.categoria);
  const extraNum = extra === "" ? null : Number(extra);
  const previoExtra = tipoExtra === "horas" ? A?.horas : tipoExtra === "ciclos" ? A?.ciclos : null;
  const errExtra = extraNum !== null && (!Number.isFinite(extraNum) || extraNum < 0) ? `Las ${tipoExtra} tienen que ser un número`
    : extraNum !== null && previoExtra != null && extraNum < previoExtra ? `Tienen que ser iguales o mayores que ${formatoKm(previoExtra)} (último registro)` : "";
  const errores = { fecha: errFecha, flota: flota ? "" : "Elige la flota", unidad: unidad ? "" : "Elige la unidad", km: errKm, almacen: almacen ? "" : "Elige el almacén", extra: errExtra };
  const cabeceraOk = Object.values(errores).every((e) => !e);

  // Activos montados en el que sale y candidatos del almacén: con hijos, los que tienen activos montados; sin hijos, los que no
  const hijosA = useMemo(() => (A ? descendientes(mov.activos, A) : []), [A, mov.activos]);
  const modoHijos = hijosA.length > 0 && !!selU?.conHijos;
  const delAlmacen = useMemo(() => Object.values(mov.activos)
    .filter((a) => A && a.lugar.tipo === "almacen" && a.lugar.almacenId === almacen && a.categoria === A.categoria)
    .filter((a) => (descendientes(mov.activos, a).length > 0) === modoHijos)
    .filter((a) => !buscaA || a.serie.toLowerCase().includes(buscaA.toLowerCase()))
    .sort((a, b) => a.serie.localeCompare(b.serie)), [mov.activos, almacen, A, buscaA, modoHijos]);

  const plan = A && B ? planIntercambioUA(mov.activos, A.serie, B.serie, modoHijos, modoHijos && rotar && B.categoria === "Eje") : null;
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
  const valido = cabeceraOk && !!plan && !plan.error && plan.filas.length > 0;
  const hayDatos = !!(flota || unidad || km || almacen || selU || selA);

  const elegirUnidad = (s: SeleccionUnidad) => {
    if (!s || s.padre !== selU?.padre) setExtra("");
    if (!s || s.padre !== selU?.padre || s.conHijos !== selU?.conHijos) { setSelA(""); setRotar(false); }
    setSelU(s);
  };
  const registrar = () => {
    if (!plan) return;
    const m = mov.registrar({
      tipo: TIPOS.intercambioUA, fecha: iso, almacenes: [almacen], filas: plan.filas,
      registros: [{ unidad, km: kmNum, ...(tipoExtra === "horas" ? { horas: extraNum } : tipoExtra === "ciclos" ? { ciclos: extraNum } : {}) }],
    });
    setConfirmar(false); setSelU(null); setSelA(""); setRotar(false); setExtra(""); setIntentado(false); setBuscaU(""); setBuscaA("");
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
        {/* 1 · Cuándo y dónde */}
        <section className="lm-surface lm-surface--p24 stack gap-20" aria-labelledby="b1">
          <h2 id="b1" className="lm-title-medium" style={{ margin: 0 }}>1. Cuándo y dónde</h2>
          <div className="row gap-20 wrap" style={{ alignItems: "flex-start" }}>
            <Field label="Fecha" required htmlFor="fecha" error={intentado || fecha ? errores.fecha : ""} style={{ width: 170 }}>
              <input id="fecha" type="date" className="lm-input" value={fecha} max={ahora.slice(0, 10)} onChange={(e) => setFecha(e.target.value)} />
            </Field>
            <Field label="Hora" required htmlFor="hora" style={{ width: 120 }}>
              <input id="hora" type="time" className="lm-input" value={hora} onChange={(e) => setHora(e.target.value)} />
            </Field>
            <Field label="Flota" required htmlFor="flota" error={intentado ? errores.flota : ""} style={{ width: 200 }}>
              <select id="flota" className="lm-select" value={flota} onChange={(e) => { setFlota(e.target.value); setUnidad(""); elegirUnidad(null); }}>
                <option value="">Elige una flota</option>
                {flotasConUnidades.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </Field>
            <Field label="Unidad" required htmlFor="unidad" error={intentado ? errores.unidad : ""} style={{ width: 150 }}>
              <select id="unidad" className="lm-select" value={unidad} disabled={!flota} onChange={(e) => { setUnidad(e.target.value); elegirUnidad(null); }}>
                <option value="">{flota ? "Elige" : "Elige la flota"}</option>
                {unidadesFlota.map((u) => <option key={u.serie} value={u.serie}>{u.serie}</option>)}
              </select>
            </Field>
            <Field label="Km" required htmlFor="km" style={{ width: 230 }}
              error={(intentado || km) && unidad ? errores.km : ""}
              support={unidad ? (rango.antes ? `Último registro: ${formatoKm(rango.antes.km)} km el ${textoFecha(rango.antes.fecha).slice(0, 10)}` : "Sin registros anteriores") : "Elige antes la unidad"}>
              <input id="km" className="lm-input" inputMode="numeric" value={km} disabled={!unidad} onChange={(e) => setKm(e.target.value.replace(/[^\d]/g, ""))} />
            </Field>
            <Field label="Almacén" required htmlFor="almacen" error={intentado ? errores.almacen : ""} style={{ width: 260 }}>
              <select id="almacen" className="lm-select" value={almacen} onChange={(e) => { setAlmacen(e.target.value); setSelA(""); setRotar(false); }}>
                <option value="">Elige un almacén</option>
                {store.almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </Field>
          </div>
          {unidad && fecha && hora && (
            <div className="stack gap-10" style={{ maxWidth: 640 }}>
              <span className="lm-label-medium muted">REGISTROS DE KM DE LA UNIDAD {unidad} CERCA DE LA FECHA</span>
              <table className="lm-table">
                <thead><tr><th>Fecha</th><th className="num">Km</th><th>Registro</th><th /></tr></thead>
                <tbody>
                  {cercanos.previos.map((p, i) => (
                    <tr key={`p${i}`}><td>{textoFecha(p.fecha)}</td><td className="num">{formatoKm(p.km)}</td><td>{p.mov ?? "Alta de la unidad"}</td><td><Tag tone="neutral">Anterior</Tag></td></tr>
                  ))}
                  <tr style={{ background: "var(--lm-sys-secondary-container)" }}>
                    <td>{textoFecha(iso)}</td><td className="num">{km ? formatoKm(kmNum) : "—"}</td><td>Este movimiento</td><td><Tag tone="primary">Nuevo</Tag></td>
                  </tr>
                  {cercanos.posterior && (
                    <tr><td>{textoFecha(cercanos.posterior.fecha)}</td><td className="num">{formatoKm(cercanos.posterior.km)}</td><td>{cercanos.posterior.mov ?? "Alta de la unidad"}</td><td><Tag tone="neutral">Posterior</Tag></td></tr>
                  )}
                  {!cercanos.previos.length && !cercanos.posterior && <tr><td colSpan={4} className="muted">La unidad no tiene registros de km</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 2 · Qué activos: lo que sale de la unidad y lo que entra del almacén */}
        <section className="lm-surface lm-surface--p24 stack gap-20" aria-labelledby="b2">
          <h2 id="b2" className="lm-title-medium" style={{ margin: 0 }}>2. Qué activos</h2>

          <div className="stack gap-10">
            <div className="row gap-10">
              <span className="stack grow">
                <span className="lm-title-small">Sale de la unidad{unidad ? ` ${unidad}` : ""}</span>
                <span className="lm-body-small muted">Marca el activo que sale: sus activos montados se marcan con él. Desmárcalos para cambiar solo el activo.</span>
              </span>
              {uInfo && <SearchInput label="Buscar en la unidad por nº de serie" placeholder="Nº de serie" value={buscaU} onChange={setBuscaU} />}
            </div>
            {!uInfo ? <EmptyState icon="train" title="Elige una unidad" text="Indica la flota y la unidad en el bloque 1" />
              : <TablaArbolUnidad key={unidad} raiz={uInfo.raiz} unidad={unidad} activos={mov.activos} sel={selU} onSel={elegirUnidad} busca={buscaU} alto={360} />}
            {A && (
              <span className="lm-body-medium">
                Sale el <strong>{A.categoria.toLowerCase()} {A.serie}</strong>
                {hijosA.length ? (modoHijos ? ` con sus ${hijosA.length} activos montados` : `, sin sus ${hijosA.length} activos montados (se quedan en la unidad)`) : ""}.
              </span>
            )}
            {A && tipoExtra && (
              <Field label={tipoExtra === "horas" ? "Horas" : "Ciclos"} htmlFor="extra" error={errores.extra}
                support={`Opcional${previoExtra != null ? ` · último registro: ${formatoKm(previoExtra)}` : ""}`} style={{ width: 230 }}>
                <input id="extra" className="lm-input" inputMode="numeric" value={extra} onChange={(e) => setExtra(e.target.value.replace(/[^\d]/g, ""))} />
              </Field>
            )}
          </div>

          {A && (
            <div className="stack gap-10">
              <div className="row gap-10">
                <span className="stack grow">
                  <span className="lm-title-small">Entra desde {almacen ? t.nombreAlmacen(almacen) : "el almacén"}</span>
                  <span className="lm-body-small muted">
                    {modoHijos ? `${A.categoria}s con sus activos montados.${A.categoria === "Eje" ? " Puedes rotar el eje antes de montarlo." : ""}` : `${A.categoria}s sin activos montados.`}
                  </span>
                </span>
                {almacen && <SearchInput label="Buscar en el almacén por nº de serie" placeholder="Nº de serie" value={buscaA} onChange={setBuscaA} />}
              </div>
              {!almacen ? <EmptyState icon="domain" title="Elige un almacén" text="Indica el almacén en el bloque 1" />
                : !delAlmacen.length ? (
                  <EmptyState icon={buscaA ? "search_off" : "domain"} title={buscaA ? "No hay resultados" : `No hay ${A.categoria.toLowerCase()}s ${modoHijos ? "con" : "sin"} activos montados en ${t.nombreAlmacen(almacen)}`}
                    text={buscaA ? "Ningún activo coincide con el nº de serie" : modoHijos ? "Desmarca sus activos montados para cambiar solo el activo, o elige otro almacén" : "Elige otro almacén"} />
                ) : (
                  <TablaAlmacen candidatos={delAlmacen} activos={mov.activos} sel={selA} conHijos={modoHijos} alto={360} rotado={rotar}
                    onSel={(s) => { if (s !== selA) setRotar(false); setSelA(s); }}
                    onRotar={(s) => { if (s !== selA) { setSelA(s); setRotar(true); } else setRotar((r) => !r); }} />
                )}
            </div>
          )}
        </section>

        {/* 3 · Resultado */}
        <section className="lm-surface lm-surface--p24 stack gap-15" aria-labelledby="b3">
          <h2 id="b3" className="lm-title-medium" style={{ margin: 0 }}>3. Resultado</h2>
          {plan?.error ? <Banner type="error" title={plan.error} />
            : plan && plan.filas.length ? <ResultadoIntercambio filas={plan.filas} activos={mov.activos} serieUnidad={A!.serie} serieAlmacen={B!.serie} huecos={huecosPos} />
              : <span className="muted">Marca lo que sale de la unidad y elige lo que entra del almacén para ver el intercambio.</span>}
          {!cabeceraOk && plan && !plan.error && <Banner type="attention" title="Completa el bloque 1 para registrar el movimiento" />}
        </section>
      </div>

      {confirmar && plan && (
        <Dialog large title="¿Registrar el intercambio?" onClose={() => setConfirmar(false)}
          message={`${textoFecha(iso)} · Unidad ${unidad} (${t.flotaDeUnidad(unidad)}) · ${formatoKm(kmNum)} km${extraNum !== null ? ` · ${formatoKm(extraNum)} ${tipoExtra}` : ""} · ${t.nombreAlmacen(almacen)}${rotar ? " · con rotación" : ""}`}
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
