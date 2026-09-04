import { useEffect, useState } from "react";
import type { AppState, Action } from "../store";
import { myTeamWork, maidById } from "../store";
import { TASK_TYPE_LABEL } from "../lib/stages";
import type { TaskType } from "../lib/stages";
import { ROLES } from "../lib/roles";
import { DataTable, EmptyState, Panel, StatusPill } from "../components/primitives";

interface TeamWorkProps {
  state: AppState;
  dispatch: (a: Action) => void;
  route: string;
  onNavigate: (key: string) => void;
}

const ROLE_LABEL: Record<string, string> = Object.fromEntries(ROLES.map((r) => [r.id, r.label]));

const TASK_TYPES: TaskType[] = ["retraction", "documents", "shooting", "editing", "publishing", "available", "trial"];

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

export default function TeamWork({ state, dispatch, route, onNavigate }: TeamWorkProps) {
  const tasks = myTeamWork(state);
  const [typeFilter, setTypeFilter] = useState<TaskType | "all">("all");

  useEffect(() => {
    setTypeFilter("all");
  }, [route]);

  const columns = [
    { key: "maid", label: "Maid" },
    { key: "task", label: "Task" },
    { key: "role", label: "Assigned" },
    { key: "age", label: "Age" },
    { key: "actions", label: "" },
  ];

  const rows = tasks
    .filter((t) => typeFilter === "all" || t.type === typeFilter)
    .map((task) => {
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
            onClick={() => {
              dispatch({ type: "RECORD_TASK_OPEN", taskId: task.id, now: Date.now() });
              onNavigate(`task/${task.id}`);
            }}
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
          <p>Open tasks assigned to your role.</p>
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

      {tasks.length > 0 && (
        <div className="task-type-tabs" role="tablist" aria-label="Filter by task type">
          <button type="button" className={typeFilter === "all" ? "active" : ""} onClick={() => setTypeFilter("all")}>
            All <span>{tasks.length}</span>
          </button>
          {TASK_TYPES.map((tt) => {
            const count = tasks.filter((t) => t.type === tt).length;
            if (count === 0) return null;
            return (
              <button key={tt} type="button" className={typeFilter === tt ? "active" : ""} onClick={() => setTypeFilter(tt)}>
                {TASK_TYPE_LABEL[tt]} <span>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {rows.length === 0 ? (
        <Panel>
          <EmptyState
            title="No open tasks"
            hint="Tasks assigned to your role will show up here."
          />
        </Panel>
      ) : (
        <Panel className="flush">
          <div className="teamwork-table">
            <DataTable columns={columns} rows={rows} />
          </div>
        </Panel>
      )}
    </div>
  );
}
