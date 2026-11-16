"use client";

// HU-M06 · Rotación de bogies. Mismo diseño que los intercambios: datos en una fila con la línea de tiempo del km,
// árbol de la unidad (solo se pueden elegir bogies) con Ahora | Después y, al lado, los cambios de posición que provoca
// el giro de 180° (ningún activo cambia de padre).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner, Breadcrumb, Button, ButtonToggle, Dialog, EmptyState, Field, Loading, SearchInput, useSnackbar } from "@/components/ds";
import { TablaAntesDespues } from "@/components/movimientos/detalle";
import { LineaKm } from "@/components/movimientos/linea-km";
import { Panel, PanelUnidad } from "@/components/movimientos/paneles";
import type { SeleccionUnidad } from "@/components/movimientos/tablas";
import { SEP } from "@/lib/datos";
import { TIPOS, ahoraIso, formatoKm, planRotacion, textoFecha, useMovimientos, useTextos } from "@/lib/movimientos";
import { useMotivoCambio } from "@/components/movimientos/motivo";
import { useStore } from "@/lib/store";

export default function RotacionBogies() {
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
  const [sel, setSel] = useState<SeleccionUnidad>(null);
  const [busca, setBusca] = useState("");
  const [vista, setVista] = useState<"antes" | "despues">("antes");
  const [intentado, setIntentado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const mc = useMotivoCambio(confirmar); // motivo de cambio (opcional), en la confirmación
  const [descartar, setDescartar] = useState(false);

  const iso = `${fecha}T${hora}`;
  const info = mov.unidades.find((u) => u.serie === unidad);
  const bogie = sel ? mov.activos[sel.padre] : undefined;

  const l = unidad ? mov.historialKm(unidad) : [];
  const posterior = l.find((p) => p.fecha > iso);
  const previos = l.filter((p) => p.fecha <= iso).slice(posterior ? -1 : -2);
  const kmNum = km === "" ? null : Number(km);
  const rango = unidad ? mov.rangoKm(unidad, iso) : {};
  const errKm = kmNum === null ? "Indica el km"
    : rango.antes && kmNum < rango.antes.km ? `Igual o mayor que ${formatoKm(rango.antes.km)} (${textoFecha(rango.antes.fecha).slice(0, 10)})`
      : rango.despues && kmNum > rango.despues.km ? `Igual o menor que ${formatoKm(rango.despues.km)} (${textoFecha(rango.despues.fecha).slice(0, 10)})` : "";
  const errFecha = !fecha || !hora ? "Indica la fecha y la hora" : iso > ahoraIso() ? "La fecha no puede ser futura" : "";
  const cabeceraOk = !errFecha && !!unidad && !errKm;

  const plan = bogie ? planRotacion(mov.activos, bogie.serie) : null;
  const planOk = !!plan && !plan.error && plan.filas.length > 0;
  const valido = cabeceraOk && planOk;
  const despues = useMemo(() => {
    const d = { ...mov.activos };
    plan?.filas.forEach((f) => { d[f.serie] = { ...d[f.serie], lugar: f.despues }; });
    return d;
  }, [mov.activos, plan]);
  const hueco = bogie?.lugar.tipo === "unidad" ? bogie.lugar.hueco : "";
  const rel = (h: string) => (hueco && h.startsWith(hueco + SEP) ? h.slice(hueco.length + SEP.length) : h);

  // Solo se eligen bogies; los activos montados no se marcan por separado (giran con el bogie)
  const elegir = (s: SeleccionUnidad) => { setSel(s ? { padre: s.padre, quedan: [] } : null); setVista("antes"); };
  const registrar = () => {
    if (!plan) return;
    const m = mov.registrar({ motivo: mc.valor, tipo: TIPOS.rotacionBogie, fecha: iso, almacenes: [], filas: plan.filas, registros: [{ unidad, km: kmNum }], principal: bogie ? { serie: bogie.serie, categoria: bogie.categoria } : undefined });
    setConfirmar(false); setVista("antes"); setSel(null); setIntentado(false);
    snack(`Movimiento ${m.id} registrado`, { label: "Ver en el historial", onClick: () => router.push("/movimientos") });
  };

  if (!mov.listo) return <main className="lm-page"><Loading text="Cargando unidades" /></main>;

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Movimientos", href: "/movimientos" }, { label: "Rotación de bogies" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Rotación de bogies</h1>
          <span className="lm-body-medium muted">Registra que un bogie se ha girado 180° en su posición: sus ejes y ruedas cambian de lado.</span>
        </div>
        <div className="lm-header__actions">
          <Button variant="outlined" onClick={() => (flota || unidad || km || sel ? setDescartar(true) : router.push("/movimientos"))}>Cancelar</Button>
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
            <Field label="Flota" required htmlFor="flota" error={intentado && !flota ? "Elige la flota" : ""} style={{ width: 180 }}>
              <select id="flota" className="lm-select lm-select--dense" value={flota} onChange={(e) => { setFlota(e.target.value); setUnidad(""); elegir(null); }}>
                <option value="">Elige</option>
                {store.flotas.filter((f) => mov.unidades.some((u) => u.flotaId === f.id)).map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </Field>
            <Field label="Unidad" required htmlFor="unidad" error={intentado && !unidad ? "Elige la unidad" : ""} style={{ width: 110 }}>
              <select id="unidad" className="lm-select lm-select--dense" value={unidad} disabled={!flota} onChange={(e) => { setUnidad(e.target.value); elegir(null); }}>
                <option value="">Elige</option>
                {mov.unidades.filter((u) => u.flotaId === flota).map((u) => <option key={u.serie} value={u.serie}>{u.serie}</option>)}
              </select>
            </Field>
            <Field label="Km" required htmlFor="km" error={(intentado || km) && unidad ? errKm : ""} style={{ width: 150 }}>
              <input id="km" className="lm-input lm-input--dense" inputMode="numeric" value={km} disabled={!unidad} onChange={(e) => setKm(e.target.value.replace(/[^\d]/g, ""))} />
            </Field>
          </div>
          {unidad && fecha && hora && (
            <div className="row gap-20" style={{ alignItems: "flex-start", paddingTop: "var(--lm-space-5)" }}>
              <span className="lm-label-medium muted" style={{ width: 110 }}>KM DE LA UNIDAD {unidad}</span>
              <div className="grow"><LineaKm previos={previos} posterior={posterior} fechaNueva={iso} kmNuevo={kmNum} error={!!km && !!errKm} /></div>
            </div>
          )}
        </section>

        <div className="row gap-15">
          <ButtonToggle label="Qué se muestra" value={vista} onChange={(v) => { if (v === "antes" || planOk) setVista(v); }}
            options={[{ value: "antes", label: "Ahora" }, { value: "despues", label: "Después" }]} />
          <span className="lm-body-small muted">
            {vista === "despues" ? "Así queda el bogie después del giro. Vuelve a Ahora para elegir otro." : planOk ? "Pulsa Después para ver cómo queda el bogie." : "Marca el bogie que se ha rotado; después podrás ver cómo queda."}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", gap: "var(--lm-space-15)", alignItems: "start" }}>
          <Panel titulo={`Unidad ${unidad || ""} · ${vista === "despues" ? "Después" : "Ahora"}`}
            subtitulo={vista === "despues" ? <>Bogie <strong>{bogie?.serie}</strong> girado 180° en {hueco}</> : bogie ? <>Marcado: <strong>bogie {bogie.serie}</strong> en {hueco}</> : "Marca el bogie que se ha rotado"}
            accion={info && vista === "antes" ? <SearchInput label="Buscar en la unidad por nº de serie" placeholder="Nº de serie" value={busca} onChange={setBusca} /> : undefined}>
            {!info ? <EmptyState icon="train" title="Elige una unidad" text="Indica la flota y la unidad arriba" /> : (
              <>
                <div hidden={vista === "despues" && planOk}>
                  <PanelUnidad key={unidad} raiz={info.raiz} unidad={unidad} activos={mov.activos} sel={sel} onSel={elegir} busca={busca} alto={420}
                    elegible={(a) => (a.categoria === "Bogie" ? null : "Solo se pueden rotar bogies")} />
                </div>
                {vista === "despues" && planOk && (
                  <PanelUnidad key={`d-${unidad}`} raiz={info.raiz} unidad={unidad} activos={despues} sel={null} onSel={() => {}} busca="" soloLectura alto={420}
                    marcas={Object.fromEntries(plan!.filas.map((f) => [f.serie, "cambia" as const]))} abrirHasta={hueco} />
                )}
              </>
            )}
          </Panel>

          <Panel titulo="Cambios de posición" subtitulo={planOk ? `${plan!.filas.length} activos cambian de lado; ninguno cambia de padre` : "Aparecerán al marcar un bogie"}>
            {!planOk ? <EmptyState icon="sync" title="Sin cambios todavía" text={plan?.error ?? "Marca un bogie en el árbol"} /> : (
              <div style={{ maxHeight: 420, overflow: "auto" }}>
                {plan!.filas.map((f) => (
                  <div key={f.serie} className="row gap-10 lm-body-medium" style={{ minHeight: "var(--lm-space-40)", padding: "0 var(--lm-space-15)", borderBottom: "1px solid var(--lm-sys-outline-variant)" }}>
                    <span className="grow">{f.categoria} <strong>{f.serie}</strong></span>
                    <span className="muted">{f.antes.tipo === "unidad" ? rel(f.antes.hueco) : ""} → <strong style={{ color: "var(--lm-sys-on-surface)" }}>{f.despues.tipo === "unidad" ? rel(f.despues.hueco) : ""}</strong></span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
        {plan?.error && bogie && <Banner type="error" title={plan.error} />}
      </div>

      {confirmar && plan && (
        <Dialog large title="¿Registrar la rotación?" onClose={() => setConfirmar(false)}
          message={`${textoFecha(iso)} · Unidad ${unidad} (${t.flotaDeUnidad(unidad)}) · ${formatoKm(kmNum)} km · Bogie ${bogie?.serie} en ${hueco}`}
          footer={<>
            <Button variant="outlined" onClick={() => setConfirmar(false)}>Cancelar</Button>
            <Button onClick={registrar}>Registrar</Button>
          </>}>
          <TablaAntesDespues filas={plan.filas} />
          {mc.campo}
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
