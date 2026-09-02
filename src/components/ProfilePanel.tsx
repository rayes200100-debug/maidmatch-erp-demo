import type { Housemaid } from "../data";

export interface ProfilePanelProps {
  maid: Housemaid;
  onOpenComplaints: (erpLink: string) => void;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProfilePanel({ maid, onOpenComplaints }: ProfilePanelProps) {
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
