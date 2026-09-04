import { useEffect, useMemo, useState } from "react";
import { Search, X, RefreshCw } from "lucide-react";
import type { AppState, Action } from "../store";
import { openTasks, maidById, archiveForOutcome, sortedRetractionTasks, retractionPosition } from "../store";
import type { OutcomeType } from "../lib/stages";
import { OUTCOME_LABEL } from "../lib/stages";
import { ROLES } from "../lib/roles";
import { activeTimeInQueue } from "../lib/hours";
import { maidTypeLabel } from "../data";
import type { HousemaidType, Housemaid } from "../data";
import { DataTable, EmptyState, Panel, StatusPill } from "../components/primitives";

interface RetractionProps {
  state: AppState;
  dispatch: (a: Action) => void;
  route: string;
  onNavigate: (key: string) => void;
}

type TabKey = "all" | HousemaidType;

const TYPE_TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Priority Queue" },
  { key: "MV", label: "MV" },
  { key: "CC live-in", label: "CC live-in" },
  { key: "CC live-out", label: "CC live-out" },
  { key: "Cleaner", label: "Cleaners" },
];

const QUEUE_COLUMNS = [
  { key: "pos", label: "Position" },
  { key: "name", label: "Name" },
  { key: "type", label: "Type" },
  { key: "nationality", label: "Nationality" },
  { key: "age", label: "Age" },
  { key: "visa", label: "Visa expiry" },
  { key: "golden", label: "Golden" },
  { key: "time", label: "Time in queue" },
  { key: "sentBy", label: "Sent by" },
  { key: "actions", label: "" },
];

const DOCUMENTS_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "nationality", label: "Nationality" },
  { key: "type", label: "Type" },
  { key: "retracted", label: "Retracted on" },
  { key: "time", label: "Time waiting" },
  { key: "unpaid", label: "Unpaid leave" },
  { key: "consent", label: "MMR consent" },
  { key: "expiry", label: "Expiry Date" },
  { key: "actions", label: "" },
];

const ARCHIVE_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "nationality", label: "Nationality" },
  { key: "date", label: "When" },
  { key: "actor", label: "Who decided" },
  { key: "details", label: "Outcome" },
];

const ARCHIVE_TYPES: OutcomeType[] = ["MovedToOffboard", "RetractedToCC", "RetractedToMaidMatch"];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function fmtTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function roleLabel(id: string): string {
  return ROLES.find((r) => r.id === id)?.label ?? id;
}

function archiveDetails(type: OutcomeType, maid: Housemaid | undefined, metadata: Record<string, unknown> | undefined): string {
  if (type === "MovedToOffboard") return metadata?.note ? `Reason: ${metadata.note}` : "Terminated";
  if (type === "RetractedToCC") return metadata?.grantedAmount != null ? `Granted AED ${metadata.grantedAmount}` : "Switched to CC";
  const profile = maid?.maidMatchProfile;
  if (profile?.source) return `Source: ${profile.source}`;
  if (profile?.livingArrangement) return `Arrangement: ${profile.livingArrangement}`;
  return "Joined MaidMatch";
}

export default function Retraction({ state, dispatch, route, onNavigate }: RetractionProps) {
  const [tab, setTab] = useState<TabKey>("all");
  const [archiveSearch, setArchiveSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [simulateDocFailure, setSimulateDocFailure] = useState(false);

  useEffect(() => {
    setTab("all");
    setArchiveSearch("");
    setFromDate("");
    setToDate("");
  }, [route]);

  if (ARCHIVE_TYPES.includes(route as OutcomeType)) {
    const type = route as OutcomeType;
    const q = archiveSearch.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate).getTime() : null;
    const to = toDate ? new Date(toDate).getTime() + 86399999 : null;

    const outcomes = archiveForOutcome(state, type).filter((outcome) => {
      const maid = maidById(state, outcome.housemaidId);
      if (q && !(maid?.name.toLowerCase().includes(q) ?? false)) return false;
      if (from && outcome.timestamp < from) return false;
      if (to && outcome.timestamp > to) return false;
      return true;
    });

    const rows = outcomes.map((outcome) => {
      const maid = maidById(state, outcome.housemaidId);
      const metadata = outcome.metadata as Record<string, unknown> | undefined;
      return (
        <div className="table-row" key={outcome.id}>
          <span className="person-cell">
            <span className="avatar avatar-sm">{maid?.photoUrl ? <img src={maid.photoUrl} alt={maid.name} /> : initials(maid?.name ?? outcome.housemaidId)}</span>
            <span style={{ minWidth: 0 }}>
              <strong>{maid?.name ?? outcome.housemaidId}</strong>
            </span>
          </span>
          <span>
            <strong>{maid?.nationality ?? "—"}</strong>
          </span>
          <span>
            <strong>{formatDate(outcome.timestamp)}</strong>
          </span>
          <span>
            <strong>{roleLabel(outcome.actorRole)}</strong>
          </span>
          <span>
            <small>{archiveDetails(type, maid, metadata)}</small>
          </span>
        </div>
      );
    });

    return (
      <div className="page-stack">
        <header className="page-header">
          <div>
            <span className="eyebrow">Retraction</span>
            <h1>{OUTCOME_LABEL[type]}</h1>
            <p>Read-only record of maids previously routed out of the retraction queue.</p>
          </div>
        </header>

        <Panel className="flush">
          <div style={{ display: "flex", gap: 10, padding: "12px 14px", borderBottom: "1px solid var(--line)", alignItems: "center", flexWrap: "wrap" }}>
            <div className="inline-search" style={{ flex: 1, minWidth: 200 }}>
              <Search size={16} />
              <input value={archiveSearch} onChange={(e) => setArchiveSearch(e.target.value)} placeholder="Search by name…" aria-label="Search archive" />
              {archiveSearch && (
                <button type="button" className="text-button" onClick={() => setArchiveSearch("")} aria-label="Clear search">
                  <X size={14} />
                </button>
              )}
            </div>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={dateStyle} aria-label="From date" />
            <span style={{ fontSize: 12, color: "var(--muted)" }}>to</span>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={dateStyle} aria-label="To date" />
            <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap" }}>{outcomes.length} records</span>
          </div>
          <div className="retraction-archive-table">
            {outcomes.length === 0 ? (
              <EmptyState title="No records" hint="Completed outcomes will appear here." />
            ) : (
              <DataTable columns={ARCHIVE_COLUMNS} rows={rows} />
            )}
          </div>
        </Panel>
      </div>
    );
  }

  const isRetraction = route === "PendingRetraction";
  const sorted = sortedRetractionTasks(state);
  const counts = useMemo(() => {
    const map: Record<TabKey, number> = { all: sorted.length, MV: 0, "CC live-in": 0, "CC live-out": 0, Cleaner: 0 };
    for (const r of sorted) map[r.maid.housemaidType] = (map[r.maid.housemaidType] ?? 0) + 1;
    return map;
  }, [sorted]);

  const openTask = (taskId: string, housemaidId: string) => {
    if (isRetraction) {
      const pos = retractionPosition(state, housemaidId);
      dispatch({ type: "RECORD_RETRACTION_OPEN", housemaidId, role: state.currentRole, openedPosition: pos ?? 1, now: Date.now() });
    }
    dispatch({ type: "RECORD_TASK_OPEN", taskId, now: Date.now() });
    onNavigate(`task/${taskId}`);
  };

  const rows = sorted.filter((r) => tab === "all" || r.maid.housemaidType === tab).map((r) => {
    const maid = r.maid;
    const pos = retractionPosition(state, maid.id);
    const nextUp = pos === 1;
    const timeInQueue = activeTimeInQueue(r.task.createdAt, Date.now(), state.config.workingHours, state.config.daysOff);
    return (
      <div className={"table-row" + (nextUp ? " next-up" : "")} key={r.task.id}>
        <span>
          <strong>#{pos}</strong>
          {nextUp && <StatusPill tone="info">Next up</StatusPill>}
        </span>
        <span className="person-cell">
          <span className="avatar avatar-sm">{maid.photoUrl ? <img src={maid.photoUrl} alt={maid.name} /> : initials(maid.name)}</span>
          <span style={{ minWidth: 0 }}>
            <strong>{maid.name}</strong>
          </span>
        </span>
        <span>
          <strong>{maidTypeLabel(maid)}</strong>
        </span>
        <span>
          <strong>{maid.nationality}</strong>
        </span>
        <span>
          <strong>{maid.age}y</strong>
        </span>
        <span>
          <strong>{maid.visaExpiry}</strong>
        </span>
        <span>{maid.isGoldenProfile ? <StatusPill tone="gold">Golden</StatusPill> : "—"}</span>
        <span>
          <strong>{timeInQueue}</strong>
        </span>
        <span>
          <strong>{r.task.sentByRole ? roleLabel(r.task.sentByRole) : "—"}</strong>
        </span>
        <span style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="primary-button small" onClick={() => openTask(r.task.id, maid.id)}>
            Open Task
          </button>
        </span>
      </div>
    );
  });

  const docTasks = openTasks(state, "documents");
  const lastCheckedAt = docTasks.reduce((max, t) => Math.max(max, t.metadata?.documents?.lastCheckedAt ?? 0), 0);
  const lastCheckError = docTasks.find((t) => t.metadata?.documents?.lastCheckError)?.metadata?.documents?.lastCheckError;

  const refreshDocuments = () => {
    dispatch({ type: "CHECK_DOCUMENTS", now: Date.now(), error: simulateDocFailure ? "Could not check the ERP" : undefined });
  };

  const documentsRows = docTasks.map((task) => {
    const maid = maidById(state, task.housemaidId);
    const docs = task.metadata?.documents;
    const timeWaiting = activeTimeInQueue(task.createdAt, Date.now(), state.config.workingHours, state.config.daysOff);
    const bothCollected = !!docs?.unpaidLeave?.collected && !!docs?.mmrConsent?.collected;
    return (
      <div className="table-row" key={task.id}>
        <span className="person-cell">
          <span className="avatar avatar-sm">{maid?.photoUrl ? <img src={maid.photoUrl} alt={maid?.name} /> : initials(maid?.name ?? task.housemaidId)}</span>
          <span style={{ minWidth: 0 }}>
            <strong>{maid?.name ?? task.housemaidId}</strong>
            <small className="mobile-subline">{maid?.nationality ?? "—"} · {maid ? maidTypeLabel(maid) : "—"}</small>
          </span>
        </span>
        <span>
          <strong>{maid?.nationality ?? "—"}</strong>
        </span>
        <span>
          <strong>{maid ? maidTypeLabel(maid) : "—"}</strong>
        </span>
        <span>
          <strong>{formatDate(task.createdAt)}</strong>
        </span>
        <span>
          <strong>{timeWaiting}</strong>
        </span>
        <span>
          {docs?.unpaidLeave?.collected ? <StatusPill tone="success">Collected</StatusPill> : <StatusPill tone="warning">Pending</StatusPill>}
        </span>
        <span>
          {docs?.mmrConsent?.collected ? <StatusPill tone="success">Collected</StatusPill> : <StatusPill tone="warning">Pending</StatusPill>}
        </span>
        <span>
          {docs?.unpaidLeave?.expiryDate ? (
            <strong>{docs.unpaidLeave.expiryDate}</strong>
          ) : bothCollected ? (
            <StatusPill tone="warning">Pending</StatusPill>
          ) : (
            <small>—</small>
          )}
        </span>
        <span style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="primary-button small" onClick={() => openTask(task.id, task.housemaidId)}>
            Open Task
          </button>
        </span>
      </div>
    );
  });

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">{isRetraction ? "Retraction" : "Document Collection"}</span>
          <h1>{isRetraction ? "Pending Retraction" : "Pending Documents Collection"}</h1>
          <p>
            {isRetraction
              ? "Work the top of the queue first — the order is set in System Configuration, not here."
              : "She is not handed to Media until the unpaid-leave and MMR-consent papers are both collected and the expiry date is saved."}
          </p>
        </div>
        {isRetraction && (
          <div className="page-actions">
            <StatusPill tone="neutral">Priority: {state.config.priorityAlgorithm}{state.config.liveInPriority ? " · live-in first" : ""}</StatusPill>
          </div>
        )}
      </header>

      <Panel className="flush">
        {isRetraction && (
          <div className="queue-tabs" role="tablist" aria-label="Filter retraction queue by type">
            {TYPE_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                className={tab === t.key ? "active" : ""}
                onClick={() => setTab(t.key)}
              >
                {t.label} <b>{counts[t.key]}</b>
              </button>
            ))}
          </div>
        )}
        {!isRetraction && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderBottom: "1px solid var(--line)", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {lastCheckError ? `Could not check — showing as of ${lastCheckedAt ? fmtTime(lastCheckedAt) : "—"}` : `Last checked ${lastCheckedAt ? fmtTime(lastCheckedAt) : "—"} · auto-checks every 30 min`}
            </span>
            <button type="button" className="secondary-button small" onClick={refreshDocuments}>
              <RefreshCw size={14} /> Refresh
            </button>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)" }}>
              <input type="checkbox" checked={simulateDocFailure} onChange={(e) => setSimulateDocFailure(e.target.checked)} />
              Simulate API failure
            </label>
          </div>
        )}
        <div className={isRetraction ? "retraction-queue-table" : "documents-queue-table"}>
          {isRetraction ? (
            rows.length === 0 ? (
              <EmptyState title="No pending retractions" hint="Maids sent from Reception will appear here." />
            ) : (
              <DataTable columns={QUEUE_COLUMNS} rows={rows} />
            )
          ) : documentsRows.length === 0 ? (
            <EmptyState title="No documents to collect" hint="Maids retracted to MaidMatch will appear here." />
          ) : (
            <DataTable columns={DOCUMENTS_COLUMNS} rows={documentsRows} />
          )}
        </div>
      </Panel>
    </div>
  );
}

const dateStyle: React.CSSProperties = {
  height: 36,
  padding: "0 10px",
  border: "1px solid var(--line-strong)",
  borderRadius: 10,
  background: "#fff",
  fontSize: 12,
  color: "var(--ink-soft)",
};
