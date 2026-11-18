"use client";

// Prueba de Configuración (copia para probar alternativas, se entra por el icono de timbre): navlist lateral con sus apartados.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ds";

// (Prueba, 18-11-2026) Orden: Flotas, Estructuras, Propiedades de categoría, Propiedades de hueco, Drivers,
// Cambio de número de serie, Asignación de línea y Almacenes. Estructuras y Propiedades de hueco son apartados separados.
const APARTADOS = [
  { href: "/configuracion-prueba", label: "Flotas", icon: "train", activo: (p: string) => p === "/configuracion-prueba" || (/^\/configuracion-prueba\/(cfg|asignar)/.test(p)) },
  { href: "/configuracion-prueba/estructuras", label: "Estructuras", icon: "table_rows", activo: (p: string) => p.startsWith("/configuracion-prueba/estructuras") },
  { href: "/configuracion-prueba/propiedades-categoria", label: "Propiedades de categoría", icon: "list", activo: (p: string) => p.startsWith("/configuracion-prueba/propiedades-categoria") },
  { href: "/configuracion-prueba/propiedades-hueco", label: "Propiedades de hueco", icon: "radio_button_checked", activo: (p: string) => p.startsWith("/configuracion-prueba/propiedades-hueco") },
  { href: "/configuracion-prueba/drivers", label: "Drivers", icon: "timelapse", activo: (p: string) => p.startsWith("/configuracion-prueba/drivers") },
  { href: "/configuracion-prueba/cambio-numero-serie", label: "Cambio de número de serie", icon: "swap_vert", activo: (p: string) => p.startsWith("/configuracion-prueba/cambio-numero-serie") },
  { href: "/configuracion-prueba/asignacion-linea", label: "Asignación de línea", icon: "published_with_changes", activo: (p: string) => p.startsWith("/configuracion-prueba/asignacion-linea") },
  { href: "/configuracion-prueba/almacenes", label: "Almacenes", icon: "domain", activo: (p: string) => p.startsWith("/configuracion-prueba/almacenes") },
];

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="lm-shell">
      <aside className="lm-sidenav" aria-label="Apartados de Configuración (prueba)">
        <span className="lm-title-large" style={{ padding: "0 var(--lm-space-20)" }}>Configuración (prueba)</span>
        <nav className="stack gap-5">
          {APARTADOS.map((a) => {
            const on = a.activo(path);
            return (
              <Link key={a.href} href={a.href} className="lm-navlist-item" aria-current={on ? "page" : undefined}>
                <Icon name={a.icon} filled={on} />
                {a.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="lm-shell__body">{children}</div>
    </div>
  );
}
