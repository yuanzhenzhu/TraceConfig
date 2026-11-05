"use client";

// Componentes del sistema Leadmind. Envoltorios finos sobre las clases de app/globals.css.

import Link from "next/link";
import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState,
  type ButtonHTMLAttributes, type ReactNode,
} from "react";

/* ---------- Icon (Material Symbols Outlined) ---------- */
export function Icon({ name, filled, size, label }: { name: string; filled?: boolean; size?: "m" | "xl"; label?: string }) {
  return (
    <span
      className={`lm-icon${filled ? " lm-icon--filled" : ""}${size ? ` lm-icon--${size}` : ""}`}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    >
      {name}
    </span>
  );
}

/* ---------- matButton ---------- */
type Variant = "filled" | "outlined" | "text" | "tonal" | "danger";
export function Button({
  variant = "filled", icon, small, children, className = "", ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: string; small?: boolean }) {
  return (
    <button type="button" className={`lm-btn lm-btn--${variant}${small ? " lm-btn--small" : ""} ${className}`} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

/* ---------- matButtonIcon ---------- */
export function IconButton({
  icon, label, compact, className = "", ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: string; label: string; compact?: boolean }) {
  return (
    <button type="button" aria-label={label} title={label} className={`lm-icon-btn${compact ? " lm-icon-btn--compact" : ""} ${className}`} {...rest}>
      <Icon name={icon} />
    </button>
  );
}

/* ---------- tagSemantic-status ---------- */
export type TagTone = "success" | "attention" | "error" | "info" | "warning" | "neutral" | "primary";
export function Tag({ tone, children, icon, num }: { tone: TagTone; children: ReactNode; icon?: string; num?: number }) {
  return (
    <span className={`lm-tag lm-tag--${tone}`}>
      {icon && <Icon name={icon} />}
      {num !== undefined && <span className="lm-tag__num">{num}</span>}
      {children}
    </span>
  );
}

/* ---------- matFormField ---------- */
export function Field({
  label, required, support, error, children, htmlFor, style,
}: { label: string; required?: boolean; support?: string; error?: string; children: ReactNode; htmlFor?: string; style?: React.CSSProperties }) {
  return (
    <div className="lm-field" style={style}>
      <label className="lm-field__label" htmlFor={htmlFor}>
        {label}{required && <span className="req"> *</span>}
      </label>
      {children}
      {error ? (
        <span className="lm-field__support lm-field__support--error" role="alert">{error}</span>
      ) : support ? (
        <span className="lm-field__support">{support}</span>
      ) : null}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  return (
    <div className="lm-search">
      <Icon name="search" />
      <input className="lm-input lm-input--dense" type="search" aria-label={label} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/* ---------- Banner ---------- */
const bannerIcon = { info: "info", success: "check_circle", error: "error_outline", attention: "warning" } as const;
export function Banner({
  type, title, children, actions,
}: { type: keyof typeof bannerIcon; title?: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className={`lm-banner lm-banner--${type}`} role={type === "error" ? "alert" : "status"}>
      <Icon name={bannerIcon[type]} />
      <div className="lm-banner__body">
        {title && <span className="lm-banner__title">{title}</span>}
        {children && <span>{children}</span>}
      </div>
      {actions && <div className="lm-banner__actions">{actions}</div>}
    </div>
  );
}

/* ---------- Spinner / Empty state ---------- */
export function Spinner({ label = "Cargando", small }: { label?: string; small?: boolean }) {
  return <div className={`lm-spinner${small ? " lm-spinner--small" : ""}`} role="progressbar" aria-label={label} />;
}
export function Loading({ text = "Cargando" }: { text?: string }) {
  return <div className="lm-center"><Spinner label={text} /><span>{text}</span></div>;
}
export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="lm-empty">
      <Icon name={icon} size="xl" />
      <span className="lm-title-medium">{title}</span>
      {text && <span className="lm-empty__text">{text}</span>}
      {action}
    </div>
  );
}

/* ---------- Dialog ---------- */
export function Dialog({
  title, children, footer, onClose, large, message,
}: { title: string; message?: string; children?: ReactNode; footer: ReactNode; onClose: () => void; large?: boolean }) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const first = ref.current?.querySelector<HTMLElement>("input, select, textarea, button");
    first?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="lm-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className={`lm-dialog${large ? " lm-dialog--l" : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="lm-dialog__head">
          <h2 id={titleId} className="lm-headline-small" style={{ margin: 0 }}>{title}</h2>
          {message && <p className="lm-body-medium muted" style={{ margin: 0 }}>{message}</p>}
        </div>
        {children && <div className="lm-dialog__body">{children}</div>}
        <div className="lm-dialog__foot">{footer}</div>
      </div>
    </div>
  );
}

/* ---------- matTooltip ---------- */
/** Ayuda al pasar el cursor o al enfocar. Aquí, sobre un matButtonIcon con icono info. */
export function InfoTooltip({ text, label }: { text: string; label: string }) {
  const id = useId();
  return (
    <span className="lm-tooltip-wrap">
      <IconButton compact icon="info" label={label} aria-describedby={id} />
      <span role="tooltip" id={id} className="lm-tooltip">{text}</span>
    </span>
  );
}

/* ---------- matMenu ---------- */
export type MenuItem = { label: string; icon: string; onSelect: () => void; danger?: boolean; disabled?: boolean } | "divider";
export function Menu({ items, label }: { items: MenuItem[]; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div className="lm-menu-wrap" ref={ref}>
      <IconButton icon="more_vert" label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} />
      {open && (
        <div className="lm-menu" role="menu">
          {items.map((it, i) =>
            it === "divider" ? <hr key={i} /> : (
              <button key={it.label} role="menuitem" className={it.danger ? "is-danger" : ""} disabled={it.disabled}
                onClick={() => { setOpen(false); it.onSelect(); }}>
                <Icon name={it.icon} />{it.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/* ---------- MatSnackBar (proveedor global) ---------- */
const SnackCtx = createContext<(text: string) => void>(() => {});
export const useSnackbar = () => useContext(SnackCtx);
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [text, setText] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((t: string) => {
    setText(t);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setText(null), 4000);
  }, []);
  return (
    <SnackCtx.Provider value={show}>
      {children}
      {text && (
        <div className="lm-snackbar" role="status" aria-live="polite">
          <span className="lm-snackbar__text">{text}</span>
          <IconButton icon="close" label="Cerrar aviso" compact onClick={() => setText(null)} />
        </div>
      )}
    </SnackCtx.Provider>
  );
}

/* ---------- navbar ---------- */
export function Navbar() {
  return (
    <header className="lm-navbar">
      <Link href="/configuracion" className="lm-navbar__brand">
        <Icon name="train" />
        Leadmind <small>Trace</small>
      </Link>
      <span className="lm-navbar__spacer" />
      <IconButton icon="notifications" label="Notificaciones" />
      <IconButton icon="settings" label="Configuración" />
      <span className="lm-navbar__user">
        <span className="lm-avatar" aria-label="Usuario: Jefa de mantenimiento">JM</span>
      </span>
    </header>
  );
}

/* ---------- breadcrumb ---------- */
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Ruta" className="lm-breadcrumb">
      {items.map((it, i) => (
        <span key={i} className="row gap-5">
          {i > 0 && <Icon name="chevron_right" />}
          {it.href ? <Link href={it.href}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}
