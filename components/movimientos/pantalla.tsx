"use client";

// Piezas de pantalla comunes de Movimientos: header (breadcrumb, título, Cancelar / Registrar movimiento, aviso de
// descartar), selector opcional bajo el header (p. ej. En una unidad | En un almacén) y selector Ahora | Después.

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumb, Button, ButtonToggle, Dialog } from "@/components/ds";

export function CabeceraPantalla({ miga, titulo, texto, valido, onRegistrar, hayDatos, selector, accion = "Registrar movimiento" }: {
  miga: string; titulo: string; texto: string; valido: boolean; onRegistrar: () => void; hayDatos: boolean; selector?: ReactNode; accion?: string;
}) {
  const router = useRouter();
  const [descartar, setDescartar] = useState(false);
  return (
    <>
      <div className="lm-header">
        <div className="lm-header__titles">
          <Breadcrumb items={[{ label: "Movimientos", href: "/movimientos" }, { label: miga }]} />
          <h1 className="lm-headline-small" style={{ margin: 0 }}>{titulo}</h1>
          <span className="lm-body-medium muted">{texto}</span>
        </div>
        <div className="lm-header__actions">
          <Button variant="outlined" onClick={() => (hayDatos ? setDescartar(true) : router.push("/movimientos"))}>Cancelar</Button>
          <Button icon="check" disabled={!valido} onClick={onRegistrar}>{accion}</Button>
        </div>
      </div>
      {selector && <div className="row gap-15" style={{ marginBottom: "var(--lm-space-20)" }}>{selector}</div>}
      {descartar && (
        <Dialog title="¿Descartar el movimiento?" message="Se perderán los datos que has introducido." onClose={() => setDescartar(false)}
          footer={<>
            <Button variant="outlined" onClick={() => setDescartar(false)}>Cancelar</Button>
            <Button onClick={() => router.push("/movimientos")}>Descartar</Button>
          </>} />
      )}
    </>
  );
}

export function AhoraDespues({ vista, setVista, ok, texto }: { vista: "antes" | "despues"; setVista: (v: "antes" | "despues") => void; ok: boolean; texto: string }) {
  return (
    <div className="row gap-15">
      <ButtonToggle label="Qué se muestra" value={vista} onChange={(v) => { if (v === "antes" || ok) setVista(v); }}
        options={[{ value: "antes", label: "Ahora" }, { value: "despues", label: "Después" }]} />
      <span className="lm-body-small muted">{vista === "despues" ? "Así queda con este movimiento. Vuelve a Ahora para cambiar la selección." : ok ? "Pulsa Después para ver cómo queda." : texto}</span>
    </div>
  );
}

/** Selector de dónde ocurre (En una unidad | En un almacén), con una línea que lo explica. */
export function SelectorDonde<T extends string>({ valor, onChange, opciones, texto }: { valor: T; onChange: (v: T) => void; opciones: { value: T; label: string }[]; texto: string }) {
  return (
    <>
      <ButtonToggle label="Dónde" value={valor} onChange={onChange} options={opciones} />
      <span className="lm-body-small muted">{texto}</span>
    </>
  );
}
