"use client";

// HU-40 y HU-41: crear una estructura o modificarla viendo su impacto en las configuraciones que la usan.

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Banner, Breadcrumb, Button, Dialog, EmptyState, Field, Loading, Tag, useSnackbar } from "@/components/ds";
import { EditorEstructura } from "@/components/arbol";
import { clonar, contarHuecos, diferencia, nodo, nuevoId, type Estructura } from "@/lib/model";
import { useStore } from "@/lib/store";

export default function EditarEstructuraPage() {
  const { id } = useParams<{ id: string }>();
  const store = useStore();
  const router = useRouter();
  const snack = useSnackbar();
  const esNueva = id === "nueva";
  const original = esNueva ? undefined : store.estructura(id);

  const [borrador, setBorrador] = useState<Estructura | null>(null);
  const [origen, setOrigen] = useState<"cero" | "copia">("cero");
  const [base, setBase] = useState("");
  const [intentado, setIntentado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  useEffect(() => {
    if (!store.listo || borrador) return;
    if (esNueva) setBorrador({ id: nuevoId("est"), nombre: "", descripcion: "", raiz: nodo("Tren", "Tren") });
    else if (original) setBorrador(structuredClone(original));
  }, [store.listo, esNueva, original, borrador]);

  if (!store.listo || (!borrador && (esNueva || original))) return <main className="lm-page"><Loading text="Cargando estructura" /></main>;
  if (!borrador) {
    return (
      <main className="lm-page">
        <EmptyState icon="search_off" title="No se ha encontrado la estructura" action={<Button onClick={() => router.push("/configuracion/estructuras")}>Volver a Estructuras</Button>} />
      </main>
    );
  }

  const usos = esNueva ? [] : store.usosDe(id);
  const enUso = usos.length > 0;
  const unidades = usos.reduce((s, c) => s + (c.unidades ?? 0), 0);
  const dif = original ? diferencia(original.raiz, borrador.raiz) : { anadidos: [], eliminados: [] };
  const hayCambiosArbol = dif.anadidos.length + dif.eliminados.length > 0;
  const errNombre = intentado && !borrador.nombre.trim() ? "Indica el nombre de la estructura" : "";
  const errVacia = intentado && borrador.raiz.hijos.length === 0;
  const nombreRepetido = store.estructuras.some((e) => e.id !== borrador.id && e.nombre.trim().toLowerCase() === borrador.nombre.trim().toLowerCase());

  const guardar = () => {
    setIntentado(true);
    if (!borrador.nombre.trim() || borrador.raiz.hijos.length === 0 || nombreRepetido) return;
    if (enUso && hayCambiosArbol && !confirmar) { setConfirmar(true); return; }
    store.guardarEstructura(borrador);
    snack(esNueva ? `Estructura "${borrador.nombre}" creada` : enUso && hayCambiosArbol
      ? `Estructura "${borrador.nombre}" modificada en ${usos.length} configuraciones`
      : `Estructura "${borrador.nombre}" guardada`);
    router.push("/configuracion/estructuras");
  };

  const partirDe = (o: "cero" | "copia", baseId: string) => {
    const b = store.estructura(baseId);
    setBorrador({ ...borrador, raiz: o === "copia" && b ? { ...clonar(b.raiz), nombre: "Tren" } : nodo("Tren", "Tren") });
  };

  return (
    <main className="lm-page" style={{ paddingBottom: 120 }}>
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Configuración", href: "/configuracion" }, { label: "Estructuras", href: "/configuracion/estructuras" }, { label: esNueva ? "Nueva estructura" : borrador.nombre }]} />
          <span className="row gap-15">
            <h1 className="lm-headline-small" style={{ margin: 0 }}>{esNueva ? "Nueva estructura" : `Modificar ${original!.nombre}`}</h1>
            {!esNueva && (enUso ? <Tag tone="primary">En uso</Tag> : <Tag tone="neutral">Sin usar</Tag>)}
          </span>
        </div>
      </div>

      <div className="stack gap-20">
        {enUso && (
          <Banner type="attention" title={`Esta estructura la usan ${usos.length} configuraciones (${unidades} unidades)`}>
            Los cambios se aplicarán a todas: {usos.map((c) => store.etiqueta(c)).join(", ")}. Solo se puede modificar por los extremos.
          </Banner>
        )}

        <section className="lm-surface lm-surface--p24 stack gap-20">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "var(--lm-space-20)" }}>
            <Field label="Nombre" required htmlFor="e-nombre" error={errNombre || (nombreRepetido ? "Ya existe una estructura con este nombre" : "")}>
              <input id="e-nombre" className="lm-input" value={borrador.nombre} aria-invalid={!!errNombre || nombreRepetido} placeholder="Por ejemplo: Estructura 4"
                onChange={(e) => setBorrador({ ...borrador, nombre: e.target.value })} />
            </Field>
            <Field label="Descripción" htmlFor="e-desc">
              <input id="e-desc" className="lm-input" value={borrador.descripcion} placeholder="Por ejemplo: Tren de 4 coches"
                onChange={(e) => setBorrador({ ...borrador, descripcion: e.target.value })} />
            </Field>
          </div>
          {esNueva && (
            <fieldset className="row gap-30" style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="lm-field__label" style={{ marginBottom: "var(--lm-space-10)" }}>Punto de partida</legend>
              <label className="lm-radio"><input type="radio" name="origen" checked={origen === "cero"} onChange={() => { setOrigen("cero"); partirDe("cero", base); }} />Desde cero</label>
              <label className="lm-radio"><input type="radio" name="origen" checked={origen === "copia"} onChange={() => { const b = base || store.estructuras[0]?.id; setBase(b); setOrigen("copia"); partirDe("copia", b); }} />Copiar una estructura existente</label>
              {origen === "copia" && (
                <select className="lm-select lm-select--dense" style={{ width: 240 }} aria-label="Estructura de partida" value={base}
                  onChange={(e) => { setBase(e.target.value); partirDe("copia", e.target.value); }}>
                  {store.estructuras.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              )}
            </fieldset>
          )}
          {errVacia && <Banner type="error">La estructura está vacía: añade al menos un elemento</Banner>}
          <EditorEstructura soloExtremos={enUso} raiz={borrador.raiz} onChange={(raiz) => setBorrador({ ...borrador, raiz })} />
        </section>
      </div>

      <footer className="lm-footer-bar">
        <div className="row gap-10" style={{ maxWidth: 1360, margin: "0 auto", padding: "var(--lm-space-15) var(--lm-space-30)" }}>
          <span className="grow lm-body-small muted">
            {contarHuecos(borrador.raiz)} huecos por unidad
            {hayCambiosArbol && ` · ${dif.anadidos.length} añadidos · ${dif.eliminados.length} eliminados`}
          </span>
          <Button variant="outlined" onClick={() => router.push("/configuracion/estructuras")}>Cancelar</Button>
          <Button onClick={guardar}>{esNueva ? "Crear estructura" : "Guardar cambios"}</Button>
        </div>
      </footer>

      {confirmar && (
        <Dialog large title={`¿Aplicar los cambios en ${usos.length} configuraciones?`} onClose={() => setConfirmar(false)}
          message={`La estructura "${borrador.nombre}" es común: el cambio se aplica a todas las configuraciones que la usan. No se guardan versiones anteriores.`}
          footer={<>
            <Button variant="outlined" onClick={() => setConfirmar(false)}>Cancelar</Button>
            <Button onClick={guardar}>Aplicar en {usos.length} configuraciones</Button>
          </>}>
          <div className="row gap-20">
            {dif.anadidos.length > 0 && <Tag tone="success" icon="add">{dif.anadidos.length} {dif.anadidos.length === 1 ? "hueco añadido" : "huecos añadidos"} por unidad</Tag>}
            {dif.eliminados.length > 0 && <Tag tone="error" icon="remove">{dif.eliminados.length} {dif.eliminados.length === 1 ? "hueco eliminado" : "huecos eliminados"} por unidad</Tag>}
          </div>
          <table className="lm-table">
            <thead><tr><th>Flota</th><th>Configuración</th><th>Estado</th><th className="num">Unidades afectadas</th></tr></thead>
            <tbody>
              {usos.map((c) => {
                const f = store.flotas.find((x) => x.id === c.flotaId);
                return (
                  <tr key={c.id}>
                    <td className="emph">{f?.nombre}</td><td>{c.nombre}</td>
                    <td>{c.estado === "activa" ? <Tag tone="success">Activa</Tag> : <Tag tone="attention">En configuración</Tag>}</td>
                    <td className="num">{c.unidades}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {dif.anadidos.length > 0 && (
            <Banner type="info">
              Las {unidades} unidades quedarán <strong>incompletas</strong> hasta que se carguen los datos de los activos nuevos ({[...new Set(dif.anadidos.map((n) => n.categoria))].join(", ")}). Los huecos nuevos heredan los drivers de su padre.
            </Banner>
          )}
        </Dialog>
      )}
    </main>
  );
}
