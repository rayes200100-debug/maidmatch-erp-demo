import type { CcLiveInDuePayload, CcLiveInEntry, CcLiveInState, DocumentKind, DocumentsState, Housemaid, MaidMatchProfile, Outcome, PublishState, SystemConfig, Task, User } from "./data";
import { defaultConfig, seedHousemaids, seedUsers, isCcLiveIn } from "./data";
import type { RoleId } from "./lib/roles";
import type { OutcomeType, Platform, Stage, TaskType } from "./lib/stages";
import { PLATFORMS, STAGE_TO_TASK, queueTaskType, isTerminal, stageLabel } from "./lib/stages";
import { avgActiveHours } from "./lib/hours";
import { sortRetraction, type SortableMaid } from "./lib/priority";
import { fetchCcLiveInDueToday } from "./lib/ccLiveIn";
import { unpaidLeaveDueDate } from "./lib/unpaidLeave";
import { checkDocumentsInErp } from "./lib/documentsApi";
import { attemptPost, initialPublishState } from "./lib/publishApi";
import { computeGolden } from "./lib/golden";

export interface AdherenceEvent {
  id: string;
  role: RoleId;
  housemaidId: string;
  openedPosition: number;
  timestamp: number;
}

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
  ccLiveIn: CcLiveInState;
  adherence: AdherenceEvent[];
}

export type Action =
  | { type: "SEND_TO_RETRACTION"; housemaidId: string; actor: RoleId; now: number }
  | { type: "RECORD_RETRACTION_OPEN"; housemaidId: string; role: RoleId; openedPosition: number; now: number }
  | { type: "RECORD_TASK_OPEN"; taskId: string; now: number }
  | { type: "MOVE_TO_OFFBOARD"; housemaidId: string; actor: RoleId; now: number; reason: string; handNote?: string }
  | { type: "RETRACT_TO_CC"; housemaidId: string; actor: RoleId; now: number; grantedAmount?: number }
  | { type: "RETRACT_TO_MAIDMATCH"; housemaidId: string; actor: RoleId; now: number; profile: MaidMatchProfile }
  | { type: "CHECK_DOCUMENTS"; now: number; error?: string }
  | { type: "UPLOAD_DOCUMENT"; housemaidId: string; document: DocumentKind; now: number; error?: string }
  | { type: "SET_UNPAID_LEAVE_EXPIRY"; housemaidId: string; expiryDate: string }
  | { type: "EDIT_PROFILE"; housemaidId: string; patch: Partial<MaidMatchProfile>; actor: RoleId; now: number }
  | { type: "DONE_SHOOTING"; housemaidId: string; actor: RoleId; now: number; stockPhotoUrl?: string; stockVideoUrl?: string; editorNote?: string }
  | { type: "EDITING_DONE"; housemaidId: string; actor: RoleId; now: number; finalPhoto: string; finalVideo?: string }
  | { type: "SEND_BACK_TO_SHOOTING"; housemaidId: string; actor: RoleId; now: number; comment?: string }
  | { type: "RUN_PUBLISH_JOB"; now: number }
  | { type: "MANUAL_MARK_POSTED"; housemaidId: string; platform: Platform; now: number }
  | { type: "UNDER_TRIAL"; housemaidId: string; actor: RoleId; now: number; employerName?: string; maidsCcProfileLink?: string }
  | { type: "HIRED"; housemaidId: string; actor: RoleId; now: number }
  | { type: "SEND_BACK_TO_PUBLISHED"; housemaidId: string; actor: RoleId; now: number }
  | { type: "SEND_BACK_TO_PENDING_PUBLISHING"; housemaidId: string; actor: RoleId; now: number }
  | { type: "CANCEL"; housemaidId: string; actor: RoleId; now: number; reason: string }
  | { type: "SET_ROLE"; role: RoleId }
  | { type: "TOGGLE_BREAK" }
  | { type: "SET_CONFIG"; patch: Partial<SystemConfig> }
  | { type: "ADD_USER"; user: { name: string; email: string; roles: RoleId[] } }
  | { type: "DEACTIVATE_USER"; userId: string }
  | { type: "REFRESH_CC_LIVE_IN"; now: number; entries?: CcLiveInDuePayload[]; error?: string }
  | { type: "COLLECT_CC_LIVE_IN"; maidsCcId: string; actor: RoleId; now: number }
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

function newTask(state: AppState, housemaidId: string, type: TaskType, now: number, metadata?: Task["metadata"], sentByRole?: RoleId): Task {
  return { id: nextId("task"), housemaidId, type, status: "open", assignedRole: defaultRole(state, type), sentByRole, createdAt: now, metadata };
}

function newOutcome(_state: AppState, housemaidId: string, type: OutcomeType, actor: RoleId, now: number, note?: string, metadata?: Outcome["metadata"]): Outcome {
  return { id: nextId("outcome"), housemaidId, type, timestamp: now, actorRole: actor, note, metadata };
}

/** Mock of the maids.cc "create complaint" API (WR-2 — real endpoint does not exist yet). */
function terminationComplaintDescription(reason: string, handNote?: string): string {
  const base = `Maid for termination, reason: ${reason}`;
  return handNote ? `${base}\n${handNote}` : base;
}

function payrollComplaintDescription(amount: number): string {
  return `Retract to CC — granted salary/bonus: AED ${amount}`;
}

/** Closes the documents task and hands to media once both docs + expiry are in. */
function completeDocumentsIfReady(state: AppState, housemaidId: string, now: number): AppState {
  const task = openTaskFor(state, housemaidId, "documents");
  if (!task) return state;
  const docs = task.metadata?.documents;
  const ready = !!docs?.unpaidLeave?.collected && !!docs?.mmrConsent?.collected && !!docs?.unpaidLeave?.expiryDate;
  if (!ready) return state;
  return {
    ...state,
    housemaids: setStage(state, housemaidId, "PendingShooting"),
    tasks: [...closeTask(state, housemaidId, "documents", now), newTask(state, housemaidId, "shooting", now)],
  };
}

/** Once all three platforms are green, log back to maids.cc and move to Available & Published. */
function completePublishingIfReady(state: AppState, now: number): AppState {
  let next = state;
  for (const task of state.tasks) {
    if (task.type !== "publishing" || task.status !== "open") continue;
    const pub = task.metadata?.publish;
    const allPosted = !!pub && !pub.heldReason && PLATFORMS.every((p) => pub.platforms[p]?.status === "posted");
    if (!allPosted) continue;
    const current = next.tasks.find((t) => t.id === task.id);
    if (!current || current.status !== "open") continue;
    const tasks = next.tasks.map((t) =>
      t.id === task.id ? { ...t, metadata: { ...t.metadata, publish: { ...pub, erpNotifiedAt: now } } } : t
    );
    next = {
      ...next,
      housemaids: setStage(next, task.housemaidId, "AvailablePublished"),
      tasks: [...closeTask({ ...next, tasks }, task.housemaidId, "publishing", now), newTask(next, task.housemaidId, "available", now)],
    };
  }
  return next;
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SEND_TO_RETRACTION": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "Reception") return state;
      return {
        ...state,
        housemaids: setStage(state, h.id, "PendingRetraction"),
        tasks: [...state.tasks, newTask(state, h.id, "retraction", action.now, undefined, action.actor)],
      };
    }
    case "RECORD_RETRACTION_OPEN": {
      return {
        ...state,
        adherence: [
          ...state.adherence,
          { id: nextId("ad"), role: action.role, housemaidId: action.housemaidId, openedPosition: action.openedPosition, timestamp: action.now },
        ],
      };
    }
    case "RECORD_TASK_OPEN": {
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.taskId && t.openedAt == null ? { ...t, openedAt: action.now } : t)),
      };
    }
    case "MOVE_TO_OFFBOARD": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "PendingRetraction") return state;
      const description = terminationComplaintDescription(action.reason, action.handNote);
      const integration = state.config.erpIntegrations.offboarding;
      return {
        ...state,
        housemaids: setStage(state, h.id, "MovedToOffboard"),
        tasks: closeTask(state, h.id, "retraction", action.now),
        outcomes: [...state.outcomes, newOutcome(state, h.id, "MovedToOffboard", action.actor, action.now, action.reason, { handNote: action.handNote, complaintDescription: description, complaintType: integration.complaintType, handlingTeam: integration.handlingTeam })],
      };
    }
    case "RETRACT_TO_CC": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "PendingRetraction") return state;
      const granted = action.grantedAmount;
      const integration = state.config.erpIntegrations.payroll;
      const metadata: Outcome["metadata"] = granted != null
        ? { grantedAmount: granted, complaintDescription: payrollComplaintDescription(granted), complaintType: integration.complaintType, handlingTeam: integration.handlingTeam }
        : undefined;
      return {
        ...state,
        housemaids: setStage(state, h.id, "RetractedToCC"),
        tasks: closeTask(state, h.id, "retraction", action.now),
        outcomes: [...state.outcomes, newOutcome(state, h.id, "RetractedToCC", action.actor, action.now, undefined, metadata)],
      };
    }
    case "RETRACT_TO_MAIDMATCH": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "PendingRetraction") return state;
      const profile: MaidMatchProfile = {
        ...action.profile,
        joinedMaidMatchAt: new Date(action.now).toISOString(),
        unpaidLeaveDueDate: unpaidLeaveDueDate(h.arrivalDate),
      };
      return {
        ...state,
        housemaids: setStage(state, h.id, "DocumentsCollection").map((x) =>
          x.id === h.id ? { ...x, maidMatchProfile: profile } : x
        ),
        tasks: [
          ...closeTask(state, h.id, "retraction", action.now),
          newTask(state, h.id, "documents", action.now, {
            documents: { unpaidLeave: { collected: false }, mmrConsent: { collected: false } },
          }),
        ],
        outcomes: [...state.outcomes, newOutcome(state, h.id, "RetractedToMaidMatch", action.actor, action.now, undefined, { profile })],
      };
    }
    case "CHECK_DOCUMENTS": {
      if (action.error) {
        return {
          ...state,
          tasks: state.tasks.map((t) =>
            t.type === "documents" && t.status === "open"
              ? { ...t, metadata: { ...t.metadata, documents: { ...t.metadata?.documents, lastCheckedAt: action.now, lastCheckError: action.error } } }
              : t
          ),
        };
      }
      let next: AppState = state;
      next = {
        ...next,
        tasks: next.tasks.map((t) => {
          if (t.type !== "documents" || t.status !== "open") return t;
          const maid = maidById(next, t.housemaidId);
          if (!maid) return t;
          const check = checkDocumentsInErp(maid, t.createdAt, action.now);
          const docs = { ...t.metadata?.documents };
          if (check.unpaidLeaveUploaded && !docs.unpaidLeave?.collected) {
            docs.unpaidLeave = { ...docs.unpaidLeave, collected: true, uploadedAt: check.unpaidLeaveUploadedAt, source: "erp" };
          }
          if (check.mmrConsentUploaded && !docs.mmrConsent?.collected) {
            docs.mmrConsent = { ...docs.mmrConsent, collected: true, uploadedAt: check.mmrConsentUploadedAt, source: "erp" };
          }
          docs.lastCheckedAt = action.now;
          docs.lastCheckError = null;
          return { ...t, metadata: { ...t.metadata, documents: docs } };
        }),
      };
      for (const t of next.tasks) {
        if (t.type === "documents" && t.status === "open") {
          next = completeDocumentsIfReady(next, t.housemaidId, action.now);
        }
      }
      return next;
    }
    case "UPLOAD_DOCUMENT": {
      const task = openTaskFor(state, action.housemaidId, "documents");
      if (!task) return state;
      const docs = { ...task.metadata?.documents };
      if (action.error) {
        docs.lastCheckError = action.error;
        const failed = { ...task, metadata: { ...task.metadata, documents: docs } };
        return { ...state, tasks: state.tasks.map((t) => (t.id === task.id ? failed : t)) };
      }
      const uploadedAt = new Date(action.now).toISOString();
      docs[action.document] = { collected: true, uploadedAt, source: "manual" };
      docs.lastCheckError = null;
      let next: AppState = { ...state, tasks: state.tasks.map((t) => (t.id === task.id ? { ...t, metadata: { ...t.metadata, documents: docs } } : t)) };
      return completeDocumentsIfReady(next, action.housemaidId, action.now);
    }
    case "SET_UNPAID_LEAVE_EXPIRY": {
      const task = openTaskFor(state, action.housemaidId, "documents");
      if (!task) return state;
      const prev = task.metadata?.documents;
      const docs: DocumentsState = {
        ...prev,
        unpaidLeave: { ...(prev?.unpaidLeave ?? { collected: false }), expiryDate: action.expiryDate },
      };
      let next: AppState = { ...state, tasks: state.tasks.map((t) => (t.id === task.id ? { ...t, metadata: { ...t.metadata, documents: docs } } : t)) };
      return completeDocumentsIfReady(next, action.housemaidId, Date.now());
    }
    case "EDIT_PROFILE": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h) return state;
      const profile: MaidMatchProfile = { ...(h.maidMatchProfile ?? { hasClient: null, disclosedClient: null, kids: 0, cities: [], childcare: null, childcareAgeBands: [], cook: null, pets: null, petsTypes: [], smoker: null, languages: [], certifications: null, certificationTypes: [], tasksSkills: [], daysOffPerWeek: 0 }), ...action.patch };
      const changed = Object.keys(action.patch).join(", ");
      return {
        ...state,
        housemaids: state.housemaids.map((x) => (x.id === h.id ? { ...x, maidMatchProfile: profile } : x)),
        outcomes: [...state.outcomes, newOutcome(state, h.id, "ProfileEdited", action.actor, action.now, changed)],
      };
    }
    case "DONE_SHOOTING": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "PendingShooting") return state;
      const prev = openTaskFor(state, h.id, "shooting");
      return {
        ...state,
        housemaids: setStage(state, h.id, "PendingEditing"),
        tasks: [...closeTask(state, h.id, "shooting", action.now), newTask(state, h.id, "editing", action.now, { stockPhotoUrl: action.stockPhotoUrl, stockVideoUrl: action.stockVideoUrl, editorNote: action.editorNote, ...(prev?.metadata) })],
      };
    }
    case "EDITING_DONE": {
      const h = state.housemaids.find((x) => x.id === action.housemaidId);
      if (!h || h.currentStage !== "PendingEditing") return state;
      return {
        ...state,
        housemaids: setStage(state, h.id, "AvailablePendingPublishing"),
        tasks: [
          ...closeTask(state, h.id, "editing", action.now),
          newTask(state, h.id, "publishing", action.now, {
            finalPhoto: action.finalPhoto,
            finalVideo: action.finalVideo,
            publish: initialPublishState(h, { finalPhoto: action.finalPhoto, finalVideo: action.finalVideo }),
          }),
        ],
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
        outcomes: [...state.outcomes, newOutcome(state, h.id, "SentBackToShooting", action.actor, action.now, action.comment)],
      };
    }
    case "RUN_PUBLISH_JOB": {
      let next: AppState = {
        ...state,
        tasks: state.tasks.map((t) => {
          if (t.type !== "publishing" || t.status !== "open") return t;
          const maid = maidById(state, t.housemaidId);
          if (!maid) return t;
          const pub = t.metadata?.publish ?? initialPublishState(maid, t.metadata);
          if (pub.heldReason) {
            return { ...t, metadata: { ...t.metadata, publish: { ...pub, lastAttemptAt: action.now } } };
          }
          let platforms = pub.platforms;
          let lastFailedAt = pub.lastFailedAt;
          for (const platform of PLATFORMS) {
            if (platforms[platform].status === "posted") continue; // retry pending and failed
            const result = attemptPost(maid, t.metadata, platform);
            if (result.ok) {
              platforms = { ...platforms, [platform]: { status: "posted", postedAt: action.now, source: "auto" } };
            } else {
              platforms = { ...platforms, [platform]: { status: "failed", failureReason: result.reason } };
              lastFailedAt = action.now;
            }
          }
          return { ...t, metadata: { ...t.metadata, publish: { ...pub, platforms, lastAttemptAt: action.now, lastFailedAt } } };
        }),
      };
      return completePublishingIfReady(next, action.now);
    }
    case "MANUAL_MARK_POSTED": {
      const task = openTaskFor(state, action.housemaidId, "publishing");
      if (!task) return state;
      const pub = task.metadata?.publish;
      if (!pub || pub.heldReason) return state;
      const platforms = { ...pub.platforms, [action.platform]: { status: "posted" as const, postedAt: action.now, source: "manual" as const } };
      let next: AppState = {
        ...state,
        tasks: state.tasks.map((t) => (t.id === task.id ? { ...t, metadata: { ...t.metadata, publish: { ...pub, platforms } } } : t)),
      };
      return completePublishingIfReady(next, action.now);
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
      return { ...state, housemaids: setStage(state, h.id, "AvailablePendingPublishing"), tasks: [...closeTask(state, h.id, "trial", action.now), newTask(state, h.id, "publishing", action.now, { publish: initialPublishState(h, undefined) })] };
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
    case "SET_CONFIG": {
      const config = { ...state.config, ...action.patch };
      const housemaids = action.patch.goldenProfile
        ? state.housemaids.map((h) => ({ ...h, isGoldenProfile: computeGolden(h, config.goldenProfile) }))
        : state.housemaids;
      return { ...state, config, housemaids };
    }
    case "ADD_USER": return { ...state, users: [...state.users, { id: nextId("user"), ...action.user }] };
    case "DEACTIVATE_USER": {
      const user = state.users.find((u) => u.id === action.userId);
      if (!user) return state;
      const isAdmin = user.roles.includes("sysadmin") || user.roles.includes("superadmin");
      const adminCount = state.users.filter((u) => u.roles.includes("sysadmin") || u.roles.includes("superadmin")).length;
      if (isAdmin && adminCount <= 1) return state;
      return { ...state, users: state.users.filter((u) => u.id !== action.userId) };
    }
    case "REFRESH_CC_LIVE_IN": {
      if (action.error) {
        return { ...state, ccLiveIn: { ...state.ccLiveIn, lastRefreshedAt: action.now, lastRefreshError: action.error } };
      }
      const incoming = action.entries ?? [];
      const existing = new Set(state.ccLiveIn.items.map((i) => i.maidsCcId));
      const fresh: CcLiveInEntry[] = incoming
        .filter((e) => !existing.has(e.maidsCcId))
        .map((e) => ({ ...e, addedAt: action.now, collected: false }));
      return {
        ...state,
        ccLiveIn: {
          items: [...state.ccLiveIn.items, ...fresh],
          lastRefreshedAt: action.now,
          lastSuccessfulAt: action.now,
          lastRefreshError: null,
        },
      };
    }
    case "COLLECT_CC_LIVE_IN": {
      const entry = state.ccLiveIn.items.find((i) => i.maidsCcId === action.maidsCcId);
      if (!entry || entry.collected) return state;
      const items = state.ccLiveIn.items.map((i) =>
        i.maidsCcId === action.maidsCcId ? { ...i, collected: true, collectedAt: action.now } : i
      );

      let housemaids = state.housemaids;
      const existing = housemaids.find((h) => h.maidsCcId && h.maidsCcId === entry.maidsCcId);
      let housemaidId: string;
      if (existing) {
        housemaidId = existing.id;
      } else {
        const id = nextId("h");
        housemaidId = id;
        housemaids = [
          ...housemaids,
          {
            id,
            name: entry.name,
            nationality: entry.nationality,
            age: entry.age,
            housemaidType: "CC live-in" as const,
            mobile: "",
            whatsapp: "",
            visaStartDate: "",
            visaExpiry: entry.visaExpiry,
            passportExpiry: "",
            passportNumber: "",
            arrivalDate: "",
            salary: 0,
            wpsHistory: [],
            employmentHistory: [],
            complaints: [],
            isGoldenProfile: false,
            maidsCcId: entry.maidsCcId,
            room: entry.room,
            photoUrl: entry.photoUrl,
            currentStage: "Reception" as Stage,
          },
        ];
      }

      const target = housemaids.find((x) => x.id === housemaidId);
      if (target && target.currentStage === "Reception") {
        const sent = housemaids.map((x) => (x.id === housemaidId ? { ...x, currentStage: "PendingRetraction" as Stage } : x));
        const task = newTask(state, housemaidId, "retraction", action.now, undefined, action.actor);
        return {
          ...state,
          housemaids: sent,
          tasks: [...state.tasks, task],
          ccLiveIn: { ...state.ccLiveIn, items: items.map((i) => (i.maidsCcId === action.maidsCcId ? { ...i, housemaidId } : i)) },
        };
      }
      return { ...state, ccLiveIn: { ...state.ccLiveIn, items } };
    }
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

/** How many times a maid has been sent back to shooting (a training signal). */
export function reshootCount(state: AppState, housemaidId: string): number {
  return state.outcomes.filter((o) => o.housemaidId === housemaidId && o.type === "SentBackToShooting").length;
}

export interface RetractionQueueRow extends SortableMaid {
  task: Task;
  maid: Housemaid;
}

/** Open retraction tasks ordered by the configured priority algorithm (base + live-in rule). */
export function sortedRetractionTasks(state: AppState): RetractionQueueRow[] {
  const rows: RetractionQueueRow[] = openTasks(state, "retraction").map((task) => {
    const maid = maidById(state, task.housemaidId);
    return {
      task,
      maid: maid!,
      createdAt: task.createdAt,
      nationality: maid?.nationality ?? "",
      isGoldenProfile: maid?.isGoldenProfile ?? false,
      isCcLiveIn: maid ? isCcLiveIn(maid) : false,
    };
  });
  return sortRetraction(rows, state.config.priorityAlgorithm, state.config.liveInPriority) as RetractionQueueRow[];
}

/** 1-based position in the retraction queue, or null if the maid isn't in it. */
export function retractionPosition(state: AppState, housemaidId: string): number | null {
  const idx = sortedRetractionTasks(state).findIndex((r) => r.task.housemaidId === housemaidId);
  return idx >= 0 ? idx + 1 : null;
}

export interface HousemaidStatus {
  label: string;
  inPipeline: boolean;
}

export function housemaidStatus(state: AppState, maid: Housemaid): HousemaidStatus {
  if (maid.currentStage === "Reception") return { label: "N/A", inPipeline: false };
  if (maid.currentStage === "PendingRetraction") {
    const pos = retractionPosition(state, maid.id);
    if (pos !== null) return { label: `In retraction queue, position ${pos}`, inPipeline: true };
  }
  return { label: stageLabel(maid.currentStage), inPipeline: true };
}

export function canSendToRetraction(maid: Housemaid): boolean {
  return maid.currentStage === "Reception";
}

export interface AdherenceSummary {
  followed: number;
  total: number;
  rate: number;
}

/** % of retraction opens that worked the top of the queue (openedPosition === 1). */
export function retractionAdherenceRate(state: AppState): AdherenceSummary {
  const total = state.adherence.length;
  const followed = state.adherence.filter((e) => e.openedPosition === 1).length;
  return { followed, total, rate: total === 0 ? 0 : Math.round((followed / total) * 100) };
}

export function avgTimeByStage(state: AppState): Partial<Record<Stage, number>> {
  const wh = state.config.workingHours;
  const daysOff = state.config.daysOff;
  const result: Partial<Record<Stage, number>> = {};
  const byType: Record<TaskType, [number, number][]> = { retraction: [], documents: [], shooting: [], editing: [], publishing: [], available: [], trial: [] };
  for (const t of state.tasks) {
    if (t.closedAt) byType[t.type].push([t.createdAt, t.closedAt]);
  }
  (Object.entries(STAGE_TO_TASK) as [Stage, TaskType][]).forEach(([stage, tt]) => {
    result[stage] = avgActiveHours(byType[tt], wh, daysOff);
  });
  return result;
}

/** Average handling time inside the task screen (first open → close), in active hours. */
export function avgHandlingTime(state: AppState): number {
  const spans: [number, number][] = state.tasks
    .filter((t) => t.closedAt != null && t.openedAt != null)
    .map((t) => [t.openedAt!, t.closedAt!]);
  return avgActiveHours(spans, state.config.workingHours, state.config.daysOff);
}

export function makeSeedState(): AppState {
  const now = Date.now();
  const tasks: Task[] = [];
  const outcomes: Outcome[] = [];
  let retractionSeq = 0;

  // Document-collection demo fixtures: Josephine has her unpaid-leave paper in but not
  // her consent; Anita has both papers but no expiry date — so both are visibly "stuck"
  // on different requirements.
  const SEED_DOCUMENTS: Record<string, DocumentsState> = {
    h027: {
      unpaidLeave: { collected: true, uploadedAt: new Date(now - 2 * 60_000).toISOString(), source: "erp" },
      mmrConsent: { collected: false },
      lastCheckedAt: now - 60_000,
      lastCheckError: null,
    },
    h028: {
      unpaidLeave: { collected: true, uploadedAt: new Date(now - 2 * 60_000).toISOString(), source: "erp" },
      mmrConsent: { collected: true, uploadedAt: new Date(now - 3 * 60_000).toISOString(), source: "erp" },
      lastCheckedAt: now - 60_000,
      lastCheckError: null,
    },
  };

  // Raw media fixtures so the editors' queue demonstrates in-place photo/video + notes.
  const SEED_RAW_MEDIA: Record<string, { stockPhotoUrl: string; stockVideoUrl: string; editorNote?: string }> = {
    h011: {
      stockPhotoUrl: "https://picsum.photos/seed/h011/400/300",
      stockVideoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      editorNote: "Great takes overall — cut the second half, there is AC noise.",
    },
    h012: {
      stockPhotoUrl: "https://picsum.photos/seed/h012/400/300",
      stockVideoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    },
    h013: {
      stockPhotoUrl: "https://picsum.photos/seed/h013/400/300",
      stockVideoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    },
  };

  // Publishing fixtures: Christine is waiting on Yaya (yellow), Deepa has a failed
  // Peekaboo (red), Jasmin is held for missing profile info (red).
  const SEED_PUBLISH: Record<string, PublishState> = {
    h014: {
      platforms: {
        maidmatch: { status: "posted", postedAt: now - 3 * 60_000, source: "auto" },
        peekaboo: { status: "posted", postedAt: now - 2 * 60_000, source: "auto" },
        yaya: { status: "pending" },
      },
      lastAttemptAt: now - 60_000,
    },
    h015: {
      platforms: {
        maidmatch: { status: "posted", postedAt: now - 4 * 60_000, source: "auto" },
        peekaboo: { status: "failed", failureReason: "Peekaboo rejected the media format" },
        yaya: { status: "pending" },
      },
      lastAttemptAt: now - 60_000,
      lastFailedAt: now - 60_000,
    },
    h030: {
      heldReason: "Profile information incomplete",
      platforms: { maidmatch: { status: "pending" }, peekaboo: { status: "pending" }, yaya: { status: "pending" } },
    },
  };

  seedHousemaids.forEach((h, i) => {
    const taskType = queueTaskType(h.currentStage);
    if (taskType) {
      let createdAt = now - i * 1000;
      if (taskType === "retraction") {
        // Stagger retraction entries across working hours so "time in queue" reads
        // realistically. The CC live-in is recent on purpose — its jump ahead of the
        // older MVs is what live-in priority is meant to show.
        createdAt = isCcLiveIn(h) ? now - 5 * 60_000 : now - (2 + retractionSeq) * 60 * 60_000;
        retractionSeq++;
      }
      if (taskType === "documents") {
        createdAt = now - 3 * 60_000;
      }
      tasks.push({
        id: nextId("task"),
        housemaidId: h.id,
        type: taskType,
        status: "open",
        assignedRole: defaultConfig.defaultRolePerTask[taskType],
        sentByRole: taskType === "retraction" ? "receptionist" : undefined,
        createdAt,
        metadata:
          taskType === "publishing"
            ? {
                finalPhoto: `https://picsum.photos/seed/${h.id}/400/500`,
                finalVideo: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
                publish: SEED_PUBLISH[h.id] ?? initialPublishState(h, { finalPhoto: "x", finalVideo: "y" }),
              }
            : taskType === "documents"
              ? { documents: SEED_DOCUMENTS[h.id] ?? { unpaidLeave: { collected: false }, mmrConsent: { collected: false } } }
              : taskType === "editing"
                ? (SEED_RAW_MEDIA[h.id] ?? undefined)
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

    const retractedStages = ["DocumentsCollection", "PendingShooting", "PendingEditing", "AvailablePendingPublishing", "AvailablePublished", "UnderTrial"];
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

  const dueToday = fetchCcLiveInDueToday()
    .slice(0, 4)
    .map((e, i) => ({
      ...e,
      addedAt: now - i * 60000,
      collected: i < 3,
      collectedAt: i < 3 ? now - i * 60000 + 30000 : undefined,
    }));
  const carriedOver: CcLiveInEntry[] = [
    { maidsCcId: "CC-1498", name: "Hana Yusuf", nationality: "Ethiopian", age: 35, room: "Villa 2 · Room 11", visaExpiry: "2026-11-28", dueReason: "Visa expiring within 60 days", addedAt: now - 86400000, collected: false },
    { maidsCcId: "CC-1499", name: "Salma Farah", nationality: "Kenyan", age: 27, room: "Villa 3 · Room 06", visaExpiry: "2026-11-30", dueReason: "Scheduled retraction slot", addedAt: now - 2 * 86400000, collected: false },
  ];

  return {
    housemaids: seedHousemaids.map((h) => ({ ...h, isGoldenProfile: computeGolden(h, defaultConfig.goldenProfile, now) })),
    users: seedUsers,
    tasks,
    outcomes,
    currentRole: "sysadmin",
    onBreak: false,
    config: defaultConfig,
    now,
    seededAt: now,
    ccLiveIn: {
      items: [...dueToday, ...carriedOver],
      lastRefreshedAt: now,
      lastSuccessfulAt: now,
      lastRefreshError: null,
    },
    adherence: [],
  };
}
