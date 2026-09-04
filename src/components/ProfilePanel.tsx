import type { Housemaid, Complaint } from "../data";
import { maidTypeLabel } from "../data";
import type { Stage } from "../lib/stages";
import { unpaidLeaveDueDate, daysUntil } from "../lib/unpaidLeave";
import { StatusPill } from "./primitives";

export interface StockMedia {
  stockPhotoUrl?: string;
  stockVideoUrl?: string;
}

export interface ProfilePanelProps {
  maid: Housemaid;
  onOpenComplaints: (erpLink: string) => void;
  media?: StockMedia;
}

const JOURNEY: { stage: Stage; label: string }[] = [
  { stage: "Reception", label: "Reception" },
  { stage: "PendingRetraction", label: "Retraction" },
  { stage: "DocumentsCollection", label: "Documents" },
  { stage: "PendingShooting", label: "Shooting" },
  { stage: "PendingEditing", label: "Editing" },
  { stage: "AvailablePendingPublishing", label: "Publishing" },
  { stage: "AvailablePublished", label: "Available" },
  { stage: "UnderTrial", label: "Trial" },
];

const TERMINAL_LABELS: Record<string, string> = {
  RetractedToCC: "Retracted to CC",
  MovedToOffboard: "Moved to Offboard",
  Hired: "Hired",
  Cancelled: "Cancelled",
};

const DAY_MS = 24 * 60 * 60 * 1000;

type VisaTone = "success" | "warning" | "danger";

function visaStatus(visaExpiry: string, now: number): { label: string; tone: VisaTone } {
  const exp = new Date(`${visaExpiry}T00:00:00`).getTime();
  const days = Math.round((exp - now) / DAY_MS);
  if (days < 0) return { label: "Expired", tone: "danger" };
  if (days <= 30) return { label: "Expiring", tone: "warning" };
  return { label: "Active", tone: "success" };
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function fmtMonth(month: string): string {
  if (!month) return "—";
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

function wpsTone(status: string): "success" | "warning" | "danger" {
  if (status === "Paid") return "success";
  if (status === "Pending") return "warning";
  return "danger";
}

function JourneyStepper({ stage }: { stage: Stage }) {
  const idx = JOURNEY.findIndex((j) => j.stage === stage);
  const terminalLabel = TERMINAL_LABELS[stage];
  return (
    <div className="mini-section">
      <div className="mini-section-head">
        <h3>Journey</h3>
      </div>
      <div className="journey-mini">
        {JOURNEY.map((j, i) => {
          const state = terminalLabel ? "done" : i < idx ? "done" : i === idx ? "current" : "";
          return (
            <div key={j.stage} className={state}>
              <i>{state === "done" ? "\u2713" : i + 1}</i>
              <span>{j.label}</span>
            </div>
          );
        })}
        {terminalLabel && (
          <div className="terminal">
            <i>&#10005;</i>
            <span>{terminalLabel}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function ProfilePanel({ maid, onOpenComplaints, media }: ProfilePanelProps) {
  const now = Date.now();
  const visa = visaStatus(maid.visaExpiry, now);

  const storedDue = maid.maidMatchProfile?.unpaidLeaveDueDate;
  const dueDate = storedDue ?? (maid.arrivalDate ? unpaidLeaveDueDate(maid.arrivalDate) : null);
  const dueDays = dueDate ? daysUntil(dueDate, now) : null;

  const openToRetractor = maid.complaints.filter(
    (c) => c.status === "open" && (c.assignedTo === "Retractor" || c.assignedTo === "Retraction team")
  );
  const otherComplaints = maid.complaints.filter((c) => !openToRetractor.includes(c));

  const wpsRecent = [...maid.wpsHistory].reverse().slice(0, 3);
  const employment = [...maid.employmentHistory].reverse();

  return (
    <>
      <div className="profile-mini-head">
        <div className="avatar avatar-lg">
          {maid.photoUrl ? <img src={maid.photoUrl} alt={maid.name} /> : initials(maid.name)}
        </div>
        <div>
          <h2>{maid.name}</h2>
          <p>
            {maidTypeLabel(maid)} &middot; {maid.nationality}
            {maid.maidsCcId ? ` · ${maid.maidsCcId}` : ""}
          </p>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <StatusPill tone="neutral">{maidTypeLabel(maid)}</StatusPill>
            {maid.isGoldenProfile && <StatusPill tone="gold">Golden Profile</StatusPill>}
          </div>
        </div>
      </div>

      <a className="text-button profile-open-full" href={`#/maid/${maid.id}`} target="_blank" rel="noreferrer">
        Open Full Profile &nearr;
      </a>

      <div className="profile-quick-grid">
        {[
          ["Nationality", maid.nationality],
          ["Age", String(maid.age)],
          ["Mobile", maid.mobile || "—"],
          ["WhatsApp", maid.whatsapp || "—"],
          ["Visa start", fmtDate(maid.visaStartDate)],
          ["Visa expiry", fmtDate(maid.visaExpiry)],
          ["Passport expiry", fmtDate(maid.passportExpiry)],
          ["Visa status", ""],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            {label === "Visa status" ? (
              <strong style={{ display: "block", marginTop: 2 }}>
                <StatusPill tone={visa.tone}>{visa.label}</StatusPill>
              </strong>
            ) : (
              <strong>{value}</strong>
            )}
          </div>
        ))}
      </div>

      <div className="mini-section">
        <div className="mini-section-head">
          <h3>Compensation</h3>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Current salary</span>
            <strong style={{ fontSize: 13 }}>AED {maid.salary.toLocaleString()}</strong>
          </div>
          {dueDate && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>
                Unpaid leave due{storedDue ? "" : " (preview)"}
              </span>
              <strong style={{ fontSize: 13 }}>
                {fmtDate(dueDate)}
                {dueDays != null && <small style={{ marginLeft: 6, color: "var(--muted)" }}>({dueDays}d)</small>}
              </strong>
            </div>
          )}
        </div>
      </div>

      <div className="mini-section">
        <div className="mini-section-head">
          <h3>WPS — last 3 salaries</h3>
        </div>
        {wpsRecent.length === 0 ? (
          <small style={{ color: "var(--muted)" }}>No WPS records</small>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {wpsRecent.map((w) => (
              <div key={w.month} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>
                  {fmtMonth(w.month)} · AED {w.amount.toLocaleString()}
                </span>
                <StatusPill tone={wpsTone(w.status)}>{w.status}</StatusPill>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mini-section">
        <div className="mini-section-head">
          <h3>Employment history</h3>
        </div>
        {employment.length === 0 ? (
          <small style={{ color: "var(--muted)" }}>No recorded employment</small>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 10 }}>
            {employment.map((entry, i) => (
              <li key={i} style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                <strong style={{ color: "var(--ink)" }}>{entry.employerName}</strong>
                <div style={{ marginTop: 2 }}>
                  {fmtDate(entry.startDate)} → {fmtDate(entry.endDate)} · AED {entry.salary.toLocaleString()}
                </div>
                {entry.reason && <small style={{ color: "var(--muted)" }}>{entry.reason}</small>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {maid.terminationSummary && (
        <div className="mini-section">
          <div className="mini-section-head">
            <h3>Last placement — termination summary</h3>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5 }}>{maid.terminationSummary}</p>
        </div>
      )}

      <div className="mini-section">
        <div className="mini-section-head">
          <h3>Complaints &amp; to-dos</h3>
          {otherComplaints.length > 0 && (
            <button type="button" className="text-button" onClick={() => onOpenComplaints(`erp://complaints?maid=${maid.maidsCcId || maid.id}`)}>
              View all complaints
            </button>
          )}
        </div>
        {openToRetractor.length === 0 ? (
          <small style={{ color: "var(--muted)" }}>No complaints open to you</small>
        ) : (
          openToRetractor.map((complaint: Complaint) => (
            <div className="complaint-row" key={complaint.erpLink}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ fontSize: 12 }}>{complaint.title}</strong>
                <p>{complaint.summary}</p>
                <small>Raised {fmtDate(complaint.dateRaised)}</small>
              </div>
              <button type="button" className="text-button" onClick={() => onOpenComplaints(complaint.erpLink)}>
                Open in ERP
              </button>
            </div>
          ))
        )}
      </div>

      {(maid.employerName || maid.maidsCcProfileLink) && (
        <div className="mini-section">
          <div className="mini-section-head">
            <h3>Employer</h3>
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            {maid.employerName && <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>{maid.employerName}</span>}
            {maid.maidsCcProfileLink && (
              <a className="text-button" href={maid.maidsCcProfileLink} target="_blank" rel="noreferrer">
                View on maids.cc
              </a>
            )}
          </div>
        </div>
      )}

      {(media?.stockPhotoUrl || media?.stockVideoUrl) && (
        <div className="mini-section">
          <div className="mini-section-head">
            <h3>Stock media</h3>
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {media.stockPhotoUrl && (
              <a className="text-button" href={media.stockPhotoUrl} target="_blank" rel="noreferrer">Stock photo</a>
            )}
            {media.stockVideoUrl && (
              <a className="text-button" href={media.stockVideoUrl} target="_blank" rel="noreferrer">Stock video</a>
            )}
          </div>
        </div>
      )}

      <JourneyStepper stage={maid.currentStage} />
    </>
  );
}
