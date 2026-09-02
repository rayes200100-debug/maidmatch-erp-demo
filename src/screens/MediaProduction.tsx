import { useEffect, useState } from "react";
import type { AppState, Action } from "../store";
import { openTasks, maidById, archiveForOutcome } from "../store";
import { DataTable, EmptyState, Panel } from "../components/primitives";
import { WorkspaceSplit } from "../components/WorkspaceSplit";
import type { WorkspacePane } from "../components/WorkspaceSplit";

interface MediaProductionProps {
  state: AppState;
  dispatch: (a: Action) => void;
  route: string;
}

const QUEUE_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "nationality", label: "Nationality" },
  { key: "age", label: "Age" },
  { key: "actions", label: "" },
];

const ARCHIVE_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "nationality", label: "Nationality" },
  { key: "photo", label: "Final Photo" },
  { key: "video", label: "Final Video" },
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

export default function MediaProduction({ state, dispatch, route }: MediaProductionProps) {
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
      action.type === "DONE_SHOOTING" ||
      action.type === "EDITING_DONE" ||
      action.type === "SEND_BACK_TO_SHOOTING"
    ) {
      setSelectedTaskId(null);
    }
  };

  if (route === "ProductionDone") {
    const outcomes = archiveForOutcome(state, "ProductionDone");

    const rows = outcomes.map((outcome) => {
      const maid = maidById(state, outcome.housemaidId);
      const finalPhoto = outcome.metadata?.finalPhoto as string | undefined;
      const finalVideo = outcome.metadata?.finalVideo as string | undefined;

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
            {finalPhoto ? (
              <a className="text-button" href={finalPhoto} target="_blank" rel="noreferrer">
                View photo
              </a>
            ) : (
              <small>—</small>
            )}
          </span>
          <span>
            {finalVideo ? (
              <a className="text-button" href={finalVideo} target="_blank" rel="noreferrer">
                View video
              </a>
            ) : (
              <small>—</small>
            )}
          </span>
        </div>
      );
    });

    return (
      <div className="page-stack">
        <header className="page-header">
          <div>
            <span className="eyebrow">Media &amp; Production</span>
            <h1>Production Done</h1>
            <p>Completed productions with their final photo and video links.</p>
          </div>
        </header>

        <Panel className="flush">
          <div className="media-archive-table">
            {outcomes.length === 0 ? (
              <EmptyState title="No completed productions" hint="Finished shoots and edits will appear here." />
            ) : (
              <DataTable columns={ARCHIVE_COLUMNS} rows={rows} />
            )}
          </div>
        </Panel>
      </div>
    );
  }

  const isEditing = route === "PendingEditing";
  const type = isEditing ? "editing" : "shooting";
  const tasks = openTasks(state, type);

  if (selectedTaskId) {
    const task = state.tasks.find((t) => t.id === selectedTaskId);
    const maid = task ? maidById(state, task.housemaidId) : undefined;

    if (task && maid) {
      const media = task.metadata?.stockPhotoUrl || task.metadata?.stockVideoUrl
        ? {
            stockPhotoUrl: task.metadata?.stockPhotoUrl,
            stockVideoUrl: task.metadata?.stockVideoUrl,
          }
        : undefined;

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
            media={media}
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
          <strong>{maid ? String(maid.age) : "—"}</strong>
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
          <span className="eyebrow">Media &amp; Production</span>
          <h1>{isEditing ? "Pending Editing" : "Pending Shooting"}</h1>
          <p>
            {isEditing
              ? "Select any task to review stock media and deliver the final edit."
              : "Select any task to run the shoot and capture stock media."}
          </p>
        </div>
      </header>

      <Panel className="flush">
        <div className="media-queue-table">
          {tasks.length === 0 ? (
            <EmptyState
              title={isEditing ? "No pending edits" : "No pending shoots"}
              hint="Tasks will appear here as maids enter this stage."
            />
          ) : (
            <DataTable columns={QUEUE_COLUMNS} rows={rows} />
          )}
        </div>
      </Panel>
    </div>
  );
}
