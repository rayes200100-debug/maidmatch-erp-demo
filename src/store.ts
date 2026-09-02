import type { Housemaid, Outcome, SystemConfig, Task, User } from "./data";
import { defaultConfig, seedHousemaids, seedUsers } from "./data";
import type { RoleId } from "./lib/roles";
import type { OutcomeType, Platform, Stage, TaskType } from "./lib/stages";
import { STAGE_TO_TASK, queueTaskType, isTerminal } from "./lib/stages";
import { avgActiveHours } from "./lib/hours";

export interface AppState {
  housemaids: Housemaid[];
  tasks: Task[];
  outcomes: Outcome[];
  users: User[];
  currentRole: RoleId;
  onBreak: boolean;
  config: SystemConfig;
  now: number;
  /** When the seed state was built. Tasks created at or before this are demo fixtures. */
  seededAt: number;
}

export type Action =
  | { type: "SEND_TO_RETRACTION"; housemaidId: string; actor: RoleId; now: number }
  | { type: "RETRACT_TO_CC"; housemaidId: string; actor: RoleId; now: number }
  | { type: "MOVE_TO_OFFBOARD"; housemaidId: string; actor: RoleId; now: number }
  | { type: "RETRACT_TO_MAIDMATCH"; housemaidId: string; actor: RoleId; now: number; preferences: string[] }
  | { type: "DONE_SHOOTING"; housemaidId: string; actor: RoleId; now: number; stockPhotoUrl?: string; stockVideoUrl?: string }
  | { type: "EDITING_DONE"; housemaidId: string; actor: RoleId; now: number; finalPhoto: string; finalVideo?: string }
  | { type: "SEND_BACK_TO_SHOOTING"; housemaidId: string; actor: RoleId; now: number; comment?: string }
  | { type: "FLAG_PLATFORM"; housemaidId: string; platform: Platform; now: number }
  | { type: "UNFLAG_PLATFORM"; housemaidId: string; platform: Platform; now: number }
  | { type: "UNDER_TRIAL"; housemaidId: string; actor: RoleId; now: number; employerName?: string; maidsCcProfileLink?: string }
  | { type: "HIRED"; housemaidId: string; actor: RoleId; now: number }
  | { type: "SEND_BACK_TO_PUBLISHED"; housemaidId: string; actor: RoleId; now: number }
  | { type: "SEND_BACK_TO_PENDING_PUBLISHING"; housemaidId: string; actor: RoleId; now: number }
  | { type: "CANCEL"; housemaidId: string; actor: RoleId; now: number; reason: string }
  | { type: "SET_ROLE"; role: RoleId }
  | { type: "TOGGLE_BREAK" }
  | { type: "SET_CONFIG"; patch: Partial<SystemConfig> }
  | { type: "ADD_USER"; user: { name: string; email: string; roles: RoleId[] } }
  | { type: "RESET"; state: AppState };

let seq = 0;
const nextId = (p: string) => `${p}-${++seq}`;

function defaultRole(state: AppState, taskType: TaskType): RoleId | "None" {
  return state.config.defaultRolePerTask[taskType] ?? "None";
}

function openTaskFor(state: AppState, housemaidId: string, type: TaskType): Task | undefined {
  return state.tasks.find((t) => t.housemaidId === housemaidId && t.type === type && t.status === "open");
}

function closeTask(state: AppState, housemaidId: string, type: TaskType, now: number): Task[] {
  return state.tasks.map((t) =>
    t.housemaidId === housemaidId && t.type === type && t.status === "open"
      ? { ...t, status: "closed", closedAt: now }
      : t
  );
}

function setStage(state: AppState, housemaidId: string, stage: Stage): Housemaid[] {
  return state.housemaids.map((h) => (h.id === housemaidId ? { ...h, currentStage: stage } : h));
}

function newTask(state: AppState, housemaidId: string, type: TaskType, now: number, metadata?: Task["metadata"]): Task {
  return { id: nextId("task"), housemaidId, type, status: "open", assignedRole: defaultRole(state, type), createdAt: now, metadata };
}

function newOutcome(_state: AppState, housemaidId: string, type: OutcomeType, actor: RoleId, now: number, note?: string, metadata?: Outcome["metadata"]): Outcome {
  return { id: nextId("outcome"), housemaidId, type, timestamp: now, actorRole: actor, note, metadata };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SEND_TO_RETRACTION": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "Reception") return state;
      return {
        ...state,
        housemaids: setStage(state, h.id, "PendingRetraction"),
        tasks: [...state.tasks, newTask(state, h.id, "retraction", action.now)],
      };
    }
    case "RETRACT_TO_CC": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "PendingRetraction") return state;
      return {
        ...state,
        housemaids: setStage(state, h.id, "RetractedToCC"),
        tasks: closeTask(state, h.id, "retraction", action.now),
        outcomes: [...state.outcomes, newOutcome(state, h.id, "RetractedToCC", action.actor, action.now)],
      };
    }
    case "MOVE_TO_OFFBOARD": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "PendingRetraction") return state;
      return {
        ...state,
        housemaids: setStage(state, h.id, "MovedToOffboard"),
        tasks: closeTask(state, h.id, "retraction", action.now),
        outcomes: [...state.outcomes, newOutcome(state, h.id, "MovedToOffboard", action.actor, action.now)],
      };
    }
    case "RETRACT_TO_MAIDMATCH": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "PendingRetraction") return state;
      return {
        ...state,
        housemaids: setStage(state, h.id, "PendingShooting").map((x) =>
          x.id === h.id ? { ...x, preferences: action.preferences } : x
        ),
        tasks: [...closeTask(state, h.id, "retraction", action.now), newTask(state, h.id, "shooting", action.now, { preferences: action.preferences })],
        outcomes: [...state.outcomes, newOutcome(state, h.id, "RetractedToMaidMatch", action.actor, action.now, undefined, { preferences: action.preferences })],
      };
    }
    case "DONE_SHOOTING": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "PendingShooting") return state;
      const prev = openTaskFor(state, h.id, "shooting");
      return {
        ...state,
        housemaids: setStage(state, h.id, "PendingEditing"),
        tasks: [...closeTask(state, h.id, "shooting", action.now), newTask(state, h.id, "editing", action.now, { stockPhotoUrl: action.stockPhotoUrl, stockVideoUrl: action.stockVideoUrl, ...(prev?.metadata) })],
      };
    }
    case "EDITING_DONE": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "PendingEditing") return state;
      const prev = openTaskFor(state, h.id, "editing");
      return {
        ...state,
        housemaids: setStage(state, h.id, "AvailablePendingPublishing"),
        tasks: [...closeTask(state, h.id, "editing", action.now), newTask(state, h.id, "publishing", action.now, { publishState: { maidmatch: false, peekaboo: false, yaya: false }, ...(prev?.metadata), finalPhoto: action.finalPhoto, finalVideo: action.finalVideo })],
        outcomes: [...state.outcomes, newOutcome(state, h.id, "ProductionDone", action.actor, action.now, undefined, { finalPhoto: action.finalPhoto, finalVideo: action.finalVideo })],
      };
    }
    case "SEND_BACK_TO_SHOOTING": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "PendingEditing") return state;
      return {
        ...state,
        housemaids: setStage(state, h.id, "PendingShooting"),
        tasks: [...closeTask(state, h.id, "editing", action.now), newTask(state, h.id, "shooting", action.now, { comment: action.comment })],
      };
    }
    case "FLAG_PLATFORM": {
      const task = openTaskFor(state, action.housemaidId, "publishing");
      if (!task) return state;
      const publishState: Record<Platform, boolean> = { maidmatch: false, peekaboo: false, yaya: false, ...(task.metadata?.publishState), [action.platform]: true };
      const allGreen = Object.values(publishState).every(Boolean);
      const tasks: Task[] = state.tasks.map((t) => t.id === task.id ? { ...t, metadata: { ...t.metadata, publishState } } : t);
      if (!allGreen) return { ...state, tasks };
      return {
        ...state,
        housemaids: setStage(state, action.housemaidId, "AvailablePublished"),
        tasks: [...tasks.map((t): Task => (t.id === task.id ? { ...t, status: "closed", closedAt: action.now } : t)), newTask(state, action.housemaidId, "available", action.now)],
      };
    }
    case "UNFLAG_PLATFORM": {
      const task = openTaskFor(state, action.housemaidId, "publishing");
      if (!task) return state;
      const publishState: Record<Platform, boolean> = { maidmatch: false, peekaboo: false, yaya: false, ...(task.metadata?.publishState), [action.platform]: false };
      return { ...state, tasks: state.tasks.map((t) => t.id === task.id ? { ...t, metadata: { ...t.metadata, publishState } } : t) };
    }
    case "UNDER_TRIAL": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "AvailablePublished") return state;
      return {
        ...state,
        housemaids: setStage(state, h.id, "UnderTrial").map((x) =>
          x.id === h.id ? { ...x, employerName: action.employerName, maidsCcProfileLink: action.maidsCcProfileLink } : x
        ),
        tasks: [...closeTask(state, h.id, "available", action.now), newTask(state, h.id, "trial", action.now, { employerName: action.employerName, maidsCcProfileLink: action.maidsCcProfileLink })],
      };
    }
    case "HIRED": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "UnderTrial") return state;
      return {
        ...state,
        housemaids: setStage(state, h.id, "Hired"),
        tasks: closeTask(state, h.id, "trial", action.now),
        outcomes: [...state.outcomes, newOutcome(state, h.id, "Hired", action.actor, action.now)],
      };
    }
    case "SEND_BACK_TO_PUBLISHED": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "UnderTrial") return state;
      return { ...state, housemaids: setStage(state, h.id, "AvailablePublished"), tasks: [...closeTask(state, h.id, "trial", action.now), newTask(state, h.id, "available", action.now)] };
    }
    case "SEND_BACK_TO_PENDING_PUBLISHING": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "UnderTrial") return state;
      return { ...state, housemaids: setStage(state, h.id, "AvailablePendingPublishing"), tasks: [...closeTask(state, h.id, "trial", action.now), newTask(state, h.id, "publishing", action.now, { publishState: { maidmatch: false, peekaboo: false, yaya: false } })] };
    }
    case "CANCEL": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "UnderTrial") return state;
      if (!action.reason.trim()) throw new Error("Cancellation requires a reason");
      return {
        ...state,
        housemaids: setStage(state, h.id, "Cancelled"),
        tasks: closeTask(state, h.id, "trial", action.now),
        outcomes: [...state.outcomes, newOutcome(state, h.id, "Cancelled", action.actor, action.now, action.reason)],
      };
    }
    case "SET_ROLE": return { ...state, currentRole: action.role };
    case "TOGGLE_BREAK": return { ...state, onBreak: !state.onBreak };
    case "SET_CONFIG": return { ...state, config: { ...state.config, ...action.patch } };
    case "ADD_USER": return { ...state, users: [...state.users, { id: nextId("user"), ...action.user }] };
    case "RESET": return action.state;
    default: return state;
  }
}

export function openTasks(state: AppState, type?: TaskType): Task[] {
  return state.tasks.filter((t) => t.status === "open" && (!type || t.type === type));
}

export function maidById(state: AppState, id: string): Housemaid | undefined {
  return state.housemaids.find((h) => h.id === id);
}

export function myTeamWork(state: AppState): Task[] {
  const open = openTasks(state);
  if (state.currentRole === "sysadmin" || state.currentRole === "superadmin") return open;
  return open.filter((t) => t.assignedRole === state.currentRole);
}

export function archiveForOutcome(state: AppState, type: OutcomeType): Outcome[] {
  return state.outcomes.filter((o) => o.type === type).sort((a, b) => b.timestamp - a.timestamp);
}

export function avgTimeByStage(state: AppState): Partial<Record<Stage, number>> {
  const wh = state.config.workingHours;
  const daysOff = state.config.daysOff;
  const result: Partial<Record<Stage, number>> = {};
  const byType: Record<TaskType, [number, number][]> = { retraction: [], shooting: [], editing: [], publishing: [], available: [], trial: [] };
  for (const t of state.tasks) {
    if (t.closedAt) byType[t.type].push([t.createdAt, t.closedAt]);
  }
  (Object.entries(STAGE_TO_TASK) as [Stage, TaskType][]).forEach(([stage, tt]) => {
    result[stage] = avgActiveHours(byType[tt], wh, daysOff);
  });
  return result;
}

/** Demo fixtures: Christine is 2-of-3 published, Deepa 1-of-3, so the queue shows partial progress. */
const SEED_PUBLISH_STATE: Record<string, Record<Platform, boolean>> = {
  h014: { maidmatch: true, peekaboo: true, yaya: false },
  h015: { maidmatch: true, peekaboo: false, yaya: false },
};

export function makeSeedState(): AppState {
  const now = Date.now();
  const tasks: Task[] = [];
  const outcomes: Outcome[] = [];

  seedHousemaids.forEach((h, i) => {
    const taskType = queueTaskType(h.currentStage);
    if (taskType) {
      tasks.push({
        id: nextId("task"),
        housemaidId: h.id,
        type: taskType,
        status: "open",
        assignedRole: defaultConfig.defaultRolePerTask[taskType],
        createdAt: now - i * 1000,
        metadata:
          taskType === "publishing"
            ? { publishState: SEED_PUBLISH_STATE[h.id] ?? { maidmatch: false, peekaboo: false, yaya: false } }
            : undefined,
      });
    } else if (isTerminal(h.currentStage)) {
      outcomes.push({
        id: nextId("outcome"),
        housemaidId: h.id,
        type: h.currentStage as unknown as OutcomeType,
        timestamp: now,
        actorRole: "sysadmin",
      });
    }

    const retractedStages = ["PendingShooting", "PendingEditing", "AvailablePendingPublishing", "AvailablePublished", "UnderTrial"];
    const productionDoneStages = ["AvailablePendingPublishing", "AvailablePublished", "UnderTrial"];
    if (retractedStages.includes(h.currentStage)) {
      outcomes.push({
        id: nextId("outcome"),
        housemaidId: h.id,
        type: "RetractedToMaidMatch",
        timestamp: now - i * 1000 - 1000,
        actorRole: "sysadmin",
      });
    }
    if (productionDoneStages.includes(h.currentStage)) {
      outcomes.push({
        id: nextId("outcome"),
        housemaidId: h.id,
        type: "ProductionDone",
        timestamp: now - i * 1000,
        actorRole: "sysadmin",
      });
    }
  });

  return {
    housemaids: seedHousemaids,
    users: seedUsers,
    tasks,
    outcomes,
    currentRole: "sysadmin",
    onBreak: false,
    config: defaultConfig,
    now,
    seededAt: now,
  };
}
