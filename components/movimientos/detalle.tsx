"use client";

// Piezas comunes de Movimientos: tabla Antes → Después, resumen de un movimiento, detalle y anular (HU-M00 §1, HU-M01, HU-M02).

import { Button, Dialog, Icon, Tag, useSnackbar } from "@/components/ds";
import { formatoKm, textoFecha, useMovimientos, useTextos, type FilaMov, type Movimiento } from "@/lib/movimientos";

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
export type Participante = { categoria: string; serie: string; hijos: { pos: string; serie: string; cambio?: string }[] };

const relHueco = (h: string, base: string) => (h.startsWith(base + " › ") ? h.slice(base.length + 3) : h);

/**
 * Activos que participan en un movimiento (1 o 2), cada uno con sus activos montados que se mueven con él.
 * En una rotación, el participante es el bogie y sus hijos llevan el cambio de posición.
 */
export function participantes(m: Movimiento): Participante[] {
  const principales = m.filas.filter((f) => !f.conPadre);
  const hijos = m.filas.filter((f) => f.conPadre);
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

/** Celda de un participante: el activo y, debajo, sus activos montados desplegados. */
export function CeldaParticipante({ p, tachado }: { p?: Participante; tachado?: boolean }) {
  if (!p) return <span className="muted">—</span>;
  const estilo = tachado ? { textDecoration: "line-through" } : undefined;
  return (
    <div className="stack" style={{ padding: "var(--lm-space-10) 0", ...estilo }}>
      <span style={{ fontWeight: 500 }}>{p.categoria} {p.serie}</span>
      {p.hijos.map((h) => (
        <span key={h.serie} className="lm-body-small muted" style={{ paddingLeft: "var(--lm-space-15)" }}>
          {h.cambio !== undefined ? <>{h.pos} → <strong style={{ color: "var(--lm-sys-on-surface)" }}>{h.cambio}</strong></> : h.pos} · {h.serie}
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

/** Detalle de un movimiento (igual para todos los tipos). */
export function DialogDetalle({ id, onClose, onAnular, onVer }: { id: string; onClose: () => void; onAnular: (id: string) => void; onVer: (id: string) => void }) {
  const mov = useMovimientos();
  const t = useTextos();
  const donde = useDonde();
  const m = mov.movimientos.find((x) => x.id === id);
  if (!m) return null;
  const post = mov.posteriores(id);
  const seguidos = m.grupo ? mov.movimientos.filter((x) => x.grupo === m.grupo && x.id !== id) : [];
  const motivo = m.estado === "anulado" ? "Ya está anulado" : post.length ? "Tiene movimientos posteriores" : undefined;
  return (
    <Dialog large title={`Movimiento ${m.id} · ${m.tipo}`} onClose={onClose}
      footer={<>
        <Button variant="outlined" icon="block" disabled={!!motivo} title={motivo} onClick={() => onAnular(m.id)}>Anular movimiento</Button>
        <Button onClick={onClose}>Cerrar</Button>
      </>}>
      <div className="stack gap-15">
        <div className="row gap-10 wrap lm-body-medium">
          <span style={{ fontWeight: 500 }}>{textoFecha(m.fecha)}</span>
          {m.registros.map((r) => (
            <span key={r.unidad}>· Unidad {r.unidad} ({t.flotaDeUnidad(r.unidad)}){r.km !== null && ` · ${formatoKm(r.km)} km`}{r.horas != null && ` · ${formatoKm(r.horas)} h`}{r.ciclos != null && ` · ${formatoKm(r.ciclos)} ciclos`}</span>
          ))}
          {m.almacenes.map((a) => <span key={a}>· {t.nombreAlmacen(a)}</span>)}
          <span className="muted">· Registrado por {m.por}</span>
          {m.estado === "anulado"
            ? <Tag tone="neutral">Anulado el {textoFecha(m.anulado!.fecha)} por {m.anulado!.por}</Tag>
            : <Tag tone="success">Registrado</Tag>}
        </div>
        {seguidos.length > 0 && (
          <span className="row gap-5 lm-body-small"><Icon name="link" size="m" /> Seguido de
            {seguidos.map((s) => <Button key={s.id} variant="text" small onClick={() => onVer(s.id)}>{s.id}</Button>)}
          </span>
        )}
        <TablaAntesDespues filas={m.filas} />
      </div>
    </Dialog>
  );
}

/** Anular: si tiene movimientos posteriores no se permite (HU-M02). */
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
      <Dialog title={`No se puede anular ${m.id}`} onClose={onClose}
        message={`${afectados.length === 1 ? `El activo ${afectados[0]} tiene` : `Los activos ${afectados.join(", ")} tienen`} movimientos posteriores. Anula antes, empezando por el más reciente:`}
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
    <Dialog title={`¿Anular el movimiento ${m.id}?`} onClose={onClose}
      footer={<>
        <Button variant="outlined" onClick={onClose}>Cancelar</Button>
        <Button onClick={() => { mov.anular(m.id); onClose(); snack(`Movimiento ${m.id} anulado`); }}>Anular movimiento</Button>
      </>}>
      <div className="stack gap-10">
        {principales.map((f) => <span key={f.serie}>El {f.categoria.replace(/^./, (c) => c.toLowerCase())} {f.serie} vuelve a {t.lugar(f.antes)}.</span>)}
        {hijos > 0 && <span>Sus {hijos} activos montados vuelven también a su posición anterior.</span>}
        <span className="muted">El movimiento seguirá en el historial, tachado.</span>
      </div>
    </Dialog>
  );
}
