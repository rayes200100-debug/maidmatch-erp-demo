import { useState } from "react";
import { Search, X, RefreshCw, AlertTriangle, Check } from "lucide-react";
import type { AppState, Action } from "../store";
import { housemaidStatus, canSendToRetraction } from "../store";
import { searchByFields } from "../lib/search";
import { maidTypeLabel } from "../data";
import { fetchCcLiveInDueToday, filterCcLiveIn, carriedOverDays } from "../lib/ccLiveIn";
import type { CcLiveInFilter } from "../lib/ccLiveIn";
import { DataTable, EmptyState, Panel, StatusPill, Toast } from "../components/primitives";

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

function Avatar({ name, photoUrl }: { name: string; photoUrl?: string }) {
  return (
    <span className="avatar avatar-sm">
      {photoUrl ? <img src={photoUrl} alt={name} /> : initials(name)}
    </span>
  );
}

function fmtTime(ts: number | null): string {
  return ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
}

function statusTone(label: string): "neutral" | "success" | "warning" | "danger" | "info" | "gold" {
  if (label === "N/A") return "neutral";
  if (label.startsWith("In retraction queue")) return "warning";
  if (label === "Hired") return "success";
  if (label === "Cancelled" || label === "Moved to Offboard" || label === "Retracted to CC") return "danger";
  return "info";
}

const SEARCH_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "nationality", label: "Nationality" },
  { key: "age", label: "Age" },
  { key: "type", label: "Type" },
  { key: "mobile", label: "Mobile" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "erp", label: "Maids.cc ID" },
  { key: "visa", label: "Visa expiry" },
  { key: "status", label: "Status" },
  { key: "actions", label: "" },
];

const CC_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "nationality", label: "Nationality" },
  { key: "room", label: "Room" },
  { key: "erp", label: "Maids.cc ID" },
  { key: "visa", label: "Visa expiry" },
  { key: "due", label: "Due today" },
  { key: "status", label: "Status" },
  { key: "actions", label: "" },
];

const FILTER_OPTIONS: { value: CcLiveInFilter["kind"]; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 days" },
  { value: "custom", label: "Custom" },
];

const FILTER_LABEL: Record<CcLiveInFilter["kind"], string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7: "Last 7 days",
  custom: "Custom",
};

export default function Reception({ state, dispatch }: ReceptionProps) {
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [filterKind, setFilterKind] = useState<CcLiveInFilter["kind"]>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [page, setPage] = useState(0);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  };

  const runSearch = () => {
    setSubmittedQuery(search.trim());
    setPage(0);
  };

  const PAGE_SIZE = 8;
  const allMatches = searchByFields(state.housemaids, submittedQuery);
  const totalPages = Math.max(1, Math.ceil(allMatches.length / PAGE_SIZE));
  const matches = submittedQuery ? allMatches.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : [];

  const sendToRetraction = (housemaidId: string) => {
    dispatch({ type: "SEND_TO_RETRACTION", housemaidId, actor: state.currentRole, now: Date.now() });
    showToast("Sent to Retraction Team");
  };

  const searchRows = matches.map((h) => {
    const status = housemaidStatus(state, h);
    const sendable = canSendToRetraction(h);
    return (
      <div className="table-row" key={h.id}>
        <span className="person-cell">
          <Avatar name={h.name} photoUrl={h.photoUrl} />
          <span style={{ minWidth: 0 }}>
            <strong>{h.name}</strong>
          </span>
        </span>
        <span><strong>{h.nationality}</strong></span>
        <span><strong>{h.age}y</strong></span>
        <span><strong>{maidTypeLabel(h)}</strong></span>
        <span><strong>{h.mobile || "—"}</strong></span>
        <span><strong>{h.whatsapp || "—"}</strong></span>
        <span><strong>{h.maidsCcId || "—"}</strong></span>
        <span><strong>{h.visaExpiry}</strong></span>
        <span><StatusPill tone={statusTone(status.label)}>{status.label}</StatusPill></span>
        <span style={{ display: "flex", justifyContent: "flex-end" }}>
          {sendable ? (
            <button type="button" className="primary-button small" onClick={() => sendToRetraction(h.id)}>
              Send to Retraction
            </button>
          ) : (
            <span className="locked-action" title="Already in the pipeline">
              <Check size={15} aria-hidden />
              <small>{status.label}</small>
            </span>
          )}
        </span>
      </div>
    );
  });

  const now = Date.now();
  const filter: CcLiveInFilter =
    filterKind === "custom"
      ? { kind: "custom", from: customFrom ? new Date(customFrom).getTime() : 0, to: customTo ? new Date(customTo).getTime() + 86399999 : now }
      : { kind: filterKind };

  const ccItems = filterCcLiveIn(state.ccLiveIn.items, filter, now);
  const ccTotal = ccItems.length;
  const ccCollected = ccItems.filter((i) => i.collected).length;
  const ccRemaining = ccTotal - ccCollected;

  const refresh = () => {
    if (simulateFailure) {
      dispatch({ type: "REFRESH_CC_LIVE_IN", now: Date.now(), error: "network" });
    } else {
      dispatch({ type: "REFRESH_CC_LIVE_IN", now: Date.now(), entries: fetchCcLiveInDueToday() });
    }
  };

  const collect = (maidsCcId: string) => {
    dispatch({ type: "COLLECT_CC_LIVE_IN", maidsCcId, actor: state.currentRole, now: Date.now() });
    showToast("Collected and sent to Retraction Team");
  };

  const ccRows = ccItems.map((entry) => {
    const carried = carriedOverDays(entry.addedAt, now);
    return (
      <div className="table-row" key={entry.maidsCcId}>
        <span className="person-cell">
          <Avatar name={entry.name} photoUrl={entry.photoUrl} />
          <span style={{ minWidth: 0 }}>
            <strong>{entry.name}</strong>
          </span>
        </span>
        <span><strong>{entry.nationality}</strong></span>
        <span><strong>{entry.room}</strong></span>
        <span><strong>{entry.maidsCcId}</strong></span>
        <span><strong>{entry.visaExpiry}</strong></span>
        <span><small>{entry.dueReason}</small></span>
        <span>
          {entry.collected ? (
            <StatusPill tone="success">Collected</StatusPill>
          ) : carried !== null ? (
            <StatusPill tone="danger">Carried over · {carried}d</StatusPill>
          ) : (
            <StatusPill tone="warning">To collect</StatusPill>
          )}
        </span>
        <span style={{ display: "flex", justifyContent: "flex-end" }}>
          {entry.collected ? (
            <span className="locked-action">
              <Check size={15} aria-hidden />
              <small>Collected</small>
            </span>
          ) : (
            <button type="button" className="primary-button small" onClick={() => collect(entry.maidsCcId)}>
              Send to Retraction
            </button>
          )}
        </span>
      </div>
    );
  });

  const refreshError = state.ccLiveIn.lastRefreshError;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">Reception</span>
          <h1>Reception</h1>
          <p>Find a maid and hand her over to the retraction team — or collect CC live-in maids from the accommodation.</p>
        </div>
      </header>

      <Panel className="flush">
        <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--line)" }}>
          <h2 style={{ margin: "0 0 6px", fontSize: 16 }}>Walk-in search</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div className="inline-search" style={{ flex: 1, minWidth: 240 }}>
              <Search size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") runSearch();
                }}
                placeholder="Search name, maids.cc ID, mobile, WhatsApp or passport…"
                aria-label="Search maids"
              />
              {search && (
                <button type="button" className="text-button" onClick={() => setSearch("")} aria-label="Clear search">
                  <X size={14} />
                </button>
              )}
            </div>
            <button type="button" className="primary-button small" onClick={runSearch}>
              <Search size={14} /> Search
            </button>
          </div>
        </div>
        <div className="reception-table">
          {submittedQuery === "" ? (
            <div style={{ padding: 20 }}>
              <EmptyState title="Search to find a maid" hint="Type a name, number or maids.cc ID, then press Search." />
            </div>
          ) : matches.length === 0 ? (
            <div style={{ padding: 20 }}>
              <EmptyState title="No matches" hint="Try a different name, number, or maids.cc ID." />
            </div>
          ) : (
            <>
              <DataTable columns={SEARCH_COLUMNS} rows={searchRows} />
              {allMatches.length > PAGE_SIZE && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 15px", borderTop: "1px solid var(--line)" }}>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, allMatches.length)} of {allMatches.length} results
                  </span>
                  <span style={{ display: "flex", gap: 8 }}>
                    <button type="button" className="secondary-button small" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                      Previous
                    </button>
                    <button type="button" className="secondary-button small" disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
                      Next
                    </button>
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </Panel>

      <Panel className="flush">
        <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: "0 0 6px", fontSize: 16 }}>CC live-in</h2>
              <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: 13 }}>
                {FILTER_LABEL[filterKind]}: {ccTotal} total · {ccCollected} collected · {ccRemaining} remaining
              </p>
              <p style={{ margin: "6px 0 0", color: "var(--muted)", fontSize: 12 }}>
                {refreshError
                  ? `Could not refresh — showing the list as of ${fmtTime(state.ccLiveIn.lastSuccessfulAt)}`
                  : `Last refreshed ${fmtTime(state.ccLiveIn.lastRefreshedAt)} · auto-refreshes hourly`}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}>
                <input type="checkbox" checked={simulateFailure} onChange={(e) => setSimulateFailure(e.target.checked)} />
                Simulate API failure
              </label>
              <select value={filterKind} onChange={(e) => setFilterKind(e.target.value as CcLiveInFilter["kind"])} style={selectStyle} aria-label="Filter CC live-in">
                {FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <button type="button" className="secondary-button small" onClick={refresh}>
                <RefreshCw size={14} />
                Refresh now
              </button>
            </div>
          </div>

          {filterKind === "custom" && (
            <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>From</span>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={selectStyle} />
              <span style={{ fontSize: 12, color: "var(--muted)" }}>To</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={selectStyle} />
            </div>
          )}

          {refreshError && (
            <div className="attention-strip" style={{ marginTop: 12 }}>
              <AlertTriangle size={18} />
              <span>Could not refresh the CC live-in list. Showing the last successfully loaded list.</span>
              <button type="button" className="text-button" onClick={refresh}>Retry</button>
            </div>
          )}
        </div>
        <div className="cc-livein-table">
          {ccItems.length === 0 ? (
            <div style={{ padding: 20 }}>
              <EmptyState title="No CC live-in maids in this period" hint="Maids due for collection will appear here." />
            </div>
          ) : (
            <DataTable columns={CC_COLUMNS} rows={ccRows} />
          )}
        </div>
      </Panel>

      <Toast message={toast} tone="success" />
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  height: 36,
  padding: "0 10px",
  border: "1px solid var(--line-strong)",
  borderRadius: 10,
  background: "#fff",
  fontSize: 12,
  color: "var(--ink-soft)",
};
