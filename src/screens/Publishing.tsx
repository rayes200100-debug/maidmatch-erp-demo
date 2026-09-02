import { useEffect, useState } from "react";
import type { AppState, Action } from "../store";
import { openTasks, maidById, archiveForOutcome } from "../store";
import { PLATFORMS, OUTCOME_LABEL } from "../lib/stages";
import type { Platform } from "../lib/stages";
import { DataTable, EmptyState, Panel } from "../components/primitives";
import { WorkspaceSplit } from "../components/WorkspaceSplit";
import type { WorkspacePane } from "../components/WorkspaceSplit";

interface PublishingProps {
  state: AppState;
  dispatch: (a: Action) => void;
  route: string;
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
];

const QUEUE_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "nationality", label: "Nationality" },
  { key: "age", label: "Age" },
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
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function Publishing({ state, dispatch, route }: PublishingProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activePane, setActivePane] = useState<WorkspacePane>("task");

  useEffect(() => {
    setSelectedTaskId(null);
  }, [route]);

  const openComplaints = (erpLink: string) => {
    window.open(erpLink, "_blank", "noopener,noreferrer");
  };

  const handleAction = (action: Action) => {
    dispatch(action);
    if (
      action.type === "UNDER_TRIAL" ||
      action.type === "HIRED" ||
      action.type === "SEND_BACK_TO_PUBLISHED" ||
      action.type === "SEND_BACK_TO_PENDING_PUBLISHING" ||
      action.type === "CANCEL"
    ) {
      setSelectedTaskId(null);
    }
  };

  const togglePlatform = (housemaidId: string, platform: Platform, green: boolean) => {
    dispatch({ type: green ? "UNFLAG_PLATFORM" : "FLAG_PLATFORM", housemaidId, platform, now: Date.now() });
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
            <span className="avatar avatar-sm">{initials(maid?.name ?? outcome.housemaidId)}</span>
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
        <style>{`
          .publishing-archive-table .table-row { grid-template-columns: ${isCancelled ? "1.4fr .8fr 1.1fr .9fr 1.7fr" : "1.5fr .8fr 1.3fr .9fr"}; }
        `}</style>

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

        <Panel>
          <div className="publishing-archive-table">
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

    const rows = tasks.map((task) => {
      const maid = maidById(state, task.housemaidId);
      return (
        <div className="table-row" key={task.id}>
          <span className="person-cell">
            <span className="avatar avatar-sm">{initials(maid?.name ?? task.housemaidId)}</span>
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
            const green = task.metadata?.publishState?.[platform] ?? false;
            return (
              <span key={platform}>
                <button
                  type="button"
                  className="platform-cell"
                  onClick={() => togglePlatform(task.housemaidId, platform, green)}
                  aria-label={`${green ? "Unpublish from" : "Publish to"} ${PLATFORM_LABEL[platform]}`}
                  aria-pressed={green}
                >
                  <i className={green ? "green" : ""}>&#10003;</i>
                  <span>{PLATFORM_LABEL[platform]}</span>
                </button>
              </span>
            );
          })}
        </div>
      );
    });

    return (
      <div className="page-stack">
        <style>{`
          .publishing-table .table-row { grid-template-columns: 1.6fr .8fr .5fr .8fr .8fr .8fr; }
          .publishing-table .platform-cell { border: 0; background: transparent; cursor: pointer; padding: 4px 6px; border-radius: 8px; font-size: 12px; }
          .publishing-table .platform-cell:hover { background: #f6ece7; }
        `}</style>

        <header className="page-header">
          <div>
            <span className="eyebrow">Publishing</span>
            <h1>Available Pending Publishing</h1>
            <p>
              Click a platform cell to publish to that channel. Once all three are green the maid
              automatically moves to Available &amp; Published.
            </p>
          </div>
        </header>

        <Panel>
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

  if (selectedTaskId) {
    const task = state.tasks.find((t) => t.id === selectedTaskId);
    const maid = task ? maidById(state, task.housemaidId) : undefined;
    if (task && maid) {
      return (
        <div className="page-stack">
          <button type="button" className="text-button" onClick={() => setSelectedTaskId(null)}>
            &larr; Back to list
          </button>
          <WorkspaceSplit
            maid={maid}
            task={task}
            outcomeProps={{ onAction: handleAction }}
            activePane={activePane}
            onTogglePane={(pane) => setActivePane(pane)}
            onOpenComplaints={openComplaints}
          />
        </div>
      );
    }
  }

  const rows = tasks.map((task) => {
    const maid = maidById(state, task.housemaidId);
    return (
      <div className="table-row" key={task.id}>
        <span className="person-cell">
          <span className="avatar avatar-sm">{initials(maid?.name ?? task.housemaidId)}</span>
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
        <span style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="primary-button small"
            onClick={() => setSelectedTaskId(task.id)}
          >
            Open Task
          </button>
        </span>
      </div>
    );
  });

  return (
    <div className="page-stack">
      <style>{`
        .publishing-queue-table .table-row { grid-template-columns: 1.6fr .8fr .6fr auto; }
      `}</style>

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

      <Panel>
        <div className="publishing-queue-table">
          {tasks.length === 0 ? (
            <EmptyState
              title={isTrial ? "No maids under trial" : "No maids published"}
              hint={isTrial ? "Trials will appear here." : "Published maids will appear here."}
            />
          ) : (
            <DataTable columns={QUEUE_COLUMNS} rows={rows} />
          )}
        </div>
      </Panel>
    </div>
  );
}
