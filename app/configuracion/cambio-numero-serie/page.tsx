"use client";

// (Prueba) Cambio de número de serie de activos ya dados de alta, en unidades o en almacén.
// - Con plantilla: se elige el alcance (todas las flotas, una flota, una unidad, o un almacén), se descarga
//   una plantilla con los nº de serie actuales, se rellena el nuevo y se sube para revisar y aplicar los cambios.
// - Activo concreto: se filtra (nº de serie, categoría), se busca y se cambia con doble clic sobre el nº de serie.
// Los activos y sus nº de serie son ficticios.

import { useMemo, useRef, useState } from "react";
import { Banner, Breadcrumb, Button, EmptyState, Field, Icon, Spinner, useSnackbar } from "@/components/ds";
import { descargarCsv, generarActivos, unidadesDe, type Activo } from "@/lib/activos";
import { useStore } from "@/lib/store";

type Cambio = { a: Activo; nuevo: string };

export default function CambioNumeroSeriePage() {
  const store = useStore();
  const snack = useSnackbar();
  const [pestana, setPestana] = useState<"plantilla" | "activo">("plantilla");
  const [cambiados, setCambiados] = useState<Record<string, string>>({}); // id -> nº de serie nuevo (en esta sesión)

  const activos = useMemo(() => generarActivos(store.flotas, store.configs, store.estructuras, store.almacenes),
    [store.flotas, store.configs, store.estructuras, store.almacenes]);
  const serie = (a: Activo) => cambiados[a.id] ?? a.serie;
  const ubicacion = (a: Activo) => {
    if (a.donde === "almacen") return store.almacenes.find((x) => x.id === a.almacenId)?.nombre ?? "Almacén";
    const c = store.configs.find((x) => x.id === a.configId);
    return `${c ? store.etiqueta(c) : ""} · Unidad ${a.unidad} › ${a.hueco}`;
  };
  const aplicar = (lista: Cambio[]) => setCambiados((m) => ({ ...m, ...Object.fromEntries(lista.map((x) => [x.a.id, x.nuevo])) }));

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion" }, { label: "Cambio de número de serie" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Cambio de número de serie</h1>
          <span className="muted">Cambia el nº de serie de activos ya dados de alta, montados en una unidad o guardados en un almacén.</span>
        </div>
      </div>

      <div className="lm-tabs" role="tablist">
        <button role="tab" className="lm-tab" aria-selected={pestana === "plantilla"} onClick={() => setPestana("plantilla")}><Icon name="table_chart" /> Con plantilla</button>
        <button role="tab" className="lm-tab" aria-selected={pestana === "activo"} onClick={() => setPestana("activo")}><Icon name="search" /> Activo concreto</button>
      </div>

      {pestana === "plantilla"
        ? <ConPlantilla activos={activos} serie={serie} ubicacion={ubicacion} onAplicar={(l) => { aplicar(l); snack(`${l.length} números de serie actualizados`); }} />
        : <ActivoConcreto activos={activos} serie={serie} ubicacion={ubicacion} onCambiar={(a, nuevo) => { aplicar([{ a, nuevo }]); snack(`Nº de serie cambiado: ${serie(a)} → ${nuevo}`); }} />}
    </main>
  );
}

/* ---------- Con plantilla ---------- */
function ConPlantilla({ activos, serie, ubicacion, onAplicar }: {
  activos: Activo[]; serie: (a: Activo) => string; ubicacion: (a: Activo) => string; onAplicar: (l: Cambio[]) => void;
}) {
  const store = useStore();
  const [donde, setDonde] = useState<"unidad" | "almacen">("unidad");
  const [flota, setFlota] = useState("");
  const [unidad, setUnidad] = useState(""); // "configId|1001"
  const [almacen, setAlmacen] = useState("");
  const [cat, setCat] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [estado, setEstado] = useState<"nada" | "validando" | "ok" | "errores">("nada");
  const [cambios, setCambios] = useState<Cambio[]>([]);
  const input = useRef<HTMLInputElement>(null);

  const unidades = unidadesDe(store.configs, store.estructuras);
  const flotasConUnidades = store.flotas.filter((f) => unidades.some((u) => u.c.flotaId === f.id));
  const unidadesFlota = unidades.filter((u) => u.c.flotaId === flota);

  const enAlcance = activos.filter((a) => a.donde === donde
    && (donde === "unidad"
      ? (!flota || a.flotaId === flota) && (!unidad || `${a.configId}|${a.unidad}` === unidad)
      : !almacen || a.almacenId === almacen));
  const categorias = [...new Set(enAlcance.map((a) => a.categoria))];
  const seleccion = enAlcance.filter((a) => !cat || a.categoria === cat);

  const textoAlcance = donde === "almacen"
    ? (almacen ? store.almacenes.find((x) => x.id === almacen)?.nombre : "Todos los almacenes")
    : !flota ? "Todas las flotas"
    : unidad ? `${store.flotas.find((f) => f.id === flota)?.nombre} · Unidad ${unidad.split("|")[1]}`
    : `${store.flotas.find((f) => f.id === flota)?.nombre} · Todas las unidades`;
  const reiniciarSubida = () => { setArchivo(null); setEstado("nada"); setCambios([]); };
  const cambiarAlcance = (fn: () => void) => { fn(); reiniciarSubida(); };

  const validar = (f: File) => {
    setArchivo(f); setEstado("validando");
    // Simulación: un archivo con "error" en el nombre devuelve errores; si no, se cambian algunos activos del alcance.
    setTimeout(() => {
      if (f.name.toLowerCase().includes("error")) { setEstado("errores"); return; }
      const muestra = seleccion.slice(0, Math.min(5, seleccion.length));
      setCambios(muestra.map((a) => ({ a, nuevo: serie(a).replace(/(\d{3})$/, (m) => String(500 + Number(m)).padStart(3, "0")) })));
      setEstado("ok");
    }, 1200);
  };

  return (
    <div className="stack gap-20">
      <section className="lm-surface lm-surface--p24 stack gap-20">
        <h2 className="lm-title-medium" style={{ margin: 0 }}>1. Elige los activos y descarga la plantilla</h2>
        <fieldset className="row gap-30" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="lm-field__label" style={{ marginBottom: "var(--lm-space-10)" }}>¿Dónde están los activos?</legend>
          <label className="lm-radio"><input type="radio" name="cns-donde" checked={donde === "unidad"} onChange={() => cambiarAlcance(() => { setDonde("unidad"); setCat(""); })} />Montados en unidades</label>
          <label className="lm-radio"><input type="radio" name="cns-donde" checked={donde === "almacen"} onChange={() => cambiarAlcance(() => { setDonde("almacen"); setCat(""); })} />En almacén</label>
        </fieldset>

        <div className="row gap-20 wrap" style={{ alignItems: "flex-start" }}>
          {donde === "unidad" ? (
            <>
              <Field label="Flota" htmlFor="cns-flota" style={{ width: 260 }}>
                <select id="cns-flota" className="lm-select" value={flota} onChange={(e) => cambiarAlcance(() => { setFlota(e.target.value); setUnidad(""); setCat(""); })}>
                  <option value="">Todas las flotas</option>
                  {flotasConUnidades.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                </select>
              </Field>
              <Field label="Unidad" htmlFor="cns-unidad" style={{ width: 280 }} support={!flota ? "Elige antes una flota" : undefined}>
                <select id="cns-unidad" className="lm-select" value={unidad} disabled={!flota} onChange={(e) => cambiarAlcance(() => { setUnidad(e.target.value); setCat(""); })}>
                  <option value="">Todas las unidades</option>
                  {unidadesFlota.map(({ c, series }) => (
                    <optgroup key={c.id} label={store.etiqueta(c)}>
                      {series.map((s) => <option key={s} value={`${c.id}|${s}`}>Unidad {s}</option>)}
                    </optgroup>
                  ))}
                </select>
              </Field>
            </>
          ) : (
            <Field label="Almacén" htmlFor="cns-alm" style={{ width: 300 }}>
              <select id="cns-alm" className="lm-select" value={almacen} onChange={(e) => cambiarAlcance(() => { setAlmacen(e.target.value); setCat(""); })}>
                <option value="">Todos los almacenes</option>
                {store.almacenes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </Field>
          )}
          <Field label="Categoría" htmlFor="cns-cat" style={{ width: 240 }}>
            <select id="cns-cat" className="lm-select" value={cat} onChange={(e) => cambiarAlcance(() => setCat(e.target.value))}>
              <option value="">Todas las categorías</option>
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>

        <div className="lm-card row gap-20">
          <Icon name="table_chart" size="xl" />
          <span className="stack grow">
            <span className="lm-title-small">{textoAlcance}{cat && ` · ${cat}`}</span>
            <span className="muted">{seleccion.length.toLocaleString("es-ES")} activos con su nº de serie actual. Escribe el nuevo solo en los que cambien</span>
          </span>
          <Button variant="outlined" icon="file_download" disabled={!seleccion.length}
            onClick={() => descargarCsv(`cambio-numero-serie-${textoAlcance}${cat ? `-${cat}` : ""}`, seleccion.map((a) => ({ ...a, serie: serie(a) })), ubicacion)}>
            Descargar plantilla
          </Button>
        </div>
      </section>

      <section className="lm-surface lm-surface--p24 stack gap-20">
        <h2 className="lm-title-medium" style={{ margin: 0 }}>2. Sube la plantilla con los números de serie nuevos</h2>
        {estado === "nada" ? (
          <div className="stack gap-10 lm-center" style={{ padding: "var(--lm-space-40)", border: "1px dashed var(--lm-sys-outline)", borderRadius: "var(--lm-corner-30)" }}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) validar(e.dataTransfer.files[0]); }}>
            <Icon name="file_upload" size="xl" />
            <span>Arrastra aquí la plantilla o</span>
            <Button variant="outlined" small onClick={() => input.current?.click()}>Seleccionar archivo</Button>
            <span className="lm-body-small">Formatos admitidos: .xlsx, .csv</span>
            <input ref={input} type="file" accept=".xlsx,.csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) validar(f); }} />
          </div>
        ) : estado === "validando" ? (
          <div className="lm-center" style={{ padding: "var(--lm-space-40)" }}><Spinner label="Validando plantilla" /><span>Validando {archivo?.name}</span></div>
        ) : estado === "errores" ? (
          <>
            <Banner type="error" title="La plantilla tiene errores" actions={<Button variant="outlined" small icon="file_upload" onClick={reiniciarSubida}>Subir otra</Button>}>
              No se ha cambiado ningún nº de serie. Corrige las filas indicadas y súbela de nuevo.
            </Banner>
            <table className="lm-table">
              <thead><tr><th>Fila</th><th>Nº de serie nuevo</th><th>Error</th></tr></thead>
              <tbody>
                <tr><td>8</td><td>RU-1001-014</td><td>Ya existe un activo con este nº de serie</td></tr>
                <tr><td>15</td><td>EJ-1002-007</td><td>Está repetido en la fila 11</td></tr>
                <tr><td>23</td><td>—</td><td>Falta el nº de serie actual: no se puede identificar el activo</td></tr>
              </tbody>
            </table>
          </>
        ) : (
          <>
            <Banner type="success" title={`${cambios.length} números de serie a cambiar`}
              actions={<Button variant="text" small onClick={reiniciarSubida}>Descartar</Button>}>
              {archivo?.name}: revisa los cambios y pulsa Aplicar cambios. Las filas sin nº de serie nuevo no cambian.
            </Banner>
            <table className="lm-table">
              <thead><tr><th>Ubicación</th><th>Categoría</th><th>Nº de serie actual</th><th>Nº de serie nuevo</th></tr></thead>
              <tbody>
                {cambios.map(({ a, nuevo }) => (
                  <tr key={a.id}>
                    <td className="muted">{ubicacion(a)}</td><td>{a.categoria}</td><td>{serie(a)}</td><td className="emph">{nuevo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="row gap-10" style={{ justifyContent: "flex-end" }}>
              <Button variant="outlined" onClick={reiniciarSubida}>Cancelar</Button>
              <Button icon="check" onClick={() => { onAplicar(cambios); reiniciarSubida(); }}>Aplicar cambios</Button>
            </div>
          </>
        )}
        <span className="lm-body-small muted">Prototipo: un archivo con "error" en el nombre simula una plantilla con errores.</span>
      </section>
    </div>
  );
}

/* ---------- Activo concreto ---------- */
/**
 * Se filtra por nº de serie actual y categoría, se pulsa Buscar y el nº de serie se cambia con doble clic sobre él (Enter guarda, Esc cancela).
 */
function ActivoConcreto({ activos, serie, ubicacion, onCambiar }: {
  activos: Activo[]; serie: (a: Activo) => string; ubicacion: (a: Activo) => string; onCambiar: (a: Activo, nuevo: string) => void;
}) {
  const [texto, setTexto] = useState("");
  const [cat, setCat] = useState("");
  const [buscado, setBuscado] = useState<{ texto: string; cat: string } | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [valor, setValor] = useState("");
  const [antes, setAntes] = useState<Record<string, string>>({}); // nº de serie anterior de los cambiados aquí
  const MAX = 50;

  const categorias = [...new Set(activos.map((a) => a.categoria))].sort((a, b) => a.localeCompare(b, "es"));
  const cumple = (a: Activo, f: { texto: string; cat: string }) => {
    if (f.cat && a.categoria !== f.cat) return false;
    if (f.texto && !serie(a).toLowerCase().includes(f.texto.toLowerCase())) return false;
    return true;
  };
  const res = buscado ? activos.filter((a) => cumple(a, buscado)) : [];
  const buscar = () => { setBuscado({ texto: texto.trim(), cat }); setEditando(null); };
  const limpiar = () => { setTexto(""); setCat(""); setBuscado(null); setEditando(null); };

  const v = valor.trim();
  const errEdicion = (a: Activo) => !v ? "Indica el nº de serie"
    : v.toLowerCase() !== serie(a).toLowerCase() && activos.some((x) => x.id !== a.id && serie(x).toLowerCase() === v.toLowerCase()) ? "Ya existe un activo con este nº de serie" : "";
  const empezar = (a: Activo) => { setEditando(a.id); setValor(serie(a)); };
  const guardar = (a: Activo) => {
    if (errEdicion(a)) return;
    if (v !== serie(a)) { setAntes((m) => ({ ...m, [a.id]: m[a.id] ?? serie(a) })); onCambiar(a, v); }
    setEditando(null);
  };

  return (
    <section className="lm-surface lm-surface--p16 stack gap-15">
      <form className="lm-filters" style={{ alignItems: "flex-end" }} onSubmit={(e) => { e.preventDefault(); buscar(); }}>
        <Field label="Nº de serie actual" htmlFor="ac-serie" style={{ width: 260 }}>
          <input id="ac-serie" className="lm-input lm-input--dense" value={texto} placeholder="Por ejemplo: RU-1001" onChange={(e) => setTexto(e.target.value)} />
        </Field>
        <Field label="Categoría" htmlFor="ac-cat">
          <select id="ac-cat" className="lm-select lm-select--dense" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Button type="submit" icon="search">Buscar</Button>
        {buscado && <Button variant="text" icon="restart_alt" onClick={limpiar}>Restablecer</Button>}
      </form>

      {!buscado ? (
        <EmptyState icon="search" title="Busca los activos que quieres cambiar" text="Filtra por nº de serie o categoría y pulsa Buscar" />
      ) : res.length === 0 ? (
        <EmptyState icon="search_off" title="No hay resultados" text="Ningún activo coincide con los filtros"
          action={<Button variant="outlined" onClick={limpiar}>Restablecer filtros</Button>} />
      ) : (
        <>
          <span className="lm-body-small muted row gap-5"><Icon name="info" size="m" />Haz doble clic en un nº de serie para cambiarlo. Enter guarda y Esc cancela.</span>
          <table className="lm-table">
            <thead><tr><th style={{ width: 300 }}>Nº de serie</th><th>Categoría</th><th>Ubicación</th></tr></thead>
            <tbody>
              {res.slice(0, MAX).map((a) => {
                const err = editando === a.id ? errEdicion(a) : "";
                return (
                  <tr key={a.id}>
                    <td>
                      {editando === a.id ? (
                        <span className="stack gap-5">
                          <input className="lm-input lm-input--dense" autoFocus value={valor} aria-label={`Nº de serie nuevo de ${serie(a)}`} aria-invalid={!!err}
                            onChange={(e) => setValor(e.target.value)} onBlur={() => (err ? setEditando(null) : guardar(a))}
                            onKeyDown={(e) => { if (e.key === "Enter") guardar(a); if (e.key === "Escape") setEditando(null); }} />
                          {err && <span className="lm-field__support lm-field__support--error" role="alert">{err}</span>}
                        </span>
                      ) : (
                        <span className="row gap-10" tabIndex={0} role="button" aria-label={`${serie(a)}: doble clic o Enter para cambiarlo`}
                          title="Doble clic para cambiar" style={{ cursor: "text" }}
                          onDoubleClick={() => empezar(a)} onKeyDown={(e) => { if (e.key === "Enter") empezar(a); }}>
                          <span className="emph">{serie(a)}</span>
                          {antes[a.id] && <span className="lm-body-small muted">antes {antes[a.id]}</span>}
                        </span>
                      )}
                    </td>
                    <td>{a.categoria}</td>
                    <td className="muted">{ubicacion(a)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {res.length > MAX && <span className="lm-body-small muted">Se muestran {MAX} de {res.length.toLocaleString("es-ES")} activos. Afina los filtros para ver menos</span>}
        </>
      )}
    </section>
  );
}
