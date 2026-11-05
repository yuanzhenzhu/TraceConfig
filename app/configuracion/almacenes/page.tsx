"use client";

// Almacenes del cliente: listado, añadir, modificar y eliminar. Diseño de referencia: pantalla Talleres (Consultas).

import { useEffect, useState } from "react";
import {
  Banner, Breadcrumb, Button, Dialog, EmptyState, Field, IconButton, Loading, Menu, Tag, useSnackbar,
} from "@/components/ds";
import { USOS_ALMACEN, nuevoId, type Almacen, type UsoAlmacen } from "@/lib/model";
import { useStore } from "@/lib/store";

type Demo = "normal" | "vacio" | "error" | "cargando";
const POR_PAGINA = [10, 25, 50];

export default function AlmacenesPage() {
  const store = useStore();
  const snack = useSnackbar();
  const [demo, setDemo] = useState<Demo>("normal");
  const [porPagina, setPorPagina] = useState(25);
  const [pagina, setPagina] = useState(0);
  const [editando, setEditando] = useState<Almacen | "nuevo" | null>(null);
  const [aEliminar, setAEliminar] = useState<Almacen | null>(null);

  useEffect(() => {
    const d = new URLSearchParams(window.location.search).get("demo") as Demo | null;
    if (d) setDemo(d);
  }, []);

  const lista = demo === "vacio" ? [] : store.almacenes;
  const paginas = Math.max(1, Math.ceil(lista.length / porPagina));
  const visibles = lista.slice(pagina * porPagina, (pagina + 1) * porPagina);
  const desde = lista.length ? pagina * porPagina + 1 : 0;
  const hasta = Math.min((pagina + 1) * porPagina, lista.length);

  return (
    <main className="lm-page">
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion" }, { label: "Almacenes" }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>Almacenes</h1>
        </div>
        <div className="lm-header__actions">
          <Button icon="add" onClick={() => setEditando("nuevo")}>Añadir almacén</Button>
        </div>
      </div>

      <section className="lm-surface lm-surface--p16">
        {!store.listo || demo === "cargando" ? (
          <Loading text="Cargando almacenes" />
        ) : demo === "error" ? (
          <Banner type="error" title="No se han podido cargar los almacenes"
            actions={<Button variant="outlined" small icon="sync" onClick={() => setDemo("normal")}>Reintentar</Button>}>
            Comprueba la conexión e inténtalo de nuevo
          </Banner>
        ) : lista.length === 0 ? (
          <EmptyState icon="domain" title="Todavía no hay almacenes"
            text="Añade los almacenes donde se guardan o se mantienen los activos"
            action={<Button variant="outlined" icon="add" onClick={() => setEditando("nuevo")}>Añadir almacén</Button>} />
        ) : (
          <>
            <table className="lm-table">
              <thead>
                <tr>
                  <th>Nombre de almacén</th><th>Ubicación</th><th>Contacto (teléfono)</th><th>Uso</th>
                  <th className="actions"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((a) => (
                  <tr key={a.id}>
                    <td>{a.nombre}</td>
                    <td>{a.ubicacion || <span className="muted">—</span>}</td>
                    <td>
                      {a.contacto || a.telefono ? (
                        <span className="stack">
                          <span>{a.contacto || "—"}</span>
                          {a.telefono && <span className="lm-body-small muted">{a.telefono}</span>}
                        </span>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td>
                      <span className="row gap-5 wrap">
                        {USOS_ALMACEN.filter((u) => a.usos.includes(u.id)).map((u) => <Tag key={u.id} tone="neutral">{u.nombre}</Tag>)}
                      </span>
                    </td>
                    <td className="actions">
                      <Menu label={`Acciones de ${a.nombre}`} items={[
                        { label: "Modificar", icon: "edit", onSelect: () => setEditando(a) },
                        "divider",
                        { label: "Eliminar", icon: "delete", danger: true, onSelect: () => setAEliminar(a) },
                      ]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="lm-paginator">
              <span className="row gap-10">
                <label htmlFor="alm-pp">Elementos por página</label>
                <select id="alm-pp" className="lm-select lm-select--dense" value={porPagina} onChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(0); }}>
                  {POR_PAGINA.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </span>
              <span>{desde} - {hasta} de {lista.length}</span>
              <span className="row">
                <IconButton icon="first_page" label="Primera página" disabled={pagina === 0} onClick={() => setPagina(0)} />
                <IconButton icon="chevron_left" label="Página anterior" disabled={pagina === 0} onClick={() => setPagina((p) => p - 1)} />
                <IconButton icon="chevron_right" label="Página siguiente" disabled={pagina >= paginas - 1} onClick={() => setPagina((p) => p + 1)} />
                <IconButton icon="last_page" label="Última página" disabled={pagina >= paginas - 1} onClick={() => setPagina(paginas - 1)} />
              </span>
            </div>
          </>
        )}
      </section>

      <footer className="row gap-10 wrap" style={{ marginTop: "var(--lm-space-40)", color: "var(--lm-sys-on-surface-variant)" }}>
        <span className="lm-label-medium">PROTOTIPO · Ver estado:</span>
        {(["normal", "cargando", "vacio", "error"] as Demo[]).map((d) => (
          <button key={d} className="lm-chip" aria-pressed={demo === d} onClick={() => setDemo(d)}>
            {{ normal: "Con datos", cargando: "Cargando", vacio: "Vacío", error: "Error" }[d]}
          </button>
        ))}
      </footer>

      {editando && (
        <DialogAlmacen
          almacen={editando === "nuevo" ? undefined : editando}
          ocupados={store.almacenes.filter((x) => editando === "nuevo" || x.id !== editando.id).map((x) => x.nombre.trim().toLowerCase())}
          onClose={() => setEditando(null)}
          onGuardar={(a) => {
            store.guardarAlmacen(a);
            snack(editando === "nuevo" ? `${a.nombre} añadido` : `Cambios guardados en ${a.nombre}`);
            setEditando(null);
          }} />
      )}

      {aEliminar && (
        <Dialog title="¿Eliminar el almacén?" onClose={() => setAEliminar(null)}
          message={`Se eliminará "${aEliminar.nombre}". Esta acción no se puede deshacer.`}
          footer={<>
            <Button variant="outlined" onClick={() => setAEliminar(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => { store.eliminarAlmacen(aEliminar.id); snack(`${aEliminar.nombre} eliminado`); setAEliminar(null); }}>Eliminar</Button>
          </>} />
      )}
    </main>
  );
}

/** Añadir o modificar un almacén. Nombre y uso son obligatorios. */
function DialogAlmacen({ almacen, ocupados, onClose, onGuardar }: {
  almacen?: Almacen; ocupados: string[]; onClose: () => void; onGuardar: (a: Almacen) => void;
}) {
  const [nombre, setNombre] = useState(almacen?.nombre ?? "");
  const [ubicacion, setUbicacion] = useState(almacen?.ubicacion ?? "");
  const [contacto, setContacto] = useState(almacen?.contacto ?? "");
  const [telefono, setTelefono] = useState(almacen?.telefono ?? "");
  const [usos, setUsos] = useState<UsoAlmacen[]>(almacen?.usos ?? []);
  const errNombre = !nombre.trim() ? "Indica el nombre del almacén" : ocupados.includes(nombre.trim().toLowerCase()) ? "Ya existe un almacén con este nombre" : "";
  const errTelefono = telefono.trim() && !/^[+\d][\d\s]{5,}$/.test(telefono.trim()) ? "Indica un teléfono válido, por ejemplo 943 10 50 45" : "";
  const valido = !errNombre && !errTelefono && usos.length > 0;
  const toggle = (u: UsoAlmacen, on: boolean) => setUsos((l) => (on ? [...l, u] : l.filter((x) => x !== u)));
  const guardar = () => {
    if (!valido) return;
    onGuardar({ id: almacen?.id ?? nuevoId("alm"), nombre: nombre.trim(), ubicacion: ubicacion.trim(), contacto: contacto.trim(), telefono: telefono.trim(), usos });
  };

  return (
    <Dialog title={almacen ? `Modificar ${almacen.nombre}` : "Añadir almacén"} onClose={onClose}
      footer={<>
        <Button variant="outlined" onClick={onClose}>Cancelar</Button>
        <Button disabled={!valido} onClick={guardar}>{almacen ? "Guardar" : "Añadir"}</Button>
      </>}>
      <div className="stack gap-20">
        <Field label="Nombre de almacén" required htmlFor="al-nombre" error={nombre && errNombre ? errNombre : ""}>
          <input id="al-nombre" className="lm-input" value={nombre} aria-invalid={!!nombre && !!errNombre} placeholder="Por ejemplo: Almacén Cocheras Sur" onChange={(e) => setNombre(e.target.value)} />
        </Field>
        <Field label="Ubicación" htmlFor="al-ubic">
          <input id="al-ubic" className="lm-input" value={ubicacion} placeholder="Por ejemplo: Beasain" onChange={(e) => setUbicacion(e.target.value)} />
        </Field>
        <Field label="Contacto" htmlFor="al-contacto">
          <input id="al-contacto" className="lm-input" value={contacto} placeholder="Por ejemplo: Servicio técnico CAF" onChange={(e) => setContacto(e.target.value)} />
        </Field>
        <Field label="Teléfono" htmlFor="al-tel" error={errTelefono}>
          <input id="al-tel" className="lm-input" inputMode="tel" value={telefono} aria-invalid={!!errTelefono} placeholder="Por ejemplo: 943 10 50 45" onChange={(e) => setTelefono(e.target.value)} />
        </Field>
        <fieldset className="stack gap-10" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="lm-field__label" style={{ marginBottom: "var(--lm-space-10)" }}>Uso <span style={{ color: "var(--lm-sys-error)" }}>*</span></legend>
          <div className="row gap-30">
            {USOS_ALMACEN.map((u) => (
              <label key={u.id} className="lm-check">
                <input type="checkbox" checked={usos.includes(u.id)} onChange={(e) => toggle(u.id, e.target.checked)} />{u.nombre}
              </label>
            ))}
          </div>
          <span className="lm-field__support">Elige al menos uno</span>
        </fieldset>
      </div>
    </Dialog>
  );
}
