"use client";

// Editor de drivers de un perfil (HU-10 a HU-13). Se usa en Configuración › Drivers y en el paso 3 del asistente.
// Tener un driver y que sea heredable son dos marcas distintas:
// - Tener: el hueco cuenta su vida con ese driver.
// - Heredable: su valor viene del padre (no se registra aparte). La unidad no tiene padre, así que nunca hereda.

import { useState } from "react";
import { Banner, Button, Tag } from "./ds";
import { ArbolFilas } from "./arbol";
import { DRIVERS, buscar, categoriasDe, driversIniciales, recorrer, type DriverId, type Drivers, type DriversConfig, type Nodo } from "@/lib/model";

export const cuentaDrivers = (m: Drivers, drv: DriverId) => Object.values(m).filter((x) => x[drv]).length;

export function ResumenDrivers({ valor }: { valor: DriversConfig }) {
  const usados = DRIVERS.filter((x) => cuentaDrivers(valor.drivers, x.id) > 0);
  if (!usados.length) return <span className="muted">Sin drivers</span>;
  return (
    <span className="row gap-5 wrap">
      {usados.map((x) => <Tag key={x.id} tone="primary" num={cuentaDrivers(valor.drivers, x.id)}>{x.corto}</Tag>)}
    </span>
  );
}

export function EditorDrivers({ raiz, valor, onChange, soloLectura }: {
  raiz: Nodo; valor: DriversConfig; onChange: (v: DriversConfig) => void; soloLectura?: boolean;
}) {
  const { drivers: d, heredables: h } = valor;
  const [catSel, setCatSel] = useState("");

  const marcar = (n: Nodo, drv: DriverId, on: boolean, tiene: Drivers, hereda: Drivers) => {
    // Al marcar un driver en un hueco, también lo tienen todos sus hijos, que además lo heredan de él (el padre no).
    recorrer(n, (x) => {
      tiene[x.id] = { ...tiene[x.id], [drv]: on };
      // El hueco marcado conserva su heredable; sus hijos pasan a heredar de él. Al desmarcar, nadie lo hereda.
      hereda[x.id] = { ...hereda[x.id], [drv]: !on ? false : x.id === n.id ? !!hereda[x.id]?.[drv] : true };
    });
  };
  const padreTiene = (id: string, drv: DriverId) => {
    let ok = false;
    recorrer(raiz, (x, _l, p) => { if (x.id === id && p) ok = !!d[p.id]?.[drv]; });
    return ok;
  };
  const cambiarTiene = (id: string, drv: DriverId, on: boolean) => {
    const tiene = { ...d }, hereda = { ...h };
    marcar(buscar(raiz, id)!, drv, on, tiene, hereda);
    onChange({ drivers: tiene, heredables: hereda });
  };
  const cambiarHeredable = (id: string, drv: DriverId, on: boolean) => onChange({ drivers: d, heredables: { ...h, [id]: { ...h[id], [drv]: on } } });
  const aplicarCategoria = (drv: DriverId, on: boolean) => {
    const tiene = { ...d }, hereda = { ...h };
    recorrer(raiz, (n) => { if (n.categoria === catSel) marcar(n, drv, on, tiene, hereda); });
    onChange({ drivers: tiene, heredables: hereda });
  };
  const COL = 88;

  return (
    <div className="stack gap-20">
      {!soloLectura && (
        <Banner type="info" title="Tener un driver y que sea heredable son cosas distintas">
          <strong>Tener</strong>: el hueco cuenta su vida con ese driver (por defecto, el kilometraje lo tienen todos). <strong>Heredable</strong>: el valor viene del padre y no hay que registrarlo aparte (por defecto, todos menos la unidad). Al marcar un driver en un hueco, también lo tienen sus hijos y lo heredan de él.
        </Banner>
      )}
      <div className="row gap-10 wrap">
        {DRIVERS.map((x) => <Tag key={x.id} tone="primary">{x.nombre}: {cuentaDrivers(d, x.id)} huecos · {cuentaDrivers(h, x.id)} heredables</Tag>)}
        <span className="grow" />
        {!soloLectura && <Button variant="text" icon="restart_alt" onClick={() => onChange(driversIniciales(raiz))}>Restablecer por defecto</Button>}
      </div>
      {!soloLectura && (
        <div className="lm-card row gap-15 wrap">
          <span className="lm-title-small">Aplicar a toda una categoría</span>
          <select className="lm-select lm-select--dense" style={{ width: 220 }} aria-label="Categoría" value={catSel} onChange={(e) => setCatSel(e.target.value)}>
            <option value="">Selecciona una categoría</option>
            {categoriasDe(raiz).map((x) => <option key={x.categoria} value={x.categoria}>{x.categoria} ({x.huecos})</option>)}
          </select>
          {DRIVERS.map((x) => (
            <span key={x.id} className="row gap-5">
              <Button small variant="outlined" disabled={!catSel} onClick={() => aplicarCategoria(x.id, true)}>Marcar {x.corto}</Button>
              <Button small variant="text" disabled={!catSel} onClick={() => aplicarCategoria(x.id, false)}>Quitar</Button>
            </span>
          ))}
        </div>
      )}
      <div className="lm-card">
        <div className="row" style={{ height: "var(--lm-space-40)" }}>
          <span className="grow" />
          {DRIVERS.map((x) => (
            <span key={x.id} className="lm-label-medium" style={{ width: COL * 2, textAlign: "center", borderBottom: "1px solid var(--lm-sys-outline-variant)", margin: "0 var(--lm-space-5)" }}>
              {x.nombre.toUpperCase()}
            </span>
          ))}
        </div>
        <div className="row" style={{ height: "var(--lm-space-40)", borderBottom: "1px solid var(--lm-sys-outline-variant)" }}>
          <span className="lm-label-medium grow" style={{ paddingLeft: "var(--lm-space-50)" }}>HUECO</span>
          {DRIVERS.map((x) => (
            <span key={x.id} className="row" style={{ margin: "0 var(--lm-space-5)" }}>
              <span className="lm-label-small muted" style={{ width: COL, textAlign: "center" }}>TIENE</span>
              <span className="lm-label-small muted" style={{ width: COL, textAlign: "center" }}>HEREDABLE</span>
            </span>
          ))}
        </div>
        <ArbolFilas raiz={raiz} abiertosIni={3} render={(n) => (
          <>
            <span className="grow row gap-10">
              <span style={{ fontWeight: n.hijos.length ? 500 : 400 }}>{n.nombre}</span>
              {n.id === raiz.id && <Tag tone="neutral">Unidad</Tag>}
            </span>
            {DRIVERS.map((x) => {
              const tiene = !!d[n.id]?.[x.id];
              const puedeHeredar = tiene && n.id !== raiz.id && padreTiene(n.id, x.id);
              return (
                <span key={x.id} className="row" style={{ margin: "0 var(--lm-space-5)" }}>
                  <span style={{ width: COL, display: "flex", justifyContent: "center" }}>
                    <input type="checkbox" style={{ width: 18, height: 18, accentColor: "var(--lm-sys-primary)" }} disabled={soloLectura}
                      aria-label={`${n.nombre} tiene ${x.nombre}`} checked={tiene} onChange={(e) => cambiarTiene(n.id, x.id, e.target.checked)} />
                  </span>
                  <span style={{ width: COL, display: "flex", justifyContent: "center" }}>
                    <input type="checkbox" style={{ width: 18, height: 18, accentColor: "var(--lm-sys-primary)" }}
                      aria-label={`${x.nombre} heredable en ${n.nombre}`} disabled={soloLectura || !puedeHeredar}
                      title={n.id === raiz.id ? "La unidad no tiene padre del que heredar" : !tiene ? `Marca antes que tiene ${x.nombre}` : !puedeHeredar ? `El padre no tiene ${x.nombre}` : undefined}
                      checked={puedeHeredar && !!h[n.id]?.[x.id]} onChange={(e) => cambiarHeredable(n.id, x.id, e.target.checked)} />
                  </span>
                </span>
              );
            })}
          </>
        )} />
      </div>
    </div>
  );
}
