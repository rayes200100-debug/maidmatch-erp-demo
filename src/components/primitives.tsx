import { useEffect, useId } from "react";
import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`.trim()}>{children}</section>;
}

export function StatusPill({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "gold";
  children: ReactNode;
}) {
  return <span className={`status-pill ${tone !== "neutral" ? tone : ""}`.trim()}>{children}</span>;
}

export function MetricCard({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: string;
  icon?: ReactNode;
}) {
  return (
    <div className={`metric-card ${tone ?? ""}`.trim()}>
      {icon && <span className={`metric-icon ${tone ?? "brand"}`.trim()}>{icon}</span>}
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty-state">
      <Inbox size={22} strokeWidth={1.5} aria-hidden />
      <strong>{title}</strong>
      {hint && <span>{hint}</span>}
    </div>
  );
}

export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  actions,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close icon-button" onClick={onClose} aria-label="Close">
          &times;
        </button>
        <h2 id={titleId}>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function Toast({
  message,
  tone,
}: {
  message: string | null;
  tone?: "success" | "danger";
}) {
  if (!message) return null;
  return (
    <div className={`toast ${tone ?? ""}`.trim()} role="status" aria-live="polite">
      {message}
    </div>
  );
}

export function DataTable({
  columns,
  rows,
}: {
  columns: { key: string; label: string }[];
  rows: ReactNode[];
}) {
  return (
    <div className="data-table" role="table">
      <div className="table-grid">
        <div className="table-row table-head" role="row">
          {columns.map((c) => (
            <span key={c.key} role="columnheader">
              {c.label}
            </span>
          ))}
        </div>
        {rows}
      </div>
    </div>
  );
}
