import type { AppState, Action } from "../store";
import { openTasks, maidById, archiveForOutcome } from "../store";
import { PLATFORMS, OUTCOME_LABEL } from "../lib/stages";
import type { Platform } from "../lib/stages";
import { Check, X } from "lucide-react";
import { DataTable, EmptyState, Panel, StatusPill } from "../components/primitives";

interface PublishingProps {
  state: AppState;
  dispatch: (a: Action) => void;
  route: string;
  onNavigate: (key: string) => void;
}

const PLATFORM_LABEL: Record<Platform, string> = {
  maidmatch: "MaidMatch",
  peekaboo: "Peekaboo",
  yaya: "Yaya",
};

const PUBLISHING_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "nationality", label: "Nationality" },
  { key: "age", label: "Age" },
  { key: "maidmatch", label: "MaidMatch" },
  { key: "peekaboo", label: "Peekaboo" },
  { key: "yaya", label: "Yaya" },
  { key: "status", label: "Status" },
  { key: "actions", label: "" },
];

const QUEUE_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "nationality", label: "Nationality" },
  { key: "age", label: "Age" },
  { key: "actions", label: "" },
];

const TRIAL_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "nationality", label: "Nationality" },
  { key: "age", label: "Age" },
  { key: "employer", label: "Employer" },
  { key: "actions", label: "" },
];

const HIRED_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "nationality", label: "Nationality" },
  { key: "employer", label: "Employer" },
  { key: "date", label: "Date" },
];

const CANCELLED_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "nationality", label: "Nationality" },
  { key: "employer", label: "Employer" },
  { key: "date", label: "Date" },
  { key: "reason", label: "Reason" },
];

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

function fmtTime(ts?: number): string {
  return ts ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
}

export default function Publishing({ state, dispatch, route, onNavigate }: PublishingProps) {
  const openTask = (taskId: string) => {
    dispatch({ type: "RECORD_TASK_OPEN", taskId, now: Date.now() });
    onNavigate(`task/${taskId}`);
  };

  if (route === "Hired" || route === "Cancelled") {
    const isCancelled = route === "Cancelled";
    const outcomes = archiveForOutcome(state, route);
    const columns = isCancelled ? CANCELLED_COLUMNS : HIRED_COLUMNS;

    const rows = outcomes.map((outcome) => {
      const maid = maidById(state, outcome.housemaidId);
      return (
        <div className="table-row" key={outcome.id}>
          <span className="person-cell">
            <span className="avatar avatar-sm">{maid?.photoUrl ? <img src={maid.photoUrl} alt={maid?.name} /> : initials(maid?.name ?? outcome.housemaidId)}</span>
            <span style={{ minWidth: 0 }}>
              <strong>{maid?.name ?? outcome.housemaidId}</strong>
            </span>
          </span>
          <span>
            <strong>{maid?.nationality ?? "—"}</strong>
          </span>
          <span>
            <strong>{maid?.employerName ?? "—"}</strong>
          </span>
          <span>
            <strong>{formatDate(outcome.timestamp)}</strong>
          </span>
          {isCancelled && (
            <span>
              <small>{outcome.note ?? "—"}</small>
            </span>
          )}
        </div>
      );
    });

    return (
      <div className="page-stack">
        <header className="page-header">
          <div>
            <span className="eyebrow">Publishing</span>
            <h1>{OUTCOME_LABEL[route]}</h1>
            <p>
              {isCancelled
                ? "Trials that were cancelled, with the recorded reason."
                : "Maids whose trials ended in a successful hire."}
            </p>
          </div>
        </header>

        <Panel className="flush">
          <div className={`publishing-archive-table ${isCancelled ? "cancelled" : "hired"}`}>
            {outcomes.length === 0 ? (
              <EmptyState title="No records" hint="Completed outcomes will appear here." />
            ) : (
              <DataTable columns={columns} rows={rows} />
            )}
          </div>
        </Panel>
      </div>
    );
  }

  if (route === "AvailablePendingPublishing") {
    const tasks = openTasks(state, "publishing");
    const lastFailed = tasks.reduce((max, t) => Math.max(max, t.metadata?.publish?.lastFailedAt ?? 0), 0);

    const rows = tasks.map((task) => {
      const maid = maidById(state, task.housemaidId);
      const pub = task.metadata?.publish;
      const held = pub?.heldReason;
      const anyFailed = PLATFORMS.some((p) => pub?.platforms[p]?.status === "failed");
      const rowClass = held || anyFailed ? "row-issue" : "row-waiting";

      return (
        <div className={`table-row ${rowClass}`} key={task.id}>
          <span className="person-cell">
            <span className="avatar avatar-sm">{maid?.photoUrl ? <img src={maid.photoUrl} alt={maid?.name} /> : initials(maid?.name ?? task.housemaidId)}</span>
            <span style={{ minWidth: 0 }}>
              <strong>{maid?.name ?? task.housemaidId}</strong>
            </span>
          </span>
          <span>
            <strong>{maid?.nationality ?? "—"}</strong>
          </span>
          <span>
            <strong>{maid ? `${maid.age}y` : "—"}</strong>
          </span>
          {PLATFORMS.map((platform) => {
            const st = pub?.platforms[platform];
            const status = st?.status ?? "pending";
            return (
              <span key={platform} style={{ display: "flex", justifyContent: "center" }}>
                <span
                  className={`platform-cell ${status}`}
                  title={`${PLATFORM_LABEL[platform]} — ${status}${st?.failureReason ? `: ${st.failureReason}` : ""}`}
                >
                  {status === "posted" ? <Check size={14} strokeWidth={3} aria-label={`${PLATFORM_LABEL[platform]} posted`} /> : status === "failed" ? <X size={14} strokeWidth={3} aria-label={`${PLATFORM_LABEL[platform]} failed`} /> : <i className="pending-dot" />}
                </span>
              </span>
            );
          })}
          <span>
            {held ? (
              <StatusPill tone="danger">Held — {held}</StatusPill>
            ) : anyFailed ? (
              <StatusPill tone="danger">Failed</StatusPill>
            ) : (
              <StatusPill tone="warning">Posting…</StatusPill>
            )}
          </span>
          <span style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="button" className="primary-button small" onClick={() => openTask(task.id)}>
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
            <span className="eyebrow">Publishing</span>
            <h1>Available Pending Publishing</h1>
            <p>
              The system posts each profile to all three platforms. A failure on one never blocks the others,
              and each is retried. She moves to Available &amp; Published once all three are green.
            </p>
            <p style={{ fontSize: 12, marginTop: 8, color: "var(--muted)" }}>
              {lastFailed
                ? `Last time the system tried and failed: ${fmtTime(lastFailed)}`
                : "No failed posts on record."}{" "}
              <button type="button" className="text-button" onClick={() => dispatch({ type: "RUN_PUBLISH_JOB", now: Date.now() })}>
                Run publish job now
              </button>
            </p>
          </div>
        </header>

        <Panel className="flush">
          <div className="publishing-table">
            {tasks.length === 0 ? (
              <EmptyState
                title="Nothing pending publishing"
                hint="Maids finishing production will appear here."
              />
            ) : (
              <DataTable columns={PUBLISHING_COLUMNS} rows={rows} />
            )}
          </div>
        </Panel>
      </div>
    );
  }

  const isTrial = route === "UnderTrial";
  const taskType = isTrial ? "trial" : "available";
  const tasks = openTasks(state, taskType);

  const rows = tasks.map((task) => {
    const maid = maidById(state, task.housemaidId);
    return (
      <div className="table-row" key={task.id}>
        <span className="person-cell">
          <span className="avatar avatar-sm">{maid?.photoUrl ? <img src={maid.photoUrl} alt={maid?.name} /> : initials(maid?.name ?? task.housemaidId)}</span>
          <span style={{ minWidth: 0 }}>
            <strong>{maid?.name ?? task.housemaidId}</strong>
          </span>
        </span>
        <span>
          <strong>{maid?.nationality ?? "—"}</strong>
        </span>
        <span>
          <strong>{maid ? `${maid.age}y` : "—"}</strong>
        </span>
        {isTrial && (
          <span>
            <strong>{maid?.employerName ?? "—"}</strong>
          </span>
        )}
        <span style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" className="primary-button small" onClick={() => openTask(task.id)}>
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
          <span className="eyebrow">Publishing</span>
          <h1>{isTrial ? "Under Trial" : "Available & Published"}</h1>
          <p>
            {isTrial
              ? "Open a task to record the trial outcome — hired, sent back, or cancelled."
              : "Open a task to move the maid under trial with an employer."}
          </p>
        </div>
      </header>

      <Panel className="flush">
        <div className={`publishing-queue-table ${isTrial ? "trial" : ""}`.trim()}>
          {tasks.length === 0 ? (
            <EmptyState
              title={isTrial ? "No maids under trial" : "No maids published"}
              hint={isTrial ? "Trials will appear here." : "Published maids will appear here."}
            />
          ) : (
            <DataTable columns={isTrial ? TRIAL_COLUMNS : QUEUE_COLUMNS} rows={rows} />
          )}
        </div>
      </Panel>
    </div>
  );
}
