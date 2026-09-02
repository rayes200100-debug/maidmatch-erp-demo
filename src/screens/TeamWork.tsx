import { useEffect, useState } from "react";
import type { AppState, Action } from "../store";
import { myTeamWork, maidById } from "../store";
import { TASK_TYPE_LABEL } from "../lib/stages";
import { ROLES } from "../lib/roles";
import { DataTable, EmptyState, Panel, StatusPill } from "../components/primitives";
import { WorkspaceSplit } from "../components/WorkspaceSplit";
import type { WorkspacePane } from "../components/WorkspaceSplit";

interface TeamWorkProps {
  state: AppState;
  dispatch: (a: Action) => void;
  route: string;
}

const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.id, r.label]));

const CLOSING_ACTIONS = new Set([
  "RETRACT_TO_CC",
  "MOVE_TO_OFFBOARD",
  "RETRACT_TO_MAIDMATCH",
  "DONE_SHOOTING",
  "EDITING_DONE",
  "SEND_BACK_TO_SHOOTING",
  "UNDER_TRIAL",
  "HIRED",
  "SEND_BACK_TO_PUBLISHED",
  "SEND_BACK_TO_PENDING_PUBLISHING",
  "CANCEL",
]);

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function taskAge(now: number, createdAt: number): string {
  const hours = Math.max(0, now - createdAt) / 3_600_000;
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}

function roleLabel(assignedRole: string): string {
  if (assignedRole === "None") return "Unassigned";
  return ROLE_LABEL[assignedRole] ?? assignedRole;
}

export default function TeamWork({ state, dispatch, route }: TeamWorkProps) {
  const tasks = myTeamWork(state);
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
    if (CLOSING_ACTIONS.has(action.type)) {
      setSelectedTaskId(null);
    }
  };

  const columns = [
    { key: "maid", label: "Maid" },
    { key: "task", label: "Task" },
    { key: "role", label: "Assigned" },
    { key: "age", label: "Age" },
    { key: "actions", label: "" },
  ];

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
            <small>{maid ? `${maid.nationality} · ${maid.age}y` : "Unknown"}</small>
          </span>
        </span>
        <span>
          <strong>{TASK_TYPE_LABEL[task.type]}</strong>
        </span>
        <span>
          <strong>{roleLabel(task.assignedRole)}</strong>
        </span>
        <span>
          <StatusPill>{taskAge(Date.now(), task.createdAt)}</StatusPill>
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
      <header className="page-header">
        <div>
          <span className="eyebrow">Team Queue</span>
          <h1>My Team's Work</h1>
          <p>Open tasks assigned to your role, oldest first.</p>
        </div>
        <div className="page-actions">
          {state.onBreak && <StatusPill tone="info">On break</StatusPill>}
          <button
            type="button"
            className="secondary-button"
            onClick={() => dispatch({ type: "TOGGLE_BREAK" })}
          >
            {state.onBreak ? "Back from break" : "On Break"}
          </button>
        </div>
      </header>

      {tasks.length === 0 ? (
        <Panel>
          <EmptyState
            title="No open tasks"
            hint="Tasks assigned to your role will show up here."
          />
        </Panel>
      ) : (
        <Panel className="flush">
          <DataTable columns={columns} rows={rows} />
        </Panel>
      )}
    </div>
  );
}
