import { useState } from "react";
import { Search, X } from "lucide-react";
import type { AppState, Action } from "../store";
import { DataTable, EmptyState, Panel, Toast } from "../components/primitives";

interface ReceptionProps {
  state: AppState;
  dispatch: (a: Action) => void;
  route: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

const columns = [
  { key: "name", label: "Name" },
  { key: "mobile", label: "Mobile" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "nationality", label: "Nationality" },
  { key: "maidsCcId", label: "Maids.cc ID" },
  { key: "age", label: "Age" },
  { key: "visaExpiry", label: "Visa Expiry" },
  { key: "actions", label: "" },
];

export default function Reception({ state, dispatch }: ReceptionProps) {
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const receptionMaids = state.housemaids.filter((h) => h.currentStage === "Reception");

  const q = search.trim().toLowerCase();
  const matches = q
    ? receptionMaids.filter((h) =>
        [h.name, h.mobile, h.whatsapp, h.maidsCcId].some((v) => v.toLowerCase().includes(q))
      )
    : receptionMaids;

  const sendToRetraction = (housemaidId: string) => {
    dispatch({ type: "SEND_TO_RETRACTION", housemaidId, actor: state.currentRole, now: Date.now() });
    setToast("Sent to Retraction Team");
    window.setTimeout(() => setToast(null), 3000);
  };

  const rows = matches.map((h) => (
    <div className="table-row" key={h.id}>
      <span className="person-cell">
        <span className="avatar avatar-sm">{initials(h.name)}</span>
        <span style={{ minWidth: 0 }}>
          <strong>{h.name}</strong>
        </span>
      </span>
      <span>
        <strong>{h.mobile || "—"}</strong>
      </span>
      <span>
        <strong>{h.whatsapp || "—"}</strong>
      </span>
      <span>
        <strong>{h.nationality}</strong>
      </span>
      <span>
        <strong>{h.maidsCcId || "—"}</strong>
      </span>
      <span>
        <strong>{h.age}y</strong>
      </span>
      <span>
        <strong>{h.visaExpiry}</strong>
      </span>
      <span style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          className="primary-button small"
          onClick={() => sendToRetraction(h.id)}
        >
          Send to Retraction Team
        </button>
      </span>
    </div>
  ));

  return (
    <div className="page-stack">
      <style>{`
        .reception-table .table-row { grid-template-columns: 1.5fr 1.15fr 1.15fr .8fr .7fr .45fr .9fr auto; }
      `}</style>

      <header className="page-header">
        <div>
          <span className="eyebrow">Reception</span>
          <h1>Reception</h1>
          <p>Maids checked in at reception. Send them to the retraction team to begin processing.</p>
        </div>
      </header>

      <Panel className="flush">
        <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--line)" }}>
          <div className="inline-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, mobile, whatsapp, or maids.cc ID..."
              aria-label="Search reception maids"
            />
            {search && (
              <button type="button" className="text-button" onClick={() => setSearch("")} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
        <div className="reception-table">
          {receptionMaids.length === 0 ? (
            <div style={{ padding: 20 }}>
              <EmptyState title="No maids in reception" hint="Checked-in maids will appear here." />
            </div>
          ) : matches.length === 0 ? (
            <div style={{ padding: 20 }}>
              <EmptyState title="No matches" hint="Try a different name, number, or maids.cc ID." />
            </div>
          ) : (
            <DataTable columns={columns} rows={rows} />
          )}
        </div>
      </Panel>

      <Toast message={toast} tone="success" />
    </div>
  );
}
