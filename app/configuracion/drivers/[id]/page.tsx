"use client";

// Crear o modificar un perfil de drivers, viendo antes a qué configuraciones afecta.

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Banner, Breadcrumb, Button, Dialog, EmptyState, Field, Loading, Tag, useSnackbar } from "@/components/ds";
import { EditorDrivers } from "@/components/drivers";
import { driversIniciales, nuevoId, type PerfilDrivers } from "@/lib/model";
import { useStore } from "@/lib/store";

export default function EditarPerfilPage() {
  const { id } = useParams<{ id: string }>();
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const esNuevo = id === "nuevo";
  const original = esNuevo ? undefined : store.perfil(id);

  const [borrador, setBorrador] = useState<PerfilDrivers | null>(null);
  const [intentado, setIntentado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  useEffect(() => {
    if (!store.listo || borrador) return;
    if (esNuevo) {
      const e = store.estructuras[0];
      if (e) setBorrador({ id: nuevoId("drv"), nombre: "", descripcion: "", estructuraId: e.id, ...driversIniciales(e.raiz) });
    } else if (original) setBorrador(structuredClone(original));
  }, [store.listo, esNuevo, original, borrador, store.estructuras]);

  if (!store.listo || (!borrador && (esNuevo || original))) return <main className="lm-page"><Loading text="Cargando perfil" /></main>;
  if (!borrador) {
    return (
      <main className="lm-page">
        <EmptyState icon="search_off" title="No se ha encontrado el perfil de drivers" action={<Button onClick={() => router.push("/configuracion/drivers")}>Volver a Drivers</Button>} />
      </main>
    );
  }

  const est = store.estructura(borrador.estructuraId);
  const usos = esNuevo ? [] : store.usosDePerfil(id);
  const enUso = usos.length > 0;
  const unidades = usos.reduce((s, c) => s + (c.unidades ?? 0), 0);
  const cambiado = !!original && JSON.stringify([original.drivers, original.heredables]) !== JSON.stringify([borrador.drivers, borrador.heredables]);
  const nombreRepetido = store.perfiles.some((p) => p.id !== borrador.id && p.nombre.trim().toLowerCase() === borrador.nombre.trim().toLowerCase());
  const errNombre = intentado && !borrador.nombre.trim() ? "Indica el nombre del perfil" : nombreRepetido ? "Ya existe un perfil con este nombre" : "";

  const guardar = () => {
    setIntentado(true);
    if (!borrador.nombre.trim() || nombreRepetido) return;
    if (enUso && cambiado && !confirmar) { setConfirmar(true); return; }
    store.guardarPerfil(borrador);
    snack(esNuevo ? `Perfil "${borrador.nombre}" creado` : enUso && cambiado ? `Perfil "${borrador.nombre}" modificado en ${usos.length} configuraciones` : `Perfil "${borrador.nombre}" guardado`);
    router.push("/configuracion/drivers");
  };

  return (
    <main className="lm-page" style={{ paddingBottom: 120 }}>
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion" }, { label: "Drivers", href: "/configuracion/drivers" }, { label: esNuevo ? "Nuevo perfil" : borrador.nombre }]} />
          <span className="row gap-15">
            <h1 className="lm-headline-small" style={{ margin: 0 }}>{esNuevo ? "Nuevo perfil de drivers" : `Modificar ${original!.nombre}`}</h1>
            {!esNuevo && (enUso ? <Tag tone="primary">En uso</Tag> : <Tag tone="neutral">Sin usar</Tag>)}
            {borrador.porDefecto && <Tag tone="info">Por defecto</Tag>}
          </span>
        </div>
      </div>

      <div className="stack gap-20">
        {borrador.porDefecto && (
          <Banner type="info" title={`Perfil por defecto de ${store.estructura(borrador.estructuraId)?.nombre ?? "la estructura"}`}>
            Se crea solo con la estructura y es el que tienen elegido de inicio las configuraciones nuevas. Se puede modificar, pero no eliminar.
          </Banner>
        )}
        {enUso && (
          <Banner type="attention" title={`Este perfil lo usan ${usos.length} configuraciones (${unidades} unidades)`}>
            Los cambios se aplicarán a todas: {usos.map((c) => store.etiqueta(c)).join(", ")}.
          </Banner>
        )}
        <section className="lm-surface lm-surface--p24 stack gap-20">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--lm-space-20)" }}>
            <Field label="Nombre" required htmlFor="p-nombre" error={errNombre}>
              <input id="p-nombre" className="lm-input" value={borrador.nombre} aria-invalid={!!errNombre} placeholder="Por ejemplo: Km y ciclos de puertas"
                onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })} />
            </Field>
            <Field label="Descripción" htmlFor="p-desc">
              <input id="p-desc" className="lm-input" value={borrador.descripcion} onChange={(e) => setBorrador({ ...borrador, descripcion: e.target.value })} />
            </Field>
            <Field label="Estructura" required htmlFor="p-est" support={esNuevo ? "Los drivers se asignan a los huecos de esta estructura" : "No se puede cambiar: los drivers dependen de sus huecos"}>
              <select id="p-est" className="lm-select" value={borrador.estructuraId} disabled={!esNuevo}
                onChange={(e) => { const ne = store.estructura(e.target.value); if (ne) setBorrador({ ...borrador, estructuraId: ne.id, ...driversIniciales(ne.raiz) }); }}>
                {store.estructuras.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </Field>
          </div>
          {est ? (
            <EditorDrivers raiz={est.raiz} valor={borrador} onChange={(v) => setBorrador({ ...borrador, ...v })} />
          ) : (
            <Banner type="error">La estructura de este perfil ya no existe</Banner>
          )}
        </section>
      </div>

      <footer className="lm-footer-bar">
        <div className="row gap-10" style={{ maxWidth: 1360, margin: "0 auto", padding: "var(--lm-space-15) var(--lm-space-30)" }}>
          <span className="grow lm-body-small muted">{est?.nombre}{cambiado && " · Hay cambios sin guardar"}</span>
          <Button variant="outlined" onClick={() => router.push("/configuracion/drivers")}>Cancelar</Button>
          <Button onClick={guardar}>{esNuevo ? "Crear perfil" : "Guardar cambios"}</Button>
        </div>
      </footer>

      {confirmar && (
        <Dialog large title={`¿Aplicar los cambios en ${usos.length} configuraciones?`} onClose={() => setConfirmar(false)}
          message={`El perfil "${borrador.nombre}" es común: el cambio se aplica a todas las configuraciones que lo usan.`}
          footer={<>
            <Button variant="outlined" onClick={() => setConfirmar(false)}>Cancelar</Button>
            <Button onClick={guardar}>Aplicar en {usos.length} configuraciones</Button>
          </>}>
          <table className="lm-table">
            <thead><tr><th>Flota</th><th>Configuración</th><th>Estado</th><th className="num">Unidades</th></tr></thead>
            <tbody>
              {usos.map((c) => (
                <tr key={c.id}>
                  <td className="emph">{store.flotas.find((x) => x.id === c.flotaId)?.nombre}</td><td>{c.nombre}</td>
                  <td>{c.estado === "activa" ? <Tag tone="success">Activa</Tag> : <Tag tone="attention">En configuración</Tag>}</td>
                  <td className="num">{c.unidades}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Banner type="info">Las plantillas de estas configuraciones pedirán los valores iniciales según los nuevos drivers.</Banner>
        </Dialog>
      )}
    </main>
  );
}
