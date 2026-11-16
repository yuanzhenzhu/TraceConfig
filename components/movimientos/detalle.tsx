"use client";

// Piezas comunes de Movimientos: tabla Antes → Después, resumen de un movimiento, detalle y deshacer (HU-M00 §1, HU-M01, HU-M02).

import { useState } from "react";
import { Button, ButtonToggle, Dialog, Icon, Tag, useSnackbar } from "@/components/ds";
import { SEP } from "@/lib/datos";
import { art, femenina, TIPOS, formatoKm, textoFecha, useMovimientos, useTextos, type FilaMov, type Lugar, type Movimiento } from "@/lib/movimientos";

/** Tabla ACTIVO · CATEGORÍA · ANTES · DESPUÉS. */
export function TablaAntesDespues({ filas }: { filas: FilaMov[] }) {
  const t = useTextos();
  return (
    <table className="lm-table">
      <thead>
        <tr><th>Activo</th><th>Categoría</th><th>Antes</th><th aria-hidden="true" /><th>Después</th></tr>
      </thead>
      <tbody>
        {filas.map((f) => (
          <tr key={f.serie} className={f.conPadre ? "is-child" : undefined}>
            <td className={f.conPadre ? undefined : "emph"}>{f.serie}</td>
            <td>{f.categoria}{f.conPadre && <span className="lm-body-small muted"> · con su padre</span>}</td>
            <td>{t.lugar(f.antes)}</td>
            <td aria-hidden="true" style={{ width: 1 }}><Icon name="arrow_right" size="m" /></td>
            <td>{t.lugar(f.despues)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Resumen de los activos de un movimiento para el historial: "Eje 415875 ⇄ Eje 706821 + 4 con su padre". */
export function resumenActivos(m: Movimiento) {
  const principales = m.filas.filter((f) => !f.conPadre);
  const hijos = m.filas.length - principales.length;
  const n = (f: FilaMov) => `${f.categoria} ${f.serie}`;
  // Rotación: todas las filas son activos montados que cambian de posición
  if (!principales.length) return `${m.filas.length} activos cambian de posición`;
  const base = principales.length === 2 ? `${n(principales[0])} ⇄ ${n(principales[1])}`
    : principales.length === 1 ? n(principales[0])
      : `${n(principales[0])} y ${principales.length - 1} más`;
  return hijos ? `${base} + ${hijos} con su padre` : base;
}

/* ---------- Participantes de un movimiento (historial) ---------- */
export type Participante = { categoria: string; serie: string; hijos: { pos: string; serie: string; cambio?: string; nota?: string }[] };

const relHueco = (h: string, base: string) => (h.startsWith(base + " › ") ? h.slice(base.length + 3) : h);

/**
 * Activos que participan en un movimiento (1 o 2), cada uno con sus activos montados que se mueven con él.
 * En una rotación, el participante es el bogie y sus hijos llevan el cambio de posición.
 */
export function participantes(m: Movimiento): Participante[] {
  const principales = m.filas.filter((f) => !f.conPadre);
  const hijos = m.filas.filter((f) => f.conPadre);
  if (!principales.length && m.principal && hijos.every((f) => f.despues.tipo === "almacen")) {
    // Montaje y desmontaje en almacén: el padre es el participante y los activos que se montan o desmontan, sus hijos (con su posición en el padre)
    // Con la foto (montados) se ve todo lo que lleva el padre en ese momento; el activo del movimiento va marcado
    const mueve = new Set(hijos.map((f) => f.serie));
    const marca = m.tipo === TIPOS.desmontajeAlmacen ? "se desmonta" : "se monta";
    const lista = m.montados ?? hijos.map((f) => {
      const l = [f.despues, f.antes].find((x) => x.tipo === "almacen" && x.padre === m.principal!.serie) as { enHueco?: string } | undefined;
      return { serie: f.serie, pos: l?.enHueco ?? f.categoria };
    });
    return [{
      categoria: m.principal.categoria, serie: m.principal.serie,
      hijos: lista.map((h) => ({ serie: h.serie, pos: h.pos, nota: mueve.has(h.serie) ? marca : undefined }))
        .sort((a, b) => a.pos.localeCompare(b.pos, "es", { numeric: true })),
    }];
  }
  if (!principales.length) {
    // Rotación: posición común (el hueco del bogie) a partir de las filas
    const huecos = hijos.map((f) => (f.antes.tipo === "unidad" ? f.antes.hueco : ""));
    const partes = huecos[0]?.split(" › ") ?? [];
    let base = "";
    for (let i = partes.length; i > 0; i--) { const p = partes.slice(0, i).join(" › "); if (huecos.every((h) => h.startsWith(p + " › "))) { base = p; break; } }
    return [{
      categoria: m.principal?.categoria ?? "Bogie", serie: m.principal?.serie ?? base,
      hijos: hijos.map((f) => ({ serie: f.serie, pos: f.antes.tipo === "unidad" ? relHueco(f.antes.hueco, base) : "", cambio: f.despues.tipo === "unidad" ? relHueco(f.despues.hueco, base) : "" })),
    }];
  }
  // Cada hijo pertenece al principal bajo el que estaba antes (en la unidad, por la ruta; en el almacén, por la cadena de padres)
  const padreAntes = new Map(m.filas.map((f) => [f.serie, f.antes.tipo === "almacen" ? f.antes.padre : undefined]));
  const dueno = (f: FilaMov): string | undefined => {
    if (f.antes.tipo === "unidad") {
      const p = principales.find((x) => x.antes.tipo === "unidad" && f.antes.tipo === "unidad" && x.antes.unidad === f.antes.unidad && f.antes.hueco.startsWith(x.antes.hueco + " › "));
      return p?.serie;
    }
    let s = padreAntes.get(f.serie);
    for (let i = 0; s && i < 10; i++) { if (principales.some((p) => p.serie === s)) return s; s = padreAntes.get(s); }
    return undefined;
  };
  return principales.map((p) => ({
    categoria: p.categoria, serie: p.serie,
    hijos: hijos.filter((h) => dueno(h) === p.serie).map((h) => ({
      serie: h.serie,
      pos: h.antes.tipo === "unidad" && p.antes.tipo === "unidad" ? relHueco(h.antes.hueco, p.antes.hueco) : h.antes.tipo === "almacen" ? h.antes.enHueco ?? "" : "",
    })),
  }));
}

/** Celda de un participante: el activo y, plegados, sus activos montados (se despliegan con el botón). */
export function CeldaParticipante({ p, tachado, abierto, onToggle, resaltar }: { p?: Participante; tachado?: boolean; abierto?: boolean; onToggle?: () => void; resaltar?: string }) {
  if (!p) return <span className="muted">—</span>;
  const estilo = tachado ? { textDecoration: "line-through" } : undefined;
  const n = p.hijos.length;
  const cambian = p.hijos.some((h) => h.cambio !== undefined);
  return (
    <div className="stack" style={{ padding: "var(--lm-space-10) 0", alignItems: "flex-start", ...estilo }}>
      <span style={{ fontWeight: 500 }}>{p.categoria} {p.serie}</span>
      {n > 0 && onToggle && (
        <button type="button" className="lm-disclosure" aria-expanded={!!abierto}
          onClick={(e) => { e.stopPropagation(); onToggle(); }}>
          <Icon name={abierto ? "expand_less" : "expand_more"} size="m" />
          {cambian ? `${n} ${n === 1 ? "cambia" : "cambian"} de posición` : `${n} ${n === 1 ? "activo montado" : "activos montados"}`}
        </button>
      )}
      {(abierto || !onToggle) && p.hijos.map((h) => (
        <span key={h.serie} className="lm-body-small muted" style={{ paddingLeft: "var(--lm-space-15)" }}>
          {h.cambio !== undefined ? <>{h.pos} → <strong style={{ color: "var(--lm-sys-on-surface)" }}>{h.cambio}</strong></> : h.pos} · {h.nota || (resaltar && h.serie.toLowerCase().includes(resaltar)) ? <strong style={{ color: "var(--lm-sys-on-surface)" }}>{h.serie}</strong> : h.serie}{h.nota && <> · {h.nota}</>}
        </span>
      ))}
    </div>
  );
}

/** Dónde ocurrió: unidades y almacenes. */
export function useDonde() {
  const t = useTextos();
  return (m: Movimiento) => [...m.registros.map((r) => r.unidad), ...m.almacenes.map(t.nombreAlmacen)].join(" · ");
}

export const kmDe = (m: Movimiento) => m.registros.filter((r) => r.km !== null).map((r) => formatoKm(r.km)).join(" · ") || "—";

/* ---------- Detalle: Antes | Después de cada sitio ---------- */
type Sitio = { key: string; titulo: string; sub?: string; lugar: Lugar };
type ItemSitio = { serie: string; categoria: string; pos: string; nivel: number; nota?: string; antesEn?: string; enPadre?: string; sintetico?: boolean };

const ultimo = (ruta: string) => ruta.split(SEP).pop() ?? ruta;
/** Posición común (hueco del bogie) de una rotación. */
function baseRotacion(m: Movimiento) {
  const huecos = m.filas.map((f) => (f.antes.tipo === "unidad" ? f.antes.hueco : ""));
  const partes = huecos[0]?.split(SEP) ?? [];
  for (let i = partes.length - 1; i > 0; i--) { const p = partes.slice(0, i).join(SEP); if (huecos.every((h) => h.startsWith(p + SEP))) return p; }
  return "";
}

/** Sitios que intervienen: las posiciones de unidad de los activos principales, los almacenes y De baja. */
function sitiosDe(m: Movimiento, nombreAlmacen: (id: string) => string): Sitio[] {
  const out: Sitio[] = [];
  const principales = m.filas.filter((f) => !f.conPadre);
  const unidadesSitio: { unidad: string; hueco: string }[] = [];
  const add = (l: Lugar, esPrincipal: boolean) => {
    if (l.tipo === "unidad") {
      if (unidadesSitio.some((u) => u.unidad === l.unidad && (l.hueco === u.hueco || l.hueco.startsWith(u.hueco + SEP)))) return;
      if (!esPrincipal) return;
      unidadesSitio.push({ unidad: l.unidad, hueco: l.hueco });
      out.push({ key: `u|${l.unidad}|${l.hueco}`, titulo: `Unidad ${l.unidad}`, sub: l.hueco, lugar: l });
    } else if (l.tipo === "almacen") {
      if (!out.some((s) => s.key === `a|${l.almacenId}`)) out.push({ key: `a|${l.almacenId}`, titulo: nombreAlmacen(l.almacenId), sub: "Almacén", lugar: l });
    } else if (!out.some((s) => s.key === "baja")) out.push({ key: "baja", titulo: "De baja", sub: "Fin de vida", lugar: l });
  };
  if (!principales.length) {
    const f0 = m.filas[0];
    if (f0?.antes.tipo === "unidad") add({ tipo: "unidad", unidad: f0.antes.unidad, hueco: baseRotacion(m) }, true);
  }
  principales.forEach((f) => add(f.antes, true));
  principales.forEach((f) => add(f.despues, true));
  m.filas.forEach((f) => { add(f.antes, false); add(f.despues, false); });
  return out;
}

function claveSitio(sitios: Sitio[], l: Lugar) {
  if (l.tipo === "baja") return "baja";
  if (l.tipo === "almacen") return `a|${l.almacenId}`;
  return sitios.find((s) => s.lugar.tipo === "unidad" && s.lugar.unidad === l.unidad && (l.hueco === s.lugar.hueco || l.hueco.startsWith(s.lugar.hueco + SEP)))?.key ?? "";
}

/** Activos del movimiento que están en un sitio, en la vista Antes o Después, como árbol (padre y sus hijos). */
function itemsSitio(m: Movimiento, sitios: Sitio[], s: Sitio, vista: "antes" | "despues", corto: (l: Lugar) => string): ItemSitio[] {
  const otra = vista === "antes" ? "despues" : "antes";
  const aqui = m.filas.filter((f) => claveSitio(sitios, f[vista]) === s.key);
  const nota = (f: FilaMov) => {
    const o = f[otra];
    if (claveSitio(sitios, o) === s.key) return undefined;
    if (o.tipo === "baja") return "Se da de baja";
    return vista === "antes" ? `Pasa a ${corto(o)}` : `Viene de ${corto(o)}`;
  };
  if (s.lugar.tipo === "unidad") {
    const base = s.lugar.hueco;
    const rel = (h: string) => (h === base ? "" : h.slice(base.length + SEP.length));
    const items: ItemSitio[] = aqui.map((f) => {
      const h = (f[vista] as { hueco: string }).hueco, r = rel(h);
      const a = f.antes;
      // Posición anterior, si en el Después ha cambiado (rotación o activo girado)
      const prev = vista === "despues" ? (a.tipo === "unidad" && claveSitio(sitios, a) === s.key ? rel(a.hueco) : a.tipo === "almacen" && f.conPadre ? a.enHueco : undefined) : undefined;
      const cambia = prev !== undefined && prev !== "" && (claveSitio(sitios, a) === s.key ? prev !== r : prev !== ultimo(r));
      return { serie: f.serie, categoria: f.categoria, pos: r || ultimo(base), nivel: r ? r.split(SEP).length : 0, nota: nota(f), antesEn: cambia ? prev : undefined };
    });
    if (!items.some((i) => i.nivel === 0) && m.principal && items.length) items.push({ serie: m.principal.serie, categoria: m.principal.categoria, pos: ultimo(base), nivel: 0, sintetico: true });
    // Los hijos solo dicen adónde van si no van con su padre
    const notaRaiz = items.find((i) => i.nivel === 0)?.nota;
    items.forEach((i) => { if (i.nivel > 0 && i.nota === notaRaiz) i.nota = undefined; });
    return items.sort((x, y) => (x.nivel === 0 ? -1 : y.nivel === 0 ? 1 : x.pos.localeCompare(y.pos, "es", { numeric: true })));
  }
  if (s.lugar.tipo === "almacen") {
    const enEste = new Map(aqui.map((f) => [f.serie, f]));
    const padreDe = (f: FilaMov) => { const l = f[vista]; return l.tipo === "almacen" ? l.padre : undefined; };
    const out: ItemSitio[] = [];
    const ir = (f: FilaMov, nivel: number) => {
      const l = f[vista] as Extract<Lugar, { tipo: "almacen" }>;
      out.push({ serie: f.serie, categoria: f.categoria, pos: l.enHueco ?? f.categoria, nivel, nota: nivel === 0 ? nota(f) : undefined, enPadre: nivel === 0 ? (l.padre ? `Montado en ${l.padre}${l.enHueco ? ` › ${l.enHueco}` : ""}` : "Suelto") : undefined });
      aqui.filter((h) => padreDe(h) === f.serie).sort((a, b) => ((a[vista] as { enHueco?: string }).enHueco ?? "").localeCompare((b[vista] as { enHueco?: string }).enHueco ?? "", "es", { numeric: true })).forEach((h) => ir(h, nivel + 1));
    };
    // Montaje en almacén: el padre no se mueve (no tiene fila), pero se muestra como cabeza con lo que lleva montado
    const P = m.principal && !enEste.has(m.principal.serie) && !m.filas.some((f) => f.serie === m.principal!.serie) ? m.principal : undefined;
    if (P) {
      out.push({ serie: P.serie, categoria: P.categoria, pos: P.categoria, nivel: 0, sintetico: true });
      // Lo que ya llevaba montado y no se mueve (foto del movimiento) más lo que se monta o desmonta, por posición
      const quietos = (m.montados ?? []).filter((h) => !m.filas.some((f) => f.serie === h.serie))
        .map((h) => ({ pos: h.pos, poner: () => { out.push({ serie: h.serie, categoria: h.categoria, pos: h.pos, nivel: 1 }); } }));
      const mueven = aqui.filter((h) => padreDe(h) === P.serie)
        .map((h) => ({ pos: (h[vista] as { enHueco?: string }).enHueco ?? "", poner: () => ir(h, 1) }));
      [...quietos, ...mueven].sort((a, b) => a.pos.localeCompare(b.pos, "es", { numeric: true })).forEach((x) => x.poner());
    }
    aqui.filter((f) => { const p = padreDe(f); return (!p || !enEste.has(p)) && !(P && p === P.serie); }).forEach((f) => ir(f, 0));
    // Montaje y desmontaje en almacén: se marca el activo que se monta o se desmonta, y de qué padre
    if (P && (m.tipo === TIPOS.montajeAlmacen || m.tipo === TIPOS.desmontajeAlmacen)) {
      const mueve = new Set(m.filas.map((f) => f.serie));
      const deP = `${art(P.categoria, "del")} ${P.serie}`;
      out.forEach((i) => {
        if (!mueve.has(i.serie)) return;
        if (i.nivel > 0) i.nota = m.tipo === TIPOS.montajeAlmacen ? "Se monta" : "Se desmonta";
        else i.nota = m.tipo === TIPOS.montajeAlmacen ? `Se monta en ${art(P.categoria)} ${P.serie}` : `Desmontad${femenina(i.categoria) ? "a" : "o"} ${deP}`;
      });
    }
    return out;
  }
  return aqui.map((f) => ({ serie: f.serie, categoria: f.categoria, pos: f.categoria, nivel: f.conPadre ? 1 : 0, nota: f.conPadre ? undefined : nota(f) }));
}

const caja = {
  border: "1px solid var(--lm-sys-outline-variant)", borderRadius: "var(--lm-corner-30)",
  padding: "var(--lm-space-15) var(--lm-space-20)", minWidth: 0,
};

function CajaSitio({ sitio, items, vista }: { sitio: Sitio; items: ItemSitio[]; vista: "antes" | "despues" }) {
  // Los nietos (nivel 2 y más) van plegados bajo su hijo; se despliegan solos si alguno cambia de posición o de sitio
  const [abiertos, setAbiertos] = useState<Record<string, boolean>>({});
  const grupos: { item: ItemSitio; nietos: ItemSitio[] }[] = [];
  items.forEach((i) => { if (i.nivel >= 2 && grupos.length && grupos[grupos.length - 1].item.nivel >= 1) grupos[grupos.length - 1].nietos.push(i); else grupos.push({ item: i, nietos: [] }); });
  const linea = (i: ItemSitio) => (
    <span key={i.serie} className="lm-body-small" style={{ paddingLeft: `calc(var(--lm-space-15) * ${i.nivel})` }}>
      <span className="muted">{ultimo(i.pos)}</span>{" "}
      {i.antesEn ? <strong>{i.serie}</strong> : i.serie}
      {i.antesEn && <span className="muted"> · antes en {i.antesEn}</span>}
      {i.nota && <span style={{ color: "var(--lm-sys-primary)" }}> · {i.nota}</span>}
    </span>
  );
  return (
    <div className="stack gap-10" style={caja}>
      <span className="stack">
        <span className="lm-title-small">{sitio.titulo}</span>
        {sitio.sub && <span className="lm-body-small muted">{sitio.sub}</span>}
      </span>
      {!items.length ? (
        <span className="muted">{sitio.lugar.tipo === "unidad" ? "Hueco vacío" : vista === "antes" ? "Aún no estaba aquí" : "Ya no está aquí"}</span>
      ) : (
        <div className="stack gap-5">
          {grupos.map(({ item: i, nietos }) => {
            if (i.nivel === 0) return (
              <span key={i.serie} className="stack" style={{ marginTop: "var(--lm-space-5)" }}>
                <span style={{ fontWeight: 500 }}>{i.categoria} {i.serie}</span>
                {i.enPadre && <span className="lm-body-small muted">{i.enPadre}</span>}
                {i.nota && <span className="lm-body-small" style={{ color: "var(--lm-sys-primary)" }}>{i.nota}</span>}
              </span>
            );
            if (!nietos.length) return linea(i);
            const cambian = nietos.some((n) => n.antesEn || n.nota);
            const abierto = abiertos[i.serie] ?? cambian;
            return (
              <span key={i.serie} className="stack gap-5">
                <span className="row gap-5" style={{ alignItems: "center" }}>
                  {linea(i)}
                  <button type="button" className="lm-disclosure" aria-expanded={abierto} onClick={() => setAbiertos((x) => ({ ...x, [i.serie]: !abierto }))}>
                    <Icon name={abierto ? "expand_less" : "expand_more"} size="m" />{nietos.length} {nietos.length === 1 ? "activo montado" : "activos montados"}
                  </button>
                </span>
                {abierto && nietos.map(linea)}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Detalle de un movimiento: Antes | Después de cada sitio que interviene (igual para todos los tipos). */
export function DialogDetalle({ id, onClose, onAnular, onVer }: { id: string; onClose: () => void; onAnular: (id: string) => void; onVer: (id: string) => void }) {
  const mov = useMovimientos();
  const t = useTextos();
  const [vista, setVista] = useState<"antes" | "despues">("antes");
  const m = mov.movimientos.find((x) => x.id === id);
  if (!m) return null;
  const post = mov.posteriores(id);
  const motivo = m.estado === "anulado" ? "Ya está deshecho" : post.length ? "Tiene movimientos posteriores" : undefined;
  const sitios = sitiosDe(m, t.nombreAlmacen);
  const corto = (l: Lugar) => (l.tipo === "unidad" ? `unidad ${l.unidad}` : l.tipo === "almacen" ? t.nombreAlmacen(l.almacenId) : "baja");
  return (
    <Dialog large title={m.tipo} onClose={onClose}
      footer={<>
        <Button variant="outlined" icon="restart_alt" disabled={!!motivo} title={motivo} onClick={() => onAnular(m.id)}>Deshacer movimiento</Button>
        <Button onClick={onClose}>Cerrar</Button>
      </>}>
      <div className="stack gap-15">
        <div className="row gap-10 wrap lm-body-medium">
          <span style={{ fontWeight: 500 }}>{m.id}</span>
          <span>· {textoFecha(m.fecha)}</span>
          {m.registros.map((r) => (
            <span key={r.unidad}>· Unidad {r.unidad}{r.km !== null && ` a ${formatoKm(r.km)} km`}{r.horas != null && ` · ${formatoKm(r.horas)} h`}{r.ciclos != null && ` · ${formatoKm(r.ciclos)} ciclos`}</span>
          ))}
          {m.filas.filter((f) => f.horas != null || f.ciclos != null).map((f) => (
            <span key={`drv-${f.serie}`}>· {f.categoria} {f.serie}: {f.horas != null ? `${formatoKm(f.horas)} h` : `${formatoKm(f.ciclos)} ciclos`}</span>
          ))}
          <span className="muted">· Registrado por {m.por}</span>
          {m.estado === "anulado" && <Tag tone="neutral">Deshecho el {textoFecha(m.anulado!.fecha)} por {m.anulado!.por}</Tag>}
        </div>
        {m.motivo && <span className="lm-body-medium"><span className="muted">{m.tipo === TIPOS.finVida ? "Motivo de baja" : "Motivo de cambio"}:</span> {m.motivo}</span>}
        <div className="row">
          <ButtonToggle label="Ver antes o después del movimiento" value={vista} onChange={setVista}
            options={[{ value: "antes", label: "Antes" }, { value: "despues", label: "Después" }]} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(sitios.length, 3)}, minmax(0, 1fr))`, gap: "var(--lm-space-15)", alignItems: "start" }}>
          {sitios.map((s) => <CajaSitio key={s.key} sitio={s} vista={vista} items={itemsSitio(m, sitios, s, vista, corto)} />)}
        </div>
      </div>
    </Dialog>
  );
}

/** Deshacer: si tiene movimientos posteriores no se permite (HU-M02). */
export function DialogAnular({ id, onClose, onVer }: { id: string; onClose: () => void; onVer: (id: string) => void }) {
  const mov = useMovimientos();
  const t = useTextos();
  const snack = useSnackbar();
  const m = mov.movimientos.find((x) => x.id === id);
  if (!m) return null;
  const post = mov.posteriores(id);
  if (post.length) {
    const afectados = [...new Set(post.flatMap((p) => p.filas.map((f) => f.serie)).filter((s) => m.filas.some((f) => f.serie === s)))];
    return (
      <Dialog title={`No se puede deshacer ${m.id}`} onClose={onClose}
        message={`${afectados.length === 1 ? `El activo ${afectados[0]} tiene` : `Los activos ${afectados.join(", ")} tienen`} movimientos posteriores. Deshazlos antes, empezando por el más reciente:`}
        footer={<>
          <Button variant="outlined" onClick={() => onVer(post[0].id)}>Ver {post[0].id}</Button>
          <Button onClick={onClose}>Cerrar</Button>
        </>}>
        <ul className="stack gap-5" style={{ margin: 0, paddingLeft: "var(--lm-space-20)" }}>
          {post.map((p) => <li key={p.id}>{p.id} · {textoFecha(p.fecha)} · {p.tipo}</li>)}
        </ul>
      </Dialog>
    );
  }
  const principales = m.filas.filter((f) => !f.conPadre);
  const hijos = m.filas.length - principales.length;
  return (
    <Dialog title={`¿Deshacer el movimiento ${m.id}?`} onClose={onClose}
      footer={<>
        <Button variant="outlined" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => { mov.anular(m.id); onClose(); snack(`Movimiento ${m.id} deshecho`); }}>Deshacer movimiento</Button>
      </>}>
      <div className="stack gap-10">
        {principales.map((f) => <span key={f.serie}>{art(f.categoria, "el", true)} {f.serie} vuelve a {t.lugar(f.antes)}.</span>)}
        {!principales.length && m.principal && (m.tipo === TIPOS.montajeAlmacen || m.tipo === TIPOS.desmontajeAlmacen) && <span>{m.tipo === TIPOS.montajeAlmacen ? "Se desmontan del" : "Se vuelven a montar en el"} {m.principal.categoria.replace(/^./, (c) => c.toLowerCase())} {m.principal.serie}{m.tipo === TIPOS.montajeAlmacen ? " y vuelven a quedar sueltos" : ", en su posición anterior"}: {m.filas.map((f) => `${f.categoria} ${f.serie}`).join(", ")}.</span>}
        {hijos > 0 && !(m.principal && (m.tipo === TIPOS.montajeAlmacen || m.tipo === TIPOS.desmontajeAlmacen) && !principales.length) && <span>Sus {hijos} activos montados vuelven también a su posición anterior.</span>}
        <span className="muted">El movimiento seguirá en el historial como deshecho (filtro Estado).</span>
      </div>
    </Dialog>
  );
}
