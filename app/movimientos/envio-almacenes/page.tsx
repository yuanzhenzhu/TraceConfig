"use client";

// HU-M09 · Envío entre almacenes. Mismo diseño que el resto: datos en una fila (fecha, hora, origen y destino),
// almacén de origen y de destino lado a lado, Ahora | Después. Solo se envían activos sueltos, con lo que llevan montado.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner, Button, Dialog, EmptyState, Field, Icon, Loading, SearchInput, useSnackbar } from "@/components/ds";
import { TablaAntesDespues } from "@/components/movimientos/detalle";
import { useCabecera } from "@/components/movimientos/cabecera";
import { AhoraDespues, CabeceraPantalla } from "@/components/movimientos/pantalla";
import { Panel, PanelAlmacen } from "@/components/movimientos/paneles";
import { art, TIPOS, descendientes, planEnvio, textoFecha, useMovimientos, useTextos, type ActivoM } from "@/lib/movimientos";
import { useStore } from "@/lib/store";

export default function EnvioAlmacenes() {
  const store = useStore();
  const mov = useMovimientos();
  const t = useTextos();
  const snack = useSnackbar();
  const router = useRouter();
  const [destino, setDestino] = useState("");
  const [sel, setSel] = useState("");
  const [busca, setBusca] = useState("");
  const [vista, setVista] = useState<"antes" | "despues">("antes");
  const [confirmar, setConfirmar] = useState(false);
  const cab = useCabecera({ conUnidad: false, conAlmacen: true, etiquetaAlmacen: "Almacén de origen", onCambio: () => { setSel(""); setVista("antes"); } });

  const sueltos = (alm: string, estado: Record<string, ActivoM>) => Object.values(estado)
    .filter((a) => a.lugar.tipo === "almacen" && a.lugar.almacenId === alm && !a.lugar.padre)
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.serie.localeCompare(b.serie));
  const candidatos = useMemo(() => sueltos(cab.almacen, mov.activos).filter((a) => !busca || a.serie.toLowerCase().includes(busca.toLowerCase())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mov.activos, cab.almacen, busca]);
  const errDestino = destino && destino === cab.almacen ? "Elige un almacén distinto del de origen" : "";
  const plan = sel && destino && !errDestino ? planEnvio(mov.activos, sel, destino) : null;
  const planOk = !!plan && !plan.error && plan.filas.length > 0;
  const valido = cab.ok && !!destino && !errDestino && planOk;
  const despues = useMemo(() => { const d = { ...mov.activos }; plan?.filas.forEach((f) => { d[f.serie] = { ...d[f.serie], lugar: f.despues }; }); return d; }, [mov.activos, plan]);
  const A = sel ? mov.activos[sel] : undefined;
  const nHijos = A ? descendientes(mov.activos, A).length : 0;

  const registrar = () => {
    if (!plan) return;
    const m = mov.registrar({ tipo: TIPOS.envio, fecha: cab.iso, almacenes: [cab.almacen, destino], filas: plan.filas, registros: [] });
    setConfirmar(false); setSel(""); setVista("antes");
    snack(`Movimiento ${m.id} registrado`, { label: "Ver en el historial", onClick: () => router.push("/movimientos") });
  };

  if (!mov.listo) return <main className="lm-page"><Loading text="Cargando almacenes" /></main>;
  const listaDestino = destino ? sueltos(destino, vista === "despues" && planOk ? despues : mov.activos).sort((a, b) => (a.serie === sel ? -1 : b.serie === sel ? 1 : 0)) : [];
  return (
    <main className="lm-page">
      <CabeceraPantalla miga="Envío entre almacenes" titulo="Envío entre almacenes" texto="Envía un activo suelto, con lo que lleva montado, de un almacén a otro."
        valido={valido} hayDatos={cab.hayDatos || !!destino || !!sel} onRegistrar={() => { cab.setIntentado(true); if (valido) setConfirmar(true); }} />
      <div className="stack gap-20">
        <div className="row gap-15" style={{ alignItems: "flex-start" }}>
          <div className="grow">{cab.bloque}</div>
          <section className="lm-surface lm-surface--p16" aria-label="Destino">
            <Field label="Almacén de destino" required htmlFor="destino" error={errDestino} style={{ width: 250 }}>
              <select id="destino" className="lm-select lm-select--dense" value={destino} onChange={(e) => { setDestino(e.target.value); setVista("antes"); }}>
                <option value="">Elige</option>
                {store.almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </Field>
          </section>
        </div>
        <AhoraDespues vista={vista} setVista={setVista} ok={planOk} texto="Elige el activo que se envía y el almacén de destino; después podrás ver cómo queda." />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)", gap: "var(--lm-space-15)", alignItems: "start" }}>
          <Panel titulo={`${cab.almacen ? t.nombreAlmacen(cab.almacen) : "Origen"} · ${vista === "despues" ? "Después" : "Ahora"}`}
            subtitulo={vista === "despues" ? `${art(A?.categoria, "el", true)} ${A?.serie} sale del almacén` : A ? <>Elegido: <strong>{A.categoria.replace(/^./, (c) => c.toLowerCase())} {A.serie}</strong>{nHijos ? ` con sus ${nHijos} activos montados` : ""}</> : "Activos sueltos (los montados en otro no se pueden enviar sin desmontarlos)"}
            accion={cab.almacen && vista === "antes" ? <SearchInput label="Buscar en el origen por nº de serie" placeholder="Nº de serie" value={busca} onChange={setBusca} /> : undefined}>
            {!cab.almacen ? <EmptyState icon="domain" title="Elige el almacén de origen" text="Indícalo arriba" />
              : vista === "despues" && planOk ? <EmptyState icon="north_east" title={`Sale ${A?.categoria.replace(/^./, (c) => c.toLowerCase())} ${A?.serie}`} text={`Va a ${t.nombreAlmacen(destino)}`} />
                : !candidatos.length ? <EmptyState icon={busca ? "search_off" : "domain"} title={busca ? "No hay resultados" : "No hay activos sueltos"} text={busca ? "Ningún activo coincide" : "Elige otro almacén"} />
                  : <PanelAlmacen candidatos={candidatos} activos={mov.activos} sel={sel} onSel={(s) => { setSel(s); setVista("antes"); }} conHijos sinRotar rotado={false} onRotar={() => {}} alto={420} />}
          </Panel>
          <span className="row" aria-hidden="true" style={{ alignSelf: "center", color: "var(--lm-sys-on-surface-variant)" }}><Icon name="arrow_right" /></span>
          <Panel titulo={`${destino ? t.nombreAlmacen(destino) : "Destino"} · ${vista === "despues" ? "Después" : "Ahora"}`}
            subtitulo={vista === "despues" ? `Llega ${art(A?.categoria, "el")} ${A?.serie}` : destino ? `${listaDestino.length} activos sueltos` : "Elige el almacén de destino"}>
            {!destino ? <EmptyState icon="domain" title="Elige el almacén de destino" text="Indícalo arriba" />
              : !listaDestino.length ? <EmptyState icon="domain" title="Sin activos sueltos" text="El almacén de destino no tiene activos sueltos" />
                : <PanelAlmacen candidatos={listaDestino} activos={vista === "despues" && planOk ? despues : mov.activos} sel="" onSel={() => {}} conHijos sinRotar rotado={false} onRotar={() => {}} soloLectura alto={420}
                    marcas={vista === "despues" && sel ? { [sel]: "Entra" } : {}} />}
          </Panel>
        </div>
        {plan?.error && <Banner type="error" title={plan.error} />}
      </div>
      {confirmar && plan && (
        <Dialog large title="¿Registrar el envío?" onClose={() => setConfirmar(false)} message={`${textoFecha(cab.iso)} · de ${t.nombreAlmacen(cab.almacen)} a ${t.nombreAlmacen(destino)}`}
          footer={<><Button variant="outlined" onClick={() => setConfirmar(false)}>Cancelar</Button><Button onClick={registrar}>Registrar</Button></>}>
          <TablaAntesDespues filas={plan.filas} />
        </Dialog>
      )}
    </main>
  );
}
