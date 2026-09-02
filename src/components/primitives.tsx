import type { ReactNode } from "react";

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
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: string;
}) {
  return (
    <div className={`metric-card ${tone ?? ""}`.trim()}>
      <span>{label}</span>
      <strong>{value}</strong>
      {sub && <small>{sub}</small>}
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty-state">
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
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close icon-button" onClick={onClose} aria-label="Close">
          &times;
        </button>
        <h2>{title}</h2>
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
  return <div className={`toast ${tone ?? ""}`.trim()}>{message}</div>;
}

export function DataTable({
  columns,
  rows,
}: {
  columns: { key: string; label: string }[];
  rows: ReactNode[];
}) {
  return (
    <div className="data-table">
      <div className="table-row table-head">
        {columns.map((c) => (
          <span key={c.key}>{c.label}</span>
        ))}
      </div>
      {rows}
    </div>
  );
}
