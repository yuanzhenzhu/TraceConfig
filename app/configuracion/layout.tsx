"use client";

// Módulo Configuración: navlist lateral con sus apartados.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ds";

const APARTADOS = [
  { href: "/configuracion", label: "Flotas y configuraciones", icon: "train", activo: (p: string) => p === "/configuracion" || (/^\/configuracion\/cfg/.test(p)) },
  { href: "/configuracion/estructuras", label: "Estructuras", icon: "table_rows", activo: (p: string) => p.startsWith("/configuracion/estructuras") },
  { href: "/configuracion/propiedades-categoria", label: "Propiedades de categoría", icon: "list", activo: (p: string) => p.startsWith("/configuracion/propiedades-categoria") },
];

export default function ConfiguracionLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="lm-shell">
      <aside className="lm-sidenav" aria-label="Apartados de Configuración">
        <span className="lm-title-large" style={{ padding: "0 var(--lm-space-20)" }}>Configuración</span>
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
