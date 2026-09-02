import type { Housemaid } from "../data";
import type { Stage } from "../lib/stages";

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

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
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
  const quickFields: [string, string][] = [
    ["Nationality", maid.nationality],
    ["Housemaid Type", maid.housemaidType],
    ["Mobile", maid.mobile],
    ["WhatsApp", maid.whatsapp],
    ["Visa Expiry", maid.visaExpiry],
    ["Passport Expiry", maid.passportExpiry],
    ["Age", String(maid.age)],
    ["Salary", `AED ${maid.salary.toLocaleString()}`],
  ];

  return (
    <>
      <div className="profile-mini-head">
        <div className="avatar avatar-lg">{initials(maid.name)}</div>
        <div>
          <h2>{maid.name}</h2>
          <p>
            {maid.housemaidType} &middot; {maid.nationality}
          </p>
        </div>
        {maid.isGoldenProfile && <span className="golden-flag">Golden Profile</span>}
      </div>

      <div className="profile-quick-grid">
        {quickFields.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <JourneyStepper stage={maid.currentStage} />

      {(media?.stockPhotoUrl || media?.stockVideoUrl) && (
        <div className="mini-section">
          <div className="mini-section-head">
            <h3>Stock media</h3>
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {media.stockPhotoUrl && (
              <a className="text-button" href={media.stockPhotoUrl} target="_blank" rel="noreferrer">
                Stock photo
              </a>
            )}
            {media.stockVideoUrl && (
              <a className="text-button" href={media.stockVideoUrl} target="_blank" rel="noreferrer">
                Stock video
              </a>
            )}
          </div>
        </div>
      )}

      <div className="mini-section">
        <div className="mini-section-head">
          <h3>Employment History</h3>
        </div>
        {maid.employmentHistory.length === 0 ? (
          <small style={{ color: "var(--muted)" }}>No recorded employment</small>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
            {maid.employmentHistory.map((entry, i) => (
              <li key={i} style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                {entry}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mini-section">
        <div className="mini-section-head">
          <h3>Complaints</h3>
        </div>
        {maid.complaints.length === 0 ? (
          <small style={{ color: "var(--muted)" }}>No complaints</small>
        ) : (
          maid.complaints.map((complaint) => (
            <div className="complaint-row" key={complaint.erpLink}>
              <p>{complaint.summary}</p>
              <button
                type="button"
                className="text-button"
                onClick={() => onOpenComplaints(complaint.erpLink)}
              >
                open in maids.cc
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );
}
