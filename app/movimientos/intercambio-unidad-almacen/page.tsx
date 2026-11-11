"use client";

// HU-M03 · Intercambio entre unidad y almacén. Patrón común de registro (HU-M00 §2):
// 1 Cuándo y dónde · 2 Qué activos · 3 Resultado (Antes → Después en vivo) · Registrar movimiento con una sola confirmación.
// Al registrar se queda en la misma pantalla, con fecha, hora, unidad y almacén ya rellenos, para registrar otro seguido.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner, Breadcrumb, Button, Dialog, EmptyState, Field, Icon, Loading, SearchInput, Tag, useSnackbar } from "@/components/ds";
import { ArbolFilas, iconoCategoria } from "@/components/arbol";
import { TablaAntesDespues } from "@/components/movimientos/detalle";
import {
  TIPOS, ahoraIso, descendientes, formatoKm, huecosConActivo, planIntercambioUA, textoFecha, useMovimientos, useTextos,
} from "@/lib/movimientos";
import { useStore } from "@/lib/store";

const ROTABLES = ["Eje", "Bogie"];
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
  const [selU, setSelU] = useState("");
  const [selA, setSelA] = useState("");
  const [conHijos, setConHijos] = useState(true);
  const [rotar, setRotar] = useState(false);
  const [buscaU, setBuscaU] = useState("");
  const [buscaA, setBuscaA] = useState("");
  const [verLinea, setVerLinea] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [descartar, setDescartar] = useState(false);

  const flotasConUnidades = store.flotas.filter((f) => mov.unidades.some((u) => u.flotaId === f.id));
  const unidadesFlota = mov.unidades.filter((u) => u.flotaId === flota);
  const uInfo = mov.unidades.find((u) => u.serie === unidad);
  const iso = `${fecha}T${hora}`;
  const A = selU ? mov.activos[selU] : undefined;
  const B = selA ? mov.activos[selA] : undefined;

  // Validaciones de "Cuándo y dónde"
  const rango = unidad && fecha && hora ? mov.rangoKm(unidad, iso) : {};
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

  // Árbol de la unidad y lista del almacén
  const arbol = useMemo(() => (uInfo ? huecosConActivo(uInfo.raiz, unidad, mov.activos) : null), [uInfo, unidad, mov.activos]);
  const delAlmacen = useMemo(() => Object.values(mov.activos)
    .filter((a) => a.lugar.tipo === "almacen" && a.lugar.almacenId === almacen && (!A || a.categoria === A.categoria))
    .filter((a) => !buscaA || a.serie.toLowerCase().includes(buscaA.toLowerCase()))
    .sort((a, b) => a.serie.localeCompare(b.serie)), [mov.activos, almacen, A, buscaA]);

  const plan = A && B ? planIntercambioUA(mov.activos, A.serie, B.serie, conHijos, rotar && ROTABLES.includes(B.categoria)) : null;
  const valido = cabeceraOk && !!plan && !plan.error && plan.filas.length > 0;
  const viajan = (s?: string) => (s && mov.activos[s] ? descendientes(mov.activos, mov.activos[s]) : []);
  const hayDatos = !!(flota || unidad || km || almacen || selU || selA);

  const elegirUnidad = (s: string) => { setSelU(s); setSelA(""); setRotar(false); setExtra(""); };
  const registrar = () => {
    if (!plan) return;
    const m = mov.registrar({
      tipo: TIPOS.intercambioUA, fecha: iso, almacenes: [almacen], filas: plan.filas,
      registros: [{ unidad, km: kmNum, ...(tipoExtra === "horas" ? { horas: extraNum } : tipoExtra === "ciclos" ? { ciclos: extraNum } : {}) }],
    });
    setConfirmar(false); setSelU(""); setSelA(""); setRotar(false); setExtra(""); setIntentado(false); setBuscaU(""); setBuscaA("");
    snack(`Movimiento ${m.id} registrado`, { label: "Ver en el historial", onClick: () => router.push("/movimientos") });
  };

  if (!mov.listo) return <main className="lm-page"><Loading text="Cargando unidades y almacenes" /></main>;

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Movimientos", href: "/movimientos" }, { label: "Intercambios" }, { label: "Entre unidad y almacén" }]} />
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
              <select id="flota" className="lm-select" value={flota} onChange={(e) => { setFlota(e.target.value); setUnidad(""); elegirUnidad(""); }}>
                <option value="">Elige una flota</option>
                {flotasConUnidades.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </Field>
            <Field label="Unidad" required htmlFor="unidad" error={intentado ? errores.unidad : ""} style={{ width: 150 }}>
              <select id="unidad" className="lm-select" value={unidad} disabled={!flota} onChange={(e) => { setUnidad(e.target.value); elegirUnidad(""); }}>
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
          {unidad && (
            <div className="stack gap-10">
              <Button variant="text" small icon={verLinea ? "expand_less" : "expand_more"} style={{ alignSelf: "flex-start" }} onClick={() => setVerLinea((v) => !v)}>
                {verLinea ? "Ocultar" : "Ver"} línea temporal de la unidad {unidad}
              </Button>
              {verLinea && (
                <table className="lm-table" style={{ maxWidth: 560 }}>
                  <thead><tr><th>Fecha</th><th className="num">Km</th><th>Registro</th></tr></thead>
                  <tbody>
                    {mov.historialKm(unidad).slice(-8).reverse().map((p, i) => {
                      const marca = p === rango.antes || p === rango.despues;
                      return (
                        <tr key={i} style={marca ? { background: "var(--lm-sys-secondary-container)" } : undefined}>
                          <td>{textoFecha(p.fecha)}</td><td className="num">{formatoKm(p.km)}</td>
                          <td>{p.mov ?? "Alta de la unidad"}{p === rango.antes && <Tag tone="info">Anterior</Tag>}{p === rango.despues && <Tag tone="info">Siguiente</Tag>}</td>
                        </tr>
                      );
                    })}
                    {!mov.historialKm(unidad).length && <tr><td colSpan={3} className="muted">Sin registros de km</td></tr>}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </section>

        {/* 2 · Qué activos */}
        <section className="lm-surface lm-surface--p24 stack gap-20" aria-labelledby="b2">
          <h2 id="b2" className="lm-title-medium" style={{ margin: 0 }}>2. Qué activos</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--lm-space-30)", alignItems: "start" }}>
            <div className="stack gap-10">
              <div className="row gap-10">
                <span className="lm-label-medium grow">{unidad ? `UNIDAD ${unidad}` : "UNIDAD"}</span>
                <SearchInput label="Buscar en la unidad por nº de serie" placeholder="Nº de serie" value={buscaU} onChange={setBuscaU} />
              </div>
              {!uInfo || !arbol ? (
                <EmptyState icon="train" title="Elige una unidad" text="Indica la flota y la unidad en el bloque 1" />
              ) : (
                <div style={{ maxHeight: 460, overflow: "auto", border: "1px solid var(--lm-sys-outline-variant)", borderRadius: "var(--lm-corner-30)" }}>
                  <ArbolFilas key={`${unidad}-${buscaU ? "busca" : "todo"}`} raiz={uInfo.raiz} abiertosIni={buscaU ? 99 : 3}
                    filtro={buscaU ? (n) => (arbol.activoDe(n)?.serie ?? "").toLowerCase().includes(buscaU.toLowerCase()) : undefined}
                    render={(n, nivel) => {
                      const a = arbol.activoDe(n);
                      if (nivel === 1) return <span className="row gap-10 grow"><Icon name="train" size="m" /><span style={{ fontWeight: 500 }}>Unidad {unidad}</span></span>;
                      const sel = a && a.serie === selU;
                      return (
                        <label className="row gap-10 grow" style={{ cursor: a ? "pointer" : "not-allowed", padding: "var(--lm-space-5) 0", background: sel ? "var(--lm-sys-secondary-container)" : undefined }}>
                          <input type="radio" name="sel-unidad" disabled={!a} checked={!!sel} onChange={() => a && elegirUnidad(a.serie)} aria-label={`${n.nombre} ${a?.serie ?? "vacío"}`} />
                          <Icon name={iconoCategoria(n.categoria)} size="m" />
                          <span style={{ fontWeight: n.hijos.length ? 500 : 400 }}>{n.nombre}</span>
                          <span className="muted">{a ? a.serie : "Vacío"}</span>
                        </label>
                      );
                    }} />
                </div>
              )}
            </div>

            <div className="stack gap-10">
              <div className="row gap-10">
                <span className="lm-label-medium grow">{almacen ? t.nombreAlmacen(almacen).toUpperCase() : "ALMACÉN"}</span>
                <SearchInput label="Buscar en el almacén por nº de serie" placeholder="Nº de serie" value={buscaA} onChange={setBuscaA} />
              </div>
              {!almacen ? <EmptyState icon="domain" title="Elige un almacén" text="Indica el almacén en el bloque 1" />
                : !A ? <EmptyState icon="arrow_left" title="Elige antes un activo de la unidad" text="Aquí aparecerán los activos del almacén de la misma categoría" />
                  : !delAlmacen.length ? (
                    <EmptyState icon={buscaA ? "search_off" : "domain"} title={buscaA ? "No hay resultados" : `No hay ${A.categoria.toLowerCase()}s en ${t.nombreAlmacen(almacen)}`}
                      text={buscaA ? "Ningún activo coincide con el nº de serie" : "Elige otro almacén o otro activo de la unidad"} />
                  ) : (
                    <div style={{ maxHeight: 460, overflow: "auto" }}>
                      <table className="lm-table">
                        <thead><tr><th aria-hidden="true" /><th>Nº de serie</th><th>Dónde</th><th className="num">Km</th><th className="num">Montados</th></tr></thead>
                        <tbody>
                          {delAlmacen.map((a) => (
                            <tr key={a.serie} onClick={() => { setSelA(a.serie); setRotar(false); }} style={{ cursor: "pointer", background: a.serie === selA ? "var(--lm-sys-secondary-container)" : undefined }}>
                              <td style={{ width: 1 }}><input type="radio" name="sel-almacen" checked={a.serie === selA} onChange={() => setSelA(a.serie)} aria-label={`Elegir ${a.categoria} ${a.serie}`} /></td>
                              <td className="emph">{a.serie}</td>
                              <td>{a.lugar.tipo === "almacen" && a.lugar.padre ? `En ${a.lugar.padre}` : "Suelto"}</td>
                              <td className="num">{formatoKm(a.km)}</td>
                              <td className="num">{viajan(a.serie).length || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
            </div>
          </div>

          {A && (
            <div className="stack gap-10" style={{ borderTop: "1px solid var(--lm-sys-outline-variant)", paddingTop: "var(--lm-space-20)" }}>
              <label className="lm-toggle">
                <input type="checkbox" role="switch" aria-label="Mover con sus activos montados" checked={conHijos} onChange={(e) => setConHijos(e.target.checked)} />
                <span>Mover con sus activos montados</span>
              </label>
              <span className="lm-body-small muted" style={{ paddingLeft: 62 }}>
                {conHijos
                  ? [viajan(selU).length && `Con ${selU} viajan: ${viajan(selU).map((d) => `${d.a.categoria} ${d.a.serie}`).join(", ")}`,
                    B && viajan(selA).length && `Con ${selA} viajan: ${viajan(selA).map((d) => `${d.a.categoria} ${d.a.serie}`).join(", ")}`].filter(Boolean).join(". ") || "Los activos elegidos no tienen activos montados"
                  : "Solo se intercambian los activos elegidos: sus activos montados se quedan en su posición y pasan a estar montados en el otro"}
              </span>
              {B && ROTABLES.includes(B.categoria) && (
                <label className="lm-check">
                  <input type="checkbox" checked={rotar} onChange={(e) => setRotar(e.target.checked)} />
                  <span>Rotar el {B.categoria.toLowerCase()} {B.serie} del almacén (180°): sus activos montados cambian de lado</span>
                </label>
              )}
              {tipoExtra && (
                <Field label={tipoExtra === "horas" ? "Horas" : "Ciclos"} htmlFor="extra" error={errores.extra}
                  support={`Opcional${previoExtra != null ? ` · último registro: ${formatoKm(previoExtra)}` : ""}`} style={{ width: 230 }}>
                  <input id="extra" className="lm-input" inputMode="numeric" value={extra} onChange={(e) => setExtra(e.target.value.replace(/[^\d]/g, ""))} />
                </Field>
              )}
            </div>
          )}
        </section>

        {/* 3 · Resultado */}
        <section className="lm-surface lm-surface--p24 stack gap-15" aria-labelledby="b3">
          <h2 id="b3" className="lm-title-medium" style={{ margin: 0 }}>3. Resultado</h2>
          {plan?.error ? <Banner type="error" title={plan.error}>Activa "Mover con sus activos montados" o elige otro activo del almacén.</Banner>
            : plan && plan.filas.length ? <TablaAntesDespues filas={plan.filas} />
              : <span className="muted">Elige un activo de la unidad y otro del almacén para ver dónde queda cada uno.</span>}
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
