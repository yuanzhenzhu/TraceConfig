"use client";

// Editor de drivers de una configuración (HU-10 a HU-13). Se usa en Configuración › Drivers y en el paso 3 del asistente.
// Los drivers se marcan POR CATEGORÍA, sobre el árbol de categorías de la estructura (Tren › Coche › Bogie › Eje › Rueda…).
// Marcar una categoría se aplica a todos sus huecos (los datos se siguen guardando por hueco, para las plantillas).
// Tener un driver y que sea heredable son dos marcas distintas:
// - Tener: la categoría cuenta la vida de sus activos con ese driver.
// - Heredable: su valor viene de la categoría padre (no se registra aparte). La raíz (la unidad) no tiene padre, así que nunca hereda.

import { Banner, Button, Icon, Tag } from "./ds";
import { ArbolFilas, iconoCategoria } from "./arbol";
import { DRIVERS, driversIniciales, recorrer, type DriverId, type Drivers, type DriversConfig, type Nodo } from "@/lib/model";

export const cuentaDrivers = (m: Drivers, drv: DriverId) => Object.values(m).filter((x) => x[drv]).length;

/**
 * Árbol de categorías de una estructura: cada categoría cuelga de la categoría de su hueco padre (la primera vez que aparece).
 * Devuelve el árbol (id = "cat:<categoría>") y, por categoría, los ids de sus huecos.
 */
export function arbolCategorias(raiz: Nodo): { arbol: Nodo; huecos: Record<string, string[]> } {
  const nodos = new Map<string, Nodo>();
  const huecos: Record<string, string[]> = {};
  recorrer(raiz, (n, _l, p) => {
    (huecos[n.categoria] ??= []).push(n.id);
    if (nodos.has(n.categoria)) return;
    const nodo: Nodo = { id: `cat:${n.categoria}`, categoria: n.categoria, nombre: n.categoria, hijos: [] };
    nodos.set(n.categoria, nodo);
    if (p) nodos.get(p.categoria)?.hijos.push(nodo);
  });
  return { arbol: nodos.get(raiz.categoria)!, huecos };
}

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
  const { arbol, huecos } = arbolCategorias(raiz);
  const padre: Record<string, string | null> = {};
  recorrer(arbol, (x, _l, p) => { padre[x.categoria] = p?.categoria ?? null; });

  // Una categoría tiene un driver (o lo hereda) si lo tienen todos sus huecos; si solo algunos, se muestra a medias.
  const estado = (m: Drivers, cat: string, drv: DriverId) => {
    const n = huecos[cat].filter((id) => m[id]?.[drv]).length;
    return n === 0 ? "no" : n === huecos[cat].length ? "si" : "parcial";
  };
  const cambiarTiene = (cat: string, drv: DriverId, on: boolean) => {
    const tiene = { ...d }, hereda = { ...h };
    // Al marcar un driver en una categoría, también lo tienen las que cuelgan de ella, que además lo heredan (la propia no).
    const nodos: Nodo[] = [];
    recorrer(arbol, (x) => { if (x.categoria === cat) nodos.push(x); });
    recorrer(nodos[0], (x) => {
      huecos[x.categoria].forEach((id) => {
        tiene[id] = { ...tiene[id], [drv]: on };
        hereda[id] = { ...hereda[id], [drv]: !on ? false : x.categoria === cat ? !!hereda[id]?.[drv] : true };
      });
    });
    onChange({ drivers: tiene, heredables: hereda });
  };
  const cambiarHeredable = (cat: string, drv: DriverId, on: boolean) => {
    const hereda = { ...h };
    huecos[cat].forEach((id) => { hereda[id] = { ...hereda[id], [drv]: on }; });
    onChange({ drivers: d, heredables: hereda });
  };
  const cuentaCats = (m: Drivers, drv: DriverId) => Object.keys(huecos).filter((cat) => estado(m, cat, drv) !== "no").length;
  const COL = 88;
  const caja = { width: 18, height: 18, accentColor: "var(--lm-sys-primary)" };

  return (
    <div className="stack gap-20">
      {!soloLectura && (
        <Banner type="info" title="Los drivers se marcan por categoría">
          Lo que marques en una categoría se aplica a todos sus huecos. <strong>Tener</strong>: la categoría cuenta la vida de sus activos con ese driver (por defecto, el kilometraje lo tienen todas). <strong>Heredable</strong>: el valor viene de la categoría padre y no hay que registrarlo aparte (por defecto, todas menos la unidad). Al marcar un driver en una categoría, también lo tienen las que cuelgan de ella y lo heredan.
        </Banner>
      )}
      <div className="row gap-10 wrap">
        {DRIVERS.map((x) => <Tag key={x.id} tone="primary">{x.nombre}: {cuentaCats(d, x.id)} categorías · {cuentaCats(h, x.id)} heredables</Tag>)}
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
          <span className="lm-label-medium grow" style={{ paddingLeft: "var(--lm-space-50)" }}>CATEGORÍA</span>
          {DRIVERS.map((x) => (
            <span key={x.id} className="row" style={{ margin: "0 var(--lm-space-5)" }}>
              <span className="lm-label-small muted" style={{ width: COL, textAlign: "center" }}>TIENE</span>
              <span className="lm-label-small muted" style={{ width: COL, textAlign: "center" }}>HEREDABLE</span>
            </span>
          ))}
        </div>
        <ArbolFilas raiz={arbol} abiertosIni={9} render={(n) => {
          const cat = n.categoria;
          const nHuecos = huecos[cat].length;
          return (
            <>
              <span className="row gap-10 grow">
                <Icon name={iconoCategoria(cat)} size="m" />
                <span style={{ fontWeight: n.hijos.length ? 500 : 400 }}>{cat}</span>
                {n.id === arbol.id ? <Tag tone="neutral">Unidad</Tag> : <span className="lm-body-small muted">{nHuecos} {nHuecos === 1 ? "hueco" : "huecos"}</span>}
              </span>
              {DRIVERS.map((x) => {
                const t = estado(d, cat, x.id);
                const pCat = padre[cat];
                const puedeHeredar = t !== "no" && !!pCat && estado(d, pCat, x.id) !== "no";
                const he = estado(h, cat, x.id);
                return (
                  <span key={x.id} className="row" style={{ margin: "0 var(--lm-space-5)" }}>
                    <span style={{ width: COL, display: "flex", justifyContent: "center" }}>
                      <input type="checkbox" style={caja} disabled={soloLectura} aria-label={`${cat} tiene ${x.nombre}`}
                        checked={t === "si"} ref={(el) => { if (el) el.indeterminate = t === "parcial"; }}
                        onChange={(e) => cambiarTiene(cat, x.id, e.target.checked)} />
                    </span>
                    <span style={{ width: COL, display: "flex", justifyContent: "center" }}>
                      <input type="checkbox" style={caja} aria-label={`${x.nombre} heredable en ${cat}`} disabled={soloLectura || !puedeHeredar}
                        title={!pCat ? "La unidad no tiene padre del que heredar" : t === "no" ? `Marca antes que tiene ${x.nombre}` : !puedeHeredar ? `La categoría padre no tiene ${x.nombre}` : undefined}
                        checked={puedeHeredar && he === "si"} ref={(el) => { if (el) el.indeterminate = puedeHeredar && he === "parcial"; }}
                        onChange={(e) => cambiarHeredable(cat, x.id, e.target.checked)} />
                    </span>
                  </span>
                );
              })}
            </>
          );
        }} />
      </div>
    </div>
  );
}
