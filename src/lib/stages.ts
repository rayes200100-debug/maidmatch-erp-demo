export type Stage =
  | "Reception"
  | "PendingRetraction" | "DocumentsCollection" | "PendingShooting" | "PendingEditing"
  | "AvailablePendingPublishing" | "AvailablePublished" | "UnderTrial"
  | "RetractedToCC" | "MovedToOffboard" | "Hired" | "Cancelled";

export type TaskType = "retraction" | "documents" | "shooting" | "editing" | "publishing" | "available" | "trial";
export type OutcomeType = "RetractedToCC" | "MovedToOffboard" | "RetractedToMaidMatch" | "ProductionDone" | "SentBackToShooting" | "ProfileEdited" | "Hired" | "Cancelled";
export type Platform = "maidmatch" | "peekaboo" | "yaya";

export const PLATFORMS: Platform[] = ["maidmatch", "peekaboo", "yaya"];

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  retraction: "Pending Retraction",
  documents: "Pending Documents Collection",
  shooting: "Videographers",
  editing: "Editors",
  publishing: "Available Pending Publishing",
  available: "Available & Published",
  trial: "Under Trial",
};

export const OUTCOME_LABEL: Record<OutcomeType, string> = {
  RetractedToCC: "Retracted to CC",
  MovedToOffboard: "Moved to Offboard",
  RetractedToMaidMatch: "Retracted to MaidMatch",
  ProductionDone: "Production Done",
  SentBackToShooting: "Sent back to shooting",
  ProfileEdited: "Profile edited",
  Hired: "Hired",
  Cancelled: "Cancelled",
};

const TERMINAL: Stage[] = ["RetractedToCC", "MovedToOffboard", "Hired", "Cancelled"];

export function isTerminal(stage: Stage): boolean {
  return TERMINAL.includes(stage);
}

export const STAGE_TO_TASK: Partial<Record<Stage, TaskType>> = {
  PendingRetraction: "retraction",
  DocumentsCollection: "documents",
  PendingShooting: "shooting",
  PendingEditing: "editing",
  AvailablePendingPublishing: "publishing",
  AvailablePublished: "available",
  UnderTrial: "trial",
};

export function queueTaskType(stage: Stage): TaskType | null {
  return STAGE_TO_TASK[stage] ?? null;
}

/** The screen/queue name a stage maps to (used for the "current status" readout). */
export function stageLabel(stage: Stage): string {
  const tt = STAGE_TO_TASK[stage];
  if (tt) return TASK_TYPE_LABEL[tt];
  if (stage === "Reception") return "Reception";
  return OUTCOME_LABEL[stage as OutcomeType];
}

export interface NavNode {
  key: string;
  label: string;
  kind: "link" | "group";
  children?: { key: string; label: string; kind: "queue" | "archive" }[];
}

export const NAV_TREE: NavNode[] = [
  { key: "dashboard", label: "Dashboard", kind: "link" },
  { key: "teamwork", label: "My Team's Work", kind: "link" },
  { key: "reception", label: "Reception", kind: "link" },
  { key: "directory", label: "Directory", kind: "link" },
  { key: "retraction", label: "Retraction", kind: "group", children: [
    { key: "PendingRetraction", label: "Pending Retraction", kind: "queue" },
    { key: "MovedToOffboard", label: "Moved to Offboard", kind: "archive" },
    { key: "RetractedToCC", label: "Retracted to CC", kind: "archive" },
    { key: "RetractedToMaidMatch", label: "Retracted to MaidMatch", kind: "archive" },
  ]},
  { key: "documents", label: "Document Collection", kind: "group", children: [
    { key: "DocumentsCollection", label: "Pending Documents Collection", kind: "queue" },
  ]},
  { key: "media", label: "Media & Production", kind: "group", children: [
    { key: "PendingShooting", label: "Videographers", kind: "queue" },
    { key: "PendingEditing", label: "Editors", kind: "queue" },
    { key: "ProductionDone", label: "Media & Production Done", kind: "archive" },
  ]},
  { key: "publishing", label: "Publishing", kind: "group", children: [
    { key: "AvailablePendingPublishing", label: "Available Pending Publishing", kind: "queue" },
    { key: "AvailablePublished", label: "Available & Published", kind: "queue" },
    { key: "UnderTrial", label: "Under Trial", kind: "queue" },
    { key: "Hired", label: "Hired", kind: "archive" },
    { key: "Cancelled", label: "Cancelled", kind: "archive" },
  ]},
  { key: "users", label: "Users & permissions", kind: "link" },
  { key: "config", label: "System Configuration", kind: "link" },
];
