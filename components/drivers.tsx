"use client";

// Editor de drivers de un perfil (HU-10 a HU-13). Se usa en Configuración › Drivers y en el paso 3 del asistente.
// Los drivers dependen de la CATEGORÍA: se marcan categoría a categoría, agrupadas por niveles de la estructura.
// Tener un driver y que sea heredable son dos marcas distintas:
// - Tener: la categoría cuenta su vida con ese driver.
// - Heredable: su valor viene de la categoría padre (no se registra aparte). La unidad no tiene padre, así que nunca hereda.

import { useMemo } from "react";
import { Banner, Button, Icon, Tag } from "./ds";
import { iconoCategoria } from "./arbol";
import { DRIVERS, arbolCategorias, buscar, categoriasDe, driversIniciales, recorrer, type DriverId, type Drivers, type DriversConfig, type Nodo } from "@/lib/model";

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
  const arbol = useMemo(() => arbolCategorias(raiz), [raiz]);
  const huecos = useMemo(() => Object.fromEntries(categoriasDe(raiz).map((x) => [x.categoria, x.huecos])), [raiz]);

  const padreTiene = (id: string, drv: DriverId) => {
    let ok = false;
    recorrer(arbol, (x, _l, p) => { if (x.id === id && p) ok = !!d[p.id]?.[drv]; });
    return ok;
  };
  const cambiarTiene = (id: string, drv: DriverId, on: boolean) => {
    const tiene = { ...d }, hereda = { ...h };
    const n = buscar(arbol, id)!;
    // Al marcar un driver en una categoría, también lo tienen sus categorías hijas, que además lo heredan de ella (la padre no).
    recorrer(n, (x) => {
      tiene[x.id] = { ...tiene[x.id], [drv]: on };
      hereda[x.id] = { ...hereda[x.id], [drv]: !on ? false : x.id === n.id ? !!hereda[x.id]?.[drv] : true };
    });
    onChange({ drivers: tiene, heredables: hereda });
  };
  const cambiarHeredable = (id: string, drv: DriverId, on: boolean) => onChange({ drivers: d, heredables: { ...h, [id]: { ...h[id], [drv]: on } } });
  const COL = 88;
  // Categorías agrupadas por nivel (como las plantillas): nivel 1 la unidad, nivel 2 sus hijas…
  const niveles = useMemo(() => {
    const m = new Map<number, { n: Nodo; padre: Nodo | null }[]>();
    recorrer(arbol, (n, nivel, padre) => { m.set(nivel, [...(m.get(nivel) ?? []), { n, padre }]); });
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [arbol]);

  return (
    <div className="stack gap-20">
      {!soloLectura && (
        <Banner type="info" title="Los drivers se marcan por categoría">
          <strong>Tener</strong>: la categoría cuenta su vida con ese driver (por defecto, el kilometraje lo tienen todas). <strong>Heredable</strong>: el valor viene de la categoría padre y no hay que registrarlo aparte (por defecto, todas menos la unidad). Al marcar un driver en una categoría, también lo tienen sus categorías hijas y lo heredan de ella.
        </Banner>
      )}
      <div className="row gap-10 wrap">
        {DRIVERS.map((x) => <Tag key={x.id} tone="primary">{x.nombre}: {cuentaDrivers(d, x.id)} categorías · {cuentaDrivers(h, x.id)} heredables</Tag>)}
        <span className="grow" />
        {!soloLectura && <Button variant="text" icon="restart_alt" onClick={() => onChange(driversIniciales(raiz))}>Restablecer por defecto</Button>}
      </div>
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
          <span className="lm-label-medium grow" style={{ paddingLeft: "var(--lm-space-15)" }}>CATEGORÍA</span>
          {DRIVERS.map((x) => (
            <span key={x.id} className="row" style={{ margin: "0 var(--lm-space-5)" }}>
              <span className="lm-label-small muted" style={{ width: COL, textAlign: "center" }}>TIENE</span>
              <span className="lm-label-small muted" style={{ width: COL, textAlign: "center" }}>HEREDABLE</span>
            </span>
          ))}
        </div>
        {niveles.map(([nivel, filas]) => (
          <div key={nivel} role="group" aria-label={`Nivel ${nivel}`}>
            <div className="row gap-10 lm-label-medium" style={{ minHeight: "var(--lm-space-40)", padding: "0 var(--lm-space-15)", background: "var(--lm-sys-surface-container)", borderBottom: "1px solid var(--lm-sys-outline-variant)" }}>
              Nivel {nivel}<span className="lm-body-small muted">· {filas.length} {filas.length === 1 ? "categoría" : "categorías"}</span>
            </div>
            {filas.map(({ n, padre }) => (
              <div key={n.id} className="row gap-10" style={{ minHeight: "var(--lm-space-50)", paddingLeft: "var(--lm-space-15)", borderBottom: "1px solid var(--lm-sys-outline-variant)" }}>
                <span className="grow row gap-10">
                  <Icon name={iconoCategoria(n.id)} size="m" />
                  <span className="stack">
                    <span className="row gap-10"><span style={{ fontWeight: 500 }}>{n.nombre}</span>{n.id === arbol.id && <Tag tone="neutral">Unidad</Tag>}</span>
                    <span className="lm-body-small muted">{padre ? `Hereda de ${padre.nombre} · ` : ""}{huecos[n.id]} {huecos[n.id] === 1 ? "hueco" : "huecos"} por unidad</span>
                  </span>
                </span>
                {DRIVERS.map((x) => {
                  const tiene = !!d[n.id]?.[x.id];
                  const puedeHeredar = tiene && n.id !== arbol.id && padreTiene(n.id, x.id);
                  return (
                    <span key={x.id} className="row" style={{ margin: "0 var(--lm-space-5)" }}>
                      <span style={{ width: COL, display: "flex", justifyContent: "center" }}>
                        <input type="checkbox" style={{ width: 18, height: 18, accentColor: "var(--lm-sys-primary)" }} disabled={soloLectura}
                          aria-label={`${n.nombre} tiene ${x.nombre}`} checked={tiene} onChange={(e) => cambiarTiene(n.id, x.id, e.target.checked)} />
                      </span>
                      <span style={{ width: COL, display: "flex", justifyContent: "center" }}>
                        <input type="checkbox" style={{ width: 18, height: 18, accentColor: "var(--lm-sys-primary)" }}
                          aria-label={`${x.nombre} heredable en ${n.nombre}`} disabled={soloLectura || !puedeHeredar}
                          title={n.id === arbol.id ? "La unidad no tiene padre del que heredar" : !tiene ? `Marca antes que tiene ${x.nombre}` : !puedeHeredar ? `La categoría padre no tiene ${x.nombre}` : undefined}
                          checked={puedeHeredar && !!h[n.id]?.[x.id]} onChange={(e) => cambiarHeredable(n.id, x.id, e.target.checked)} />
                      </span>
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
