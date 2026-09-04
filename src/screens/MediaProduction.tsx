import { Image, Video, RotateCcw } from "lucide-react";
import type { AppState, Action } from "../store";
import { openTasks, maidById, archiveForOutcome, reshootCount } from "../store";
import { activeTimeInQueue } from "../lib/hours";
import { maidTypeLabel } from "../data";
import { DataTable, EmptyState, Panel, StatusPill } from "../components/primitives";

interface MediaProductionProps {
  state: AppState;
  dispatch: (a: Action) => void;
  route: string;
  onNavigate: (key: string) => void;
}

const QUEUE_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "nationality", label: "Nationality" },
  { key: "age", label: "Age" },
  { key: "type", label: "Type" },
  { key: "golden", label: "Golden" },
  { key: "waitingSince", label: "Waiting since" },
  { key: "time", label: "Time waiting" },
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

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function MediaProduction({ state, dispatch, route, onNavigate }: MediaProductionProps) {
  const openTask = (taskId: string) => {
    dispatch({ type: "RECORD_TASK_OPEN", taskId, now: Date.now() });
    onNavigate(`task/${taskId}`);
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
            <span className="avatar avatar-sm">{maid?.photoUrl ? <img src={maid.photoUrl} alt={maid?.name} /> : initials(maid?.name ?? outcome.housemaidId)}</span>
            <span style={{ minWidth: 0 }}>
              <strong>{maid?.name ?? outcome.housemaidId}</strong>
            </span>
          </span>
          <span>
            <strong>{maid?.nationality ?? "—"}</strong>
          </span>
          <span>
            {finalPhoto ? (
              <a className="media-thumb" href={finalPhoto} target="_blank" rel="noreferrer">
                <Image size={15} /> Photo
              </a>
            ) : (
              <small>—</small>
            )}
          </span>
          <span>
            {finalVideo ? (
              <a className="media-thumb" href={finalVideo} target="_blank" rel="noreferrer">
                <Video size={15} /> Video
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
            <h1>Media &amp; Production Done</h1>
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

  const rows = tasks.map((task) => {
    const maid = maidById(state, task.housemaidId);
    const timeWaiting = activeTimeInQueue(task.createdAt, Date.now(), state.config.workingHours, state.config.daysOff);
    const reshoots = reshootCount(state, task.housemaidId);
    return (
      <div className="table-row" key={task.id}>
        <span className="person-cell">
          <span className="avatar avatar-sm">{maid?.photoUrl ? <img src={maid.photoUrl} alt={maid?.name} /> : initials(maid?.name ?? task.housemaidId)}</span>
          <span style={{ minWidth: 0 }}>
            <strong>{maid?.name ?? task.housemaidId}</strong>
            {reshoots > 0 && (
              <small className="mobile-subline">
                <RotateCcw size={11} /> Reshoot · {reshoots}&times;
              </small>
            )}
          </span>
        </span>
        <span>
          <strong>{maid?.nationality ?? "—"}</strong>
        </span>
        <span>
          <strong>{maid ? String(maid.age) : "—"}</strong>
        </span>
        <span>
          <strong>{maid ? maidTypeLabel(maid) : "—"}</strong>
        </span>
        <span>{maid?.isGoldenProfile ? <StatusPill tone="gold">Golden</StatusPill> : "—"}</span>
        <span>
          <strong>{formatDate(task.createdAt)}</strong>
        </span>
        <span>
          <strong>{timeWaiting}</strong>
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
          <span className="eyebrow">Media &amp; Production</span>
          <h1>{isEditing ? "Editors" : "Videographers"}</h1>
          <p>
            {isEditing
              ? "Review the raw photo and video in place, then deliver the final edit or send it back."
              : "Shoot the raw photo and video — both are required before the editor can start."}
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
