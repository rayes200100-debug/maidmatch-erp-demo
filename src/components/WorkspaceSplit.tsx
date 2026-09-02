import type { Housemaid, Task } from "../data";
import { ProfilePanel } from "./ProfilePanel";
import type { StockMedia } from "./ProfilePanel";
import { OutcomePanel } from "./OutcomePanel";
import type { OutcomePanelProps } from "./OutcomePanel";

export type WorkspacePane = "profile" | "task";

export interface WorkspaceSplitProps {
  maid: Housemaid;
  task: Task;
  outcomeProps: Omit<OutcomePanelProps, "task" | "maid">;
  activePane: WorkspacePane;
  onTogglePane: (pane: WorkspacePane) => void;
  onOpenComplaints: (erpLink: string) => void;
  media?: StockMedia;
}

export function WorkspaceSplit({
  maid,
  task,
  outcomeProps,
  activePane,
  onTogglePane,
  onOpenComplaints,
  media,
}: WorkspaceSplitProps) {
  return (
    <div className="workspace-split">
      <div className="mobile-workspace-tabs">
        <button
          type="button"
          className={activePane === "profile" ? "active" : ""}
          onClick={() => onTogglePane("profile")}
        >
          Profile
        </button>
        <button
          type="button"
          className={activePane === "task" ? "active" : ""}
          onClick={() => onTogglePane("task")}
        >
          Task
        </button>
      </div>

      <div className={`workspace-profile ${activePane !== "profile" ? "mobile-hidden" : ""}`.trim()}>
        <ProfilePanel maid={maid} onOpenComplaints={onOpenComplaints} media={media} />
      </div>

      <div className={`workspace-task ${activePane !== "task" ? "mobile-hidden" : ""}`.trim()}>
        <OutcomePanel task={task} maid={maid} {...outcomeProps} />
      </div>
    </div>
  );
}
