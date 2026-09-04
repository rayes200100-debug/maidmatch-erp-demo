import { useState } from "react";
import type { Housemaid, Task, DocumentKind } from "../data";
import type { AppState, Action } from "../store";
import type { TaskType } from "../lib/stages";
import { ProfilePanel } from "./ProfilePanel";
import { DocumentsPanel } from "./DocumentsPanel";
import { WorkspaceSplit } from "./WorkspaceSplit";
import type { WorkspacePane } from "./WorkspaceSplit";

const BACK_ROUTE: Record<TaskType, string> = {
  retraction: "PendingRetraction",
  documents: "DocumentsCollection",
  shooting: "PendingShooting",
  editing: "PendingEditing",
  publishing: "AvailablePendingPublishing",
  available: "AvailablePublished",
  trial: "UnderTrial",
};

interface TaskWorkspaceProps {
  task: Task;
  maid: Housemaid;
  state: AppState;
  dispatch: (a: Action) => void;
  onNavigate: (key: string) => void;
}

export function TaskWorkspace({ task, maid, state, dispatch, onNavigate }: TaskWorkspaceProps) {
  const [activePane, setActivePane] = useState<WorkspacePane>("task");

  const openComplaints = (erpLink: string) => window.open(erpLink, "_blank", "noopener,noreferrer");

  const handleAction = (action: Action) => {
    dispatch(action);
    if (action.type === "RETRACT_TO_CC" || action.type === "MOVE_TO_OFFBOARD" || action.type === "RETRACT_TO_MAIDMATCH") {
      onNavigate(BACK_ROUTE[task.type]);
    }
  };

  const media =
    task.type === "editing" && (task.metadata?.stockPhotoUrl || task.metadata?.stockVideoUrl)
      ? { stockPhotoUrl: task.metadata?.stockPhotoUrl, stockVideoUrl: task.metadata?.stockVideoUrl }
      : undefined;

  return (
    <div className="page-stack">
      <button type="button" className="text-button" onClick={() => onNavigate(BACK_ROUTE[task.type])}>
        &larr; Back to list
      </button>

      {task.type === "documents" ? (
        <div className="workspace-split">
          <div className="workspace-profile">
            <ProfilePanel maid={maid} onOpenComplaints={openComplaints} />
          </div>
          <div className="workspace-task">
            <DocumentsPanel
              task={task}
              onUpload={(document: DocumentKind) => dispatch({ type: "UPLOAD_DOCUMENT", housemaidId: maid.id, document, now: Date.now() })}
              onSetExpiry={(expiryDate) => dispatch({ type: "SET_UNPAID_LEAVE_EXPIRY", housemaidId: maid.id, expiryDate })}
            />
          </div>
        </div>
      ) : (
        <WorkspaceSplit
          maid={maid}
          task={task}
          outcomeProps={{ onAction: handleAction, terminationReasons: state.config.terminationReasons }}
          activePane={activePane}
          onTogglePane={(pane) => setActivePane(pane)}
          onOpenComplaints={openComplaints}
          media={media}
        />
      )}
    </div>
  );
}
