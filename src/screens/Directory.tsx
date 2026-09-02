import { useState } from "react";
import { Search, X } from "lucide-react";
import type { AppState, Action } from "../store";
import { HOUSEMAID_TYPE_OPTIONS, NATIONALITY_OPTIONS } from "../data";
import type { Stage } from "../lib/stages";
import { DataTable, EmptyState, Panel, StatusPill } from "../components/primitives";

interface DirectoryProps {
  state: AppState;
  dispatch: (a: Action) => void;
  route: string;
}

const STAGE_LABELS: Record<Stage, string> = {
  Reception: "Reception",
  PendingRetraction: "Pending Retraction",
  PendingShooting: "Pending Shooting",
  PendingEditing: "Pending Editing",
  AvailablePendingPublishing: "Available Pending Publishing",
  AvailablePublished: "Available & Published",
  UnderTrial: "Under Trial",
  RetractedToCC: "Retracted to CC",
  MovedToOffboard: "Moved to Offboard",
  Hired: "Hired",
  Cancelled: "Cancelled",
};

const STAGE_ORDER: Stage[] = [
  "Reception",
  "PendingRetraction",
  "PendingShooting",
  "PendingEditing",
  "AvailablePendingPublishing",
  "AvailablePublished",
  "UnderTrial",
  "Hired",
  "Cancelled",
  "RetractedToCC",
  "MovedToOffboard",
];

function stageTone(stage: Stage): "neutral" | "success" | "warning" | "danger" | "info" | "gold" {
  switch (stage) {
    case "Hired":
      return "success";
    case "Cancelled":
    case "MovedToOffboard":
    case "RetractedToCC":
      return "danger";
    case "UnderTrial":
      return "warning";
    default:
      return "neutral";
  }
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

const columns = [
  { key: "name", label: "Name" },
  { key: "nationality", label: "Nationality" },
  { key: "type", label: "Type" },
  { key: "age", label: "Age" },
  { key: "stage", label: "Stage" },
  { key: "golden", label: "Golden" },
];

export default function Directory({ state }: DirectoryProps) {
  const [search, setSearch] = useState("");
  const [nationality, setNationality] = useState("all");
  const [type, setType] = useState("all");
  const [stage, setStage] = useState("all");

  const q = search.trim().toLowerCase();
  const filtered = state.housemaids.filter((h) => {
    const matchesSearch =
      !q ||
      h.name.toLowerCase().includes(q) ||
      h.nationality.toLowerCase().includes(q) ||
      h.mobile.toLowerCase().includes(q) ||
      h.whatsapp.toLowerCase().includes(q) ||
      h.maidsCcId.toLowerCase().includes(q);
    const matchesNat = nationality === "all" || h.nationality === nationality;
    const matchesType = type === "all" || h.housemaidType === type;
    const matchesStage = stage === "all" || h.currentStage === stage;
    return matchesSearch && matchesNat && matchesType && matchesStage;
  });

  const rows = filtered.map((maid) => (
    <div className="table-row" key={maid.id}>
      <span className="person-cell">
        <span className="avatar avatar-sm">{initials(maid.name)}</span>
        <span style={{ minWidth: 0 }}>
          <strong>{maid.name}</strong>
          <small>{maid.mobile}</small>
        </span>
      </span>
      <span>
        <strong>{maid.nationality}</strong>
      </span>
      <span>
        <strong>{maid.housemaidType}</strong>
      </span>
      <span>
        <strong>{maid.age}y</strong>
      </span>
      <span>
        <StatusPill tone={stageTone(maid.currentStage)}>{STAGE_LABELS[maid.currentStage]}</StatusPill>
      </span>
      <span>{maid.isGoldenProfile ? <StatusPill tone="gold">Golden</StatusPill> : "—"}</span>
    </div>
  ));

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Workspace</span>
          <h1>Directory</h1>
          <p>Every housemaid in the system, across all stages.</p>
        </div>
      </header>

      <Panel className="flush">
        <div style={{ display: "flex", gap: 10, padding: "12px 14px", borderBottom: "1px solid var(--line)", alignItems: "center", flexWrap: "wrap" }}>
          <div className="inline-search" style={{ flex: 1, minWidth: 220 }}>
            <Search size={16} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, number, or maids.cc ID" aria-label="Search directory" />
            {search && (
              <button type="button" className="text-button" onClick={() => setSearch("")} aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>
          <select value={nationality} onChange={(e) => setNationality(e.target.value)} aria-label="Filter by nationality" style={selectStyle}>
            <option value="all">All nationalities</option>
            {NATIONALITY_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type" style={selectStyle}>
            <option value="all">All types</option>
            {HOUSEMAID_TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Filter by stage" style={selectStyle}>
            <option value="all">All stages</option>
            {STAGE_ORDER.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
          <span style={{ color: "var(--muted)", fontSize: 12, whiteSpace: "nowrap" }}>
            {filtered.length} of {state.housemaids.length}
          </span>
        </div>
        <div className="directory-table">
          {filtered.length === 0 ? (
            <div style={{ padding: 20 }}>
              <EmptyState title="No maids match" hint="Try adjusting your search or filters." />
            </div>
          ) : (
            <DataTable columns={columns} rows={rows} />
          )}
        </div>
      </Panel>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  height: 42,
  padding: "0 10px",
  border: "1px solid var(--line-strong)",
  borderRadius: 10,
  background: "#fff",
  fontSize: 13,
  color: "var(--ink-soft)",
};
