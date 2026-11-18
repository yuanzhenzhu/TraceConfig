"use client";

// (Prueba, 18-11-2026) Cambio de número de serie (Figma Main-Trace 1142:53037 y 1142:53222).
// Al entrar se cargan todos los activos del cliente, ordenados por categoría. Se filtra por nº de serie y categoría
// (botón Buscar). Cada nº de serie se edita con el lápiz o con el menú de 3 puntos «Editar número de serie»:
// dialog con el nº nuevo y snackbar al guardar. Para muchos a la vez, «Cambio de nº de serie con plantilla» abre el
// asistente de 4 pasos (./plantilla). Los activos y sus nº de serie son ficticios.

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Breadcrumb, Button, Dialog, EmptyState, Field, IconButton, Loading, Menu, SearchInput, useSnackbar } from "@/components/ds";
import { generarActivos, type Activo } from "@/lib/activos";
import { CATEGORIAS } from "@/lib/model";
import { useStore } from "@/lib/store";
import { etiquetaCfg } from "@/components/configuracion-prueba/nombre";
import { useCambiosSerie } from "@/components/configuracion-prueba/series";

const POR_PAGINA = 25;

export default function CambioNumeroSeriePage() {
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const { cambios, aplicar } = useCambiosSerie();
  const [texto, setTexto] = useState("");
  const [cat, setCat] = useState("");
  const [filtro, setFiltro] = useState({ texto: "", cat: "" });
  const [pagina, setPagina] = useState(0);
  const [editando, setEditando] = useState<Activo | null>(null);

  const serie = (a: Activo) => cambios[a.id] ?? a.serie;
  const orden = (c: string) => { const i = CATEGORIAS.indexOf(c); return i < 0 ? 999 : i; };
  // Todos los activos del cliente, ordenados por categoría (en el orden del catálogo) y luego por nº de serie
  const activos = useMemo(() => generarActivos(store.flotas, store.configs, store.estructuras, store.almacenes)
    .sort((a, b) => orden(a.categoria) - orden(b.categoria) || a.serie.localeCompare(b.serie, "es")),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [store.flotas, store.configs, store.estructuras, store.almacenes]);
  const categorias = [...new Set(activos.map((a) => a.categoria))];
  const ubicacion = (a: Activo) => {
    if (a.donde === "almacen") return store.almacenes.find((x) => x.id === a.almacenId)?.nombre ?? "Almacén";
    const c = store.configs.find((x) => x.id === a.configId);
    return `${c ? etiquetaCfg(store, c) : ""} · Unidad ${a.unidad} › ${a.hueco}`;
  };

  const lista = activos.filter((a) => (!filtro.cat || a.categoria === filtro.cat)
    && (!filtro.texto || serie(a).toLowerCase().includes(filtro.texto.toLowerCase())));
  const visibles = lista.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);
  const buscar = () => { setFiltro({ texto: texto.trim(), cat }); setPagina(0); };
  const restablecer = () => { setTexto(""); setCat(""); setFiltro({ texto: "", cat: "" }); setPagina(0); };

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion-prueba" }, { label: "Cambio de número de serie" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Cambio de número de serie</h1>
          <span className="muted">Cambia el nº de serie de activos ya dados de alta, montados en una unidad o guardados en un almacén.</span>
        </div>
        <div className="lm-header__actions">
          <Button icon="file_upload" onClick={() => router.push("/configuracion-prueba/cambio-numero-serie/plantilla")}>Cambio de nº de serie con plantilla</Button>
        </div>
      </div>

      <section className="lm-surface lm-surface--p16">
        <form className="lm-filters" style={{ alignItems: "flex-end" }} onSubmit={(e) => { e.preventDefault(); buscar(); }}>
          <div style={{ width: 280 }}><SearchInput label="Buscar nº de serie" placeholder="Buscar nº de serie" value={texto} onChange={setTexto} /></div>
          <Field label="Categoría" htmlFor="ns-cat">
            <select id="ns-cat" className="lm-select lm-select--dense" value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">Todas las categorías</option>
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Button type="submit" variant="tonal" icon="search">Buscar</Button>
          {(filtro.texto || filtro.cat) && <Button variant="text" icon="restart_alt" onClick={restablecer}>Restablecer</Button>}
        </form>

        {!store.listo ? <Loading text="Cargando activos" /> : activos.length === 0 ? (
          <EmptyState icon="search_off" title="Todavía no hay activos" text="Los activos aparecen al dar de alta las configuraciones o al guardarlos en un almacén" />
        ) : lista.length === 0 ? (
          <EmptyState icon="search_off" title="No hay resultados" text="Ningún activo coincide con los filtros"
            action={<Button variant="outlined" onClick={restablecer}>Restablecer filtros</Button>} />
        ) : (
          <>
            <table className="lm-table">
              <thead><tr><th style={{ width: 280 }}>Nº de serie</th><th>Categoría</th><th>Ubicación</th><th className="actions"><span className="sr-only">Acciones</span></th></tr></thead>
              <tbody>
                {visibles.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <span className="row gap-5">
                        <span className="emph">{serie(a)}</span>
                        <IconButton compact icon="edit" label={`Editar el nº de serie ${serie(a)}`} onClick={() => setEditando(a)} />
                      </span>
                    </td>
                    <td>{a.categoria}</td>
                    <td className="muted">{ubicacion(a)}</td>
                    <td className="actions">
                      <Menu label={`Acciones de ${serie(a)}`} items={[{ label: "Editar número de serie", icon: "edit", onSelect: () => setEditando(a) }]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="lm-paginator">
              <span>{pagina * POR_PAGINA + 1} - {Math.min((pagina + 1) * POR_PAGINA, lista.length)} de {lista.length.toLocaleString("es-ES")}</span>
              <span className="row">
                <IconButton icon="chevron_left" label="Página anterior" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)} />
                <IconButton icon="chevron_right" label="Página siguiente" disabled={(pagina + 1) * POR_PAGINA >= lista.length} onClick={() => setPagina((p) => p + 1)} />
              </span>
            </div>
          </>
        )}
      </section>

      {editando && (
        <DialogEditar actual={serie(editando)} categoria={editando.categoria} ubicacion={ubicacion(editando)}
          existe={(v) => activos.some((x) => x.id !== editando.id && serie(x).toLowerCase() === v.toLowerCase())}
          onClose={() => setEditando(null)}
          onGuardar={(nuevo) => {
            const antes = serie(editando);
            aplicar({ [editando.id]: nuevo });
            setEditando(null);
            snack(`Nº de serie cambiado: ${antes} → ${nuevo}`);
          }} />
      )}
    </main>
  );
}

function DialogEditar({ actual, categoria, ubicacion, existe, onClose, onGuardar }: {
  actual: string; categoria: string; ubicacion: string; existe: (v: string) => boolean;
  onClose: () => void; onGuardar: (nuevo: string) => void;
}) {
  const [valor, setValor] = useState(actual);
  const [intentado, setIntentado] = useState(false);
  const v = valor.trim();
  const err = !v ? "Indica el nº de serie" : existe(v) ? "Ya existe un activo con este nº de serie" : "";
  const guardar = () => { setIntentado(true); if (!err) onGuardar(v); };
  return (
    <Dialog title="Editar número de serie" message={`${categoria} · ${ubicacion}`} onClose={onClose}
      footer={<>
        <Button variant="outlined" onClick={onClose}>Cancelar</Button>
        <Button disabled={v === actual} onClick={guardar}>Guardar</Button>
      </>}>
      <form onSubmit={(e) => { e.preventDefault(); guardar(); }}>
        <Field label="Nº de serie" required htmlFor="ns-nuevo" error={intentado ? err : ""} support={`Actual: ${actual}`}>
          <input id="ns-nuevo" className="lm-input" value={valor} aria-invalid={intentado && !!err} onChange={(e) => setValor(e.target.value)} />
        </Field>
      </form>
    </Dialog>
  );
}
