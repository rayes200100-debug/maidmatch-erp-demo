import { useState } from "react";
import type { AppState, Action } from "../store";
import { openTasks, maidById, archiveForOutcome } from "../store";
import { sortRetraction } from "../lib/priority";
import type { SortableMaid } from "../lib/priority";
import type { OutcomeType } from "../lib/stages";
import { OUTCOME_LABEL } from "../lib/stages";
import { ROLES } from "../lib/roles";
import { DataTable, EmptyState, Panel, StatusPill } from "../components/primitives";
import { WorkspaceSplit } from "../components/WorkspaceSplit";
import type { WorkspacePane } from "../components/WorkspaceSplit";
import type { Task } from "../data";

interface RetractionProps {
  state: AppState;
  dispatch: (a: Action) => void;
  route: string;
}

interface RetractionRow extends SortableMaid {
  task: Task;
}

const QUEUE_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "nationality", label: "Nationality" },
  { key: "type", label: "Type" },
  { key: "golden", label: "Golden" },
  { key: "actions", label: "" },
];

const ARCHIVE_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "nationality", label: "Nationality" },
  { key: "date", label: "Date" },
  { key: "details", label: "Details" },
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

function roleLabel(id: string): string {
  return ROLES.find((r) => r.id === id)?.label ?? id;
}

export default function Retraction({ state, dispatch, route }: RetractionProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activePane, setActivePane] = useState<WorkspacePane>("task");

  const openComplaints = (erpLink: string) => {
    window.open(erpLink, "_blank", "noopener,noreferrer");
  };

  const handleAction = (action: Action) => {
    dispatch(action);
    if (
      action.type === "RETRACT_TO_CC" ||
      action.type === "MOVE_TO_OFFBOARD" ||
      action.type === "RETRACT_TO_MAIDMATCH"
    ) {
      setSelectedTaskId(null);
    }
  };

  if (route !== "PendingRetraction") {
    const type = route as OutcomeType;
    const outcomes = archiveForOutcome(state, type);

    const rows = outcomes.map((outcome) => {
      const maid = maidById(state, outcome.housemaidId);
      const preferences = outcome.metadata?.preferences as string[] | undefined;
      const details =
        type === "RetractedToMaidMatch" && preferences?.length
          ? preferences.join(" · ")
          : roleLabel(outcome.actorRole);

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
            <strong>{formatDate(outcome.timestamp)}</strong>
          </span>
          <span>
            <small>{details}</small>
          </span>
        </div>
      );
    });

    return (
      <div className="page-stack">
        <style>{`
          .retraction-archive-table .table-row { grid-template-columns: 1.5fr .8fr .9fr 1.4fr; }
        `}</style>

        <header className="page-header">
          <div>
            <span className="eyebrow">Retraction</span>
            <h1>{OUTCOME_LABEL[type]}</h1>
            <p>Read-only record of maids previously routed out of the retraction queue.</p>
          </div>
        </header>

        <Panel>
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

  const tasks = openTasks(state, "retraction");
  const list: RetractionRow[] = tasks.map((task) => {
    const maid = maidById(state, task.housemaidId);
    return {
      task,
      createdAt: task.createdAt,
      nationality: maid?.nationality ?? "",
      isGoldenProfile: maid?.isGoldenProfile ?? false,
    };
  });
  const sorted = sortRetraction(list, state.config.priorityAlgorithm) as RetractionRow[];

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

  const rows = sorted.map((row, index) => {
    const maid = maidById(state, row.task.housemaidId);
    const locked = index > 0;
    return (
      <div className="table-row" key={row.task.id}>
        <span className="person-cell">
          <span className="avatar avatar-sm">{initials(maid?.name ?? row.task.housemaidId)}</span>
          <span style={{ minWidth: 0 }}>
            <strong>{maid?.name ?? row.task.housemaidId}</strong>
          </span>
        </span>
        <span>
          <strong>{maid?.nationality ?? "—"}</strong>
        </span>
        <span>
          <strong>{maid?.housemaidType ?? "—"}</strong>
        </span>
        <span>
          {maid?.isGoldenProfile ? <StatusPill tone="gold">Golden</StatusPill> : "—"}
        </span>
        <span style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          {locked ? (
            <>
              <span aria-hidden style={{ fontSize: 14 }}>&#128274;</span>
              <button type="button" className="primary-button small" disabled>
                Open Task
              </button>
              <StatusPill tone="info">Locked — finish first</StatusPill>
            </>
          ) : (
            <button
              type="button"
              className="primary-button small"
              onClick={() => setSelectedTaskId(row.task.id)}
            >
              Open Task
            </button>
          )}
        </span>
      </div>
    );
  });

  return (
    <div className="page-stack">
      <style>{`
        .retraction-queue-table .table-row { grid-template-columns: 1.6fr .8fr .7fr .7fr auto; }
        .retraction-queue-table .primary-button:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; }
      `}</style>

      <header className="page-header">
        <div>
          <span className="eyebrow">Retraction</span>
          <h1>Pending Retraction</h1>
          <p>Process one maid at a time — the queue is locked to the top-priority profile.</p>
        </div>
        <div className="page-actions">
          <StatusPill tone="neutral">
            {state.config.priorityAlgorithm}
          </StatusPill>
        </div>
      </header>

      <Panel>
        <div className="retraction-queue-table">
          {sorted.length === 0 ? (
            <EmptyState title="No pending retractions" hint="Maids sent from Reception will appear here." />
          ) : (
            <DataTable columns={QUEUE_COLUMNS} rows={rows} />
          )}
        </div>
      </Panel>
    </div>
  );
}
