"use client";

// Cabecera común de los movimientos: fecha y hora, y según el tipo, flota + unidad + km (con su línea de tiempo)
// y almacén. Devuelve el estado, la validación y el bloque a pintar.

import { useState, type ReactNode } from "react";
import { Field } from "@/components/ds";
import { LineaKm } from "./linea-km";
import { ahoraIso, formatoKm, textoFecha, useMovimientos } from "@/lib/movimientos";
import { useStore } from "@/lib/store";

export function useCabecera({ conUnidad, conAlmacen, etiquetaAlmacen = "Almacén", onCambio }: {
  conUnidad: boolean; conAlmacen: boolean; etiquetaAlmacen?: string; onCambio?: () => void;
}) {
  const store = useStore();
  const mov = useMovimientos();
  const ahora = ahoraIso();
  const [fecha, setFecha] = useState(ahora.slice(0, 10));
  const [hora, setHora] = useState(ahora.slice(11, 16));
  const [flota, setFlota] = useState("");
  const [unidad, setUnidad] = useState("");
  const [km, setKm] = useState("");
  const [almacen, setAlmacen] = useState("");
  const [intentado, setIntentado] = useState(false);

  const iso = `${fecha}T${hora}`;
  const kmNum = km === "" ? null : Number(km);
  const l = unidad ? mov.historialKm(unidad) : [];
  const posterior = l.find((p) => p.fecha > iso);
  const previos = l.filter((p) => p.fecha <= iso).slice(posterior ? -1 : -2);
  const r = unidad ? mov.rangoKm(unidad, iso) : {};
  const errKm = kmNum === null ? "Indica el km"
    : r.antes && kmNum < r.antes.km ? `Igual o mayor que ${formatoKm(r.antes.km)} (${textoFecha(r.antes.fecha).slice(0, 10)})`
      : r.despues && kmNum > r.despues.km ? `Igual o menor que ${formatoKm(r.despues.km)} (${textoFecha(r.despues.fecha).slice(0, 10)})` : "";
  const errFecha = !fecha || !hora ? "Indica la fecha y la hora" : iso > ahoraIso() ? "La fecha no puede ser futura" : "";
  const okSinAlmacen = !errFecha && (!conUnidad || (!!unidad && !errKm));
  const ok = okSinAlmacen && (!conAlmacen || !!almacen);
  const hayDatos = !!(flota || unidad || km || almacen);

  const bloque: ReactNode = (
    <section className="lm-surface lm-surface--p16 stack gap-10" aria-label="Cuándo y dónde">
      <div className="row gap-15 wrap" style={{ alignItems: "flex-start" }}>
        <Field label="Fecha" required htmlFor="fecha" error={errFecha} style={{ width: 160 }}>
          <input id="fecha" type="date" className="lm-input lm-input--dense" value={fecha} max={ahora.slice(0, 10)} onChange={(e) => setFecha(e.target.value)} />
        </Field>
        <Field label="Hora" required htmlFor="hora" style={{ width: 110 }}>
          <input id="hora" type="time" className="lm-input lm-input--dense" value={hora} onChange={(e) => setHora(e.target.value)} />
        </Field>
        {conUnidad && (
          <>
            <Field label="Flota" required htmlFor="flota" error={intentado && !flota ? "Elige la flota" : ""} style={{ width: 180 }}>
              <select id="flota" className="lm-select lm-select--dense" value={flota} onChange={(e) => { setFlota(e.target.value); setUnidad(""); onCambio?.(); }}>
                <option value="">Elige</option>
                {store.flotas.filter((f) => mov.unidades.some((u) => u.flotaId === f.id)).map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </Field>
            <Field label="Unidad" required htmlFor="unidad" error={intentado && !unidad ? "Elige la unidad" : ""} style={{ width: 110 }}>
              <select id="unidad" className="lm-select lm-select--dense" value={unidad} disabled={!flota} onChange={(e) => { setUnidad(e.target.value); onCambio?.(); }}>
                <option value="">Elige</option>
                {mov.unidades.filter((u) => u.flotaId === flota).map((u) => <option key={u.serie} value={u.serie}>{u.serie}</option>)}
              </select>
            </Field>
            <Field label="Km" required htmlFor="km" error={(intentado || km) && unidad ? errKm : ""} style={{ width: 150 }}>
              <input id="km" className="lm-input lm-input--dense" inputMode="numeric" value={km} disabled={!unidad} onChange={(e) => setKm(e.target.value.replace(/[^\d]/g, ""))} />
            </Field>
          </>
        )}
        {conAlmacen && (
          <Field label={etiquetaAlmacen} required htmlFor="almacen" error={intentado && !almacen ? "Elige el almacén" : ""} style={{ width: 250 }}>
            <select id="almacen" className="lm-select lm-select--dense" value={almacen} onChange={(e) => { setAlmacen(e.target.value); onCambio?.(); }}>
              <option value="">Elige</option>
              {store.almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
          </Field>
        )}
      </div>
      {conUnidad && unidad && fecha && hora && (
        <div className="row gap-20" style={{ alignItems: "flex-start", paddingTop: "var(--lm-space-5)" }}>
          <span className="lm-label-medium muted" style={{ width: 110 }}>KM DE LA UNIDAD {unidad}</span>
          <div className="grow"><LineaKm previos={previos} posterior={posterior} fechaNueva={iso} kmNuevo={kmNum} error={!!km && !!errKm} /></div>
        </div>
      )}
    </section>
  );

  return { iso, unidad, kmNum, almacen, ok, okSinAlmacen, hayDatos, bloque, setIntentado, info: mov.unidades.find((u) => u.serie === unidad) };
}
