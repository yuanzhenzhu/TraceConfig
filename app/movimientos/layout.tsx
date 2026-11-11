"use client";

// Módulo Movimientos: navlist lateral sin iconos; los grupos se separan con una línea (ver documentos/movimientos/flujos/movimientos.md).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GRUPOS } from "@/components/movimientos/menu";

export default function MovimientosLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="lm-shell">
      <aside className="lm-sidenav" aria-label="Apartados de Movimientos">
        <span className="lm-title-large" style={{ padding: "0 var(--lm-space-20)" }}>Movimientos</span>
        <nav className="stack gap-5">
          {GRUPOS.map((g, i) => (
            <div key={i} className="stack gap-5">
              {i > 0 && <hr className="lm-divider" style={{ margin: "var(--lm-space-10) 0" }} />}
              {g.items.map((a) => {
                const on = path === a.href;
                return (
                  <Link key={a.href} href={a.href} className="lm-navlist-item" aria-current={on ? "page" : undefined}>
                    {a.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
      <div className="lm-shell__body">{children}</div>
    </div>
  );
}
