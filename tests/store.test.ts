import { describe, it, expect } from "vitest";
import { reducer, openTasks, myTeamWork, archiveForOutcome, avgTimeByStage, makeSeedState, type AppState } from "../src/store";
import { defaultConfig, seedHousemaids, type Housemaid } from "../src/data";
import { queueTaskType, isTerminal } from "../src/lib/stages";

function maid(stage: Housemaid["currentStage"] = "Reception"): Housemaid {
  return {
    id: "m1", name: "Maria Santos", nationality: "Filipino", age: 31,
    housemaidType: "MV", mobile: "+971501111111", whatsapp: "+971501111111",
    visaExpiry: "2027-05-01", passportExpiry: "2029-01-01", salary: 2200,
    employmentHistory: ["2 yrs, UAE"], complaints: [],
    isGoldenProfile: false, preferences: [], maidsCcId: "MM-1001", currentStage: stage,
  };
}

function base(h: Housemaid[]): AppState {
  return { housemaids: h, tasks: [], outcomes: [], users: [], currentRole: "sysadmin", onBreak: false, config: defaultConfig, now: 0, seededAt: 0 };
}

describe("reducer transitions", () => {
  it("send to retraction creates an open retraction task owned by default role", () => {
    const s = reducer(base([maid("Reception")]), { type: "SEND_TO_RETRACTION", housemaidId: "m1", actor: "retractor", now: 1000 });
    expect(s.housemaids[0].currentStage).toBe("PendingRetraction");
    expect(s.tasks).toHaveLength(1);
    expect(s.tasks[0]).toMatchObject({ type: "retraction", status: "open", assignedRole: "retractor" });
  });

  it("retract to CC closes task, records outcome, terminal stage", () => {
    let s = reducer(base([maid("Reception")]), { type: "SEND_TO_RETRACTION", housemaidId: "m1", actor: "retractor", now: 1000 });
    s = reducer(s, { type: "RETRACT_TO_CC", housemaidId: "m1", actor: "retractor", now: 2000 });
    expect(s.housemaids[0].currentStage).toBe("RetractedToCC");
    expect(s.tasks[0].status).toBe("closed");
    expect(s.outcomes).toHaveLength(1);
    expect(s.outcomes[0].type).toBe("RetractedToCC");
  });

  it("retract to maidmatch creates a PendingShooting task (not two stages)", () => {
    let s = reducer(base([maid("Reception")]), { type: "SEND_TO_RETRACTION", housemaidId: "m1", actor: "retractor", now: 1000 });
    s = reducer(s, { type: "RETRACT_TO_MAIDMATCH", housemaidId: "m1", actor: "retractor", now: 2000, preferences: ["She prefers to be a Live in maid"] });
    expect(s.housemaids[0].currentStage).toBe("PendingShooting");
    expect(s.outcomes.some((o) => o.type === "RetractedToMaidMatch")).toBe(true);
    expect(s.tasks.filter((t) => t.type === "shooting" && t.status === "open")).toHaveLength(1);
    expect(s.tasks.find((t) => t.type === "retraction")!.status).toBe("closed");
  });

  it("editing done records ProductionDone + creates publishing task", () => {
    const s0 = { ...base([maid("PendingEditing")]), tasks: [{ id: "t1", housemaidId: "m1", type: "editing" as const, status: "open" as const, assignedRole: "media" as const, createdAt: 900 }] };
    const s = reducer(s0, { type: "EDITING_DONE", housemaidId: "m1", actor: "media", now: 2000, finalPhoto: "url", finalVideo: "link" });
    expect(s.housemaids[0].currentStage).toBe("AvailablePendingPublishing");
    expect(s.outcomes.some((o) => o.type === "ProductionDone")).toBe(true);
    expect(s.tasks.filter((t) => t.type === "publishing" && t.status === "open")).toHaveLength(1);
  });

  it("cancel requires a reason (throws when missing)", () => {
    const s0 = { ...base([maid("UnderTrial")]), tasks: [{ id: "t1", housemaidId: "m1", type: "trial" as const, status: "open" as const, assignedRole: "sales" as const, createdAt: 900 }] };
    expect(() => reducer(s0, { type: "CANCEL", housemaidId: "m1", actor: "sales", now: 2000, reason: "" })).toThrow();
  });
});

describe("ADD_USER", () => {
  it("appends a user with the given name, email, and roles", () => {
    const s = reducer(base([maid("Reception")]), {
      type: "ADD_USER",
      user: { name: "Test User", email: "test@maidmatch.ae", roles: ["sales", "media"] },
    });
    expect(s.users).toHaveLength(1);
    expect(s.users[0]).toMatchObject({ name: "Test User", email: "test@maidmatch.ae", roles: ["sales", "media"] });
    expect(s.users[0].id).toBeTruthy();
  });
});

describe("FLAG_PLATFORM auto-advance", () => {
  it("advances to AvailablePublished only when all three platforms are green", () => {
    let s: AppState = {
      ...base([maid("AvailablePendingPublishing")]),
      tasks: [{ id: "t1", housemaidId: "m1", type: "publishing", status: "open", assignedRole: "sales", createdAt: 900, metadata: { publishState: { maidmatch: false, peekaboo: false, yaya: false } } }],
    };
    s = reducer(s, { type: "FLAG_PLATFORM", housemaidId: "m1", platform: "maidmatch", now: 1000 });
    s = reducer(s, { type: "FLAG_PLATFORM", housemaidId: "m1", platform: "peekaboo", now: 1100 });
    expect(s.housemaids[0].currentStage).toBe("AvailablePendingPublishing");
    expect(s.tasks.filter((t) => t.type === "available")).toHaveLength(0);
    s = reducer(s, { type: "FLAG_PLATFORM", housemaidId: "m1", platform: "yaya", now: 1200 });
    expect(s.housemaids[0].currentStage).toBe("AvailablePublished");
    expect(s.tasks.find((t) => t.type === "publishing")!.status).toBe("closed");
    expect(s.tasks.filter((t) => t.type === "available" && t.status === "open")).toHaveLength(1);
  });
});

describe("selectors", () => {
  it("openTasks filters by type", () => {
    const s: AppState = {
      ...base([maid("Reception")]),
      tasks: [
        { id: "t1", housemaidId: "m1", type: "retraction", status: "open", assignedRole: "retractor", createdAt: 100 },
        { id: "t2", housemaidId: "m1", type: "shooting", status: "open", assignedRole: "media", createdAt: 200 },
        { id: "t3", housemaidId: "m1", type: "retraction", status: "closed", assignedRole: "retractor", createdAt: 50, closedAt: 150 },
      ],
    };
    expect(openTasks(s, "retraction")).toHaveLength(1);
    expect(openTasks(s, "retraction")[0].id).toBe("t1");
    expect(openTasks(s)).toHaveLength(2);
  });

  it("myTeamWork filters by currentRole, admins see all", () => {
    const tasks: AppState["tasks"] = [
      { id: "t1", housemaidId: "m1", type: "retraction", status: "open", assignedRole: "retractor", createdAt: 100 },
      { id: "t2", housemaidId: "m1", type: "shooting", status: "open", assignedRole: "media", createdAt: 200 },
    ];
    const retractor: AppState = { ...base([maid("Reception")]), tasks, currentRole: "retractor" };
    expect(myTeamWork(retractor)).toHaveLength(1);
    expect(myTeamWork(retractor)[0].assignedRole).toBe("retractor");
    const admin: AppState = { ...retractor, currentRole: "sysadmin" };
    expect(myTeamWork(admin)).toHaveLength(2);
  });

  it("archiveForOutcome filters and sorts newest first", () => {
    const s: AppState = {
      ...base([maid("Reception")]),
      outcomes: [
        { id: "o1", housemaidId: "m1", type: "RetractedToCC", timestamp: 100, actorRole: "retractor" },
        { id: "o2", housemaidId: "m1", type: "RetractedToMaidMatch", timestamp: 300, actorRole: "retractor" },
        { id: "o3", housemaidId: "m1", type: "RetractedToCC", timestamp: 200, actorRole: "retractor" },
      ],
    };
    const archived = archiveForOutcome(s, "RetractedToCC");
    expect(archived).toHaveLength(2);
    expect(archived[0].id).toBe("o3");
    expect(archived[1].id).toBe("o1");
  });

  it("avgTimeByStage returns positive hours for a closed retraction task", () => {
    const s: AppState = {
      ...base([maid("PendingRetraction")]),
      tasks: [{ id: "t1", housemaidId: "m1", type: "retraction", status: "closed", assignedRole: "retractor", createdAt: Date.UTC(2026, 8, 1, 9, 0, 0), closedAt: Date.UTC(2026, 8, 1, 11, 0, 0) }],
    };
    expect(avgTimeByStage(s)["PendingRetraction"]).toBeGreaterThan(0);
  });

  it("makeSeedState returns a populated base state", () => {
    const s = makeSeedState();
    expect(s.housemaids.length).toBeGreaterThan(0);
    expect(s.tasks.length).toBeGreaterThan(0);
    expect(s.outcomes.length).toBeGreaterThan(0);
    expect(s.currentRole).toBe("sysadmin");
    expect(s.onBreak).toBe(false);
  });
});

describe("makeSeedState consistency with seed housemaids", () => {
  it("creates exactly one matching open task per active-stage housemaid", () => {
    const s = makeSeedState();
    const active = seedHousemaids.filter((h) => queueTaskType(h.currentStage) !== null);
    expect(active.length).toBeGreaterThan(0);
    for (const h of active) {
      const type = queueTaskType(h.currentStage)!;
      const open = s.tasks.filter((t) => t.housemaidId === h.id && t.type === type && t.status === "open");
      expect(open).toHaveLength(1);
      expect(open[0].assignedRole).toBe(defaultConfig.defaultRolePerTask[type]);
    }
    expect(s.tasks.every((t) => t.status === "open")).toBe(true);
  });

  it("creates exactly one matching outcome per terminal-stage housemaid", () => {
    const s = makeSeedState();
    const terminal = seedHousemaids.filter((h) => isTerminal(h.currentStage));
    expect(terminal.length).toBeGreaterThan(0);
    for (const h of terminal) {
      const outs = s.outcomes.filter((o) => o.housemaidId === h.id && o.type === h.currentStage);
      expect(outs).toHaveLength(1);
      expect(outs[0].actorRole).toBe("sysadmin");
    }
  });

  it("creates no open tasks for Reception-stage maids", () => {
    const s = makeSeedState();
    const reception = seedHousemaids.filter((h) => h.currentStage === "Reception");
    expect(reception.length).toBeGreaterThan(0);
    for (const h of reception) {
      expect(s.tasks.some((t) => t.housemaidId === h.id && t.status === "open")).toBe(false);
    }
  });

  it("keeps terminal maids out of tasks and active maids out of terminal outcomes", () => {
    const s = makeSeedState();
    const terminalTypes = new Set(["RetractedToCC", "MovedToOffboard", "Hired", "Cancelled"]);
    for (const h of seedHousemaids) {
      if (isTerminal(h.currentStage)) {
        expect(s.tasks.some((t) => t.housemaidId === h.id)).toBe(false);
      }
      if (queueTaskType(h.currentStage) !== null) {
        expect(s.outcomes.some((o) => o.housemaidId === h.id && terminalTypes.has(o.type))).toBe(false);
      }
    }
  });

  it("synthesizes historical outcomes for in-flight maids", () => {
    const s = makeSeedState();
    const pendingShooting = seedHousemaids.find((h) => h.currentStage === "PendingShooting");
    expect(pendingShooting).toBeTruthy();
    const psOutcomes = s.outcomes.filter((o) => o.housemaidId === pendingShooting!.id);
    expect(psOutcomes.some((o) => o.type === "RetractedToMaidMatch")).toBe(true);
    expect(psOutcomes.some((o) => o.type === "ProductionDone")).toBe(false);

    const published = seedHousemaids.find((h) => h.currentStage === "AvailablePublished");
    expect(published).toBeTruthy();
    const pubOutcomes = s.outcomes.filter((o) => o.housemaidId === published!.id);
    expect(pubOutcomes.some((o) => o.type === "RetractedToMaidMatch")).toBe(true);
    expect(pubOutcomes.some((o) => o.type === "ProductionDone")).toBe(true);
  });

  it("publishing tasks carry a publishState with at least one platform still pending", () => {
    const s = makeSeedState();
    const publishing = s.tasks.filter((t) => t.type === "publishing");
    expect(publishing.length).toBeGreaterThan(0);
    for (const t of publishing) {
      const state = t.metadata?.publishState;
      expect(state).toBeDefined();
      expect(Object.values(state!).every(Boolean)).toBe(false);
    }
  });

  it("seeds a maid with two of three platforms already published", () => {
    const s = makeSeedState();
    const partial = s.tasks.find(
      (t) => t.type === "publishing" && Object.values(t.metadata?.publishState ?? {}).filter(Boolean).length === 2
    );
    expect(partial).toBeTruthy();
  });
});

describe("remaining transitions", () => {
  it("move to offboard records outcome and terminal stage", () => {
    let s: AppState = reducer(base([maid("Reception")]), { type: "SEND_TO_RETRACTION", housemaidId: "m1", actor: "retractor", now: 1000 });
    s = reducer(s, { type: "MOVE_TO_OFFBOARD", housemaidId: "m1", actor: "retractor", now: 2000 });
    expect(s.housemaids[0].currentStage).toBe("MovedToOffboard");
    expect(s.outcomes.some((o) => o.type === "MovedToOffboard")).toBe(true);
  });

  it("done shooting advances to PendingEditing carrying stock photo", () => {
    const s0: AppState = { ...base([maid("PendingShooting")]), tasks: [{ id: "t1", housemaidId: "m1", type: "shooting", status: "open", assignedRole: "media", createdAt: 900 }] };
    const s = reducer(s0, { type: "DONE_SHOOTING", housemaidId: "m1", actor: "media", now: 2000, stockPhotoUrl: "photo.png" });
    expect(s.housemaids[0].currentStage).toBe("PendingEditing");
    expect(s.tasks.find((t) => t.type === "editing" && t.status === "open")?.metadata?.stockPhotoUrl).toBe("photo.png");
  });

  it("send back to shooting reopens a shooting task", () => {
    const s0: AppState = { ...base([maid("PendingEditing")]), tasks: [{ id: "t1", housemaidId: "m1", type: "editing", status: "open", assignedRole: "media", createdAt: 900 }] };
    const s = reducer(s0, { type: "SEND_BACK_TO_SHOOTING", housemaidId: "m1", actor: "media", now: 2000 });
    expect(s.housemaids[0].currentStage).toBe("PendingShooting");
    expect(s.tasks.filter((t) => t.type === "shooting" && t.status === "open")).toHaveLength(1);
  });

  it("under trial sets stage, trial task, and employer name", () => {
    const s0: AppState = { ...base([maid("AvailablePublished")]), tasks: [{ id: "t1", housemaidId: "m1", type: "available", status: "open", assignedRole: "sales", createdAt: 900 }] };
    const s = reducer(s0, { type: "UNDER_TRIAL", housemaidId: "m1", actor: "sales", now: 2000, employerName: "Acme Family" });
    expect(s.housemaids[0].currentStage).toBe("UnderTrial");
    expect(s.tasks.filter((t) => t.type === "trial" && t.status === "open")).toHaveLength(1);
    expect(s.housemaids[0].employerName).toBe("Acme Family");
  });

  it("hired records outcome and terminal stage", () => {
    const s0: AppState = { ...base([maid("UnderTrial")]), tasks: [{ id: "t1", housemaidId: "m1", type: "trial", status: "open", assignedRole: "sales", createdAt: 900 }] };
    const s = reducer(s0, { type: "HIRED", housemaidId: "m1", actor: "sales", now: 2000 });
    expect(s.housemaids[0].currentStage).toBe("Hired");
    expect(s.outcomes.some((o) => o.type === "Hired")).toBe(true);
  });

  it("send back to published returns to AvailablePublished", () => {
    const s0: AppState = { ...base([maid("UnderTrial")]), tasks: [{ id: "t1", housemaidId: "m1", type: "trial", status: "open", assignedRole: "sales", createdAt: 900 }] };
    const s = reducer(s0, { type: "SEND_BACK_TO_PUBLISHED", housemaidId: "m1", actor: "sales", now: 2000 });
    expect(s.housemaids[0].currentStage).toBe("AvailablePublished");
  });

  it("send back to pending publishing returns to AvailablePendingPublishing", () => {
    const s0: AppState = { ...base([maid("UnderTrial")]), tasks: [{ id: "t1", housemaidId: "m1", type: "trial", status: "open", assignedRole: "sales", createdAt: 900 }] };
    const s = reducer(s0, { type: "SEND_BACK_TO_PENDING_PUBLISHING", housemaidId: "m1", actor: "sales", now: 2000 });
    expect(s.housemaids[0].currentStage).toBe("AvailablePendingPublishing");
  });
});

describe("guard failures", () => {
  it("ignores HIRED when maid is not UnderTrial", () => {
    const s0: AppState = base([maid("Reception")]);
    const s = reducer(s0, { type: "HIRED", housemaidId: "m1", actor: "sales", now: 2000 });
    expect(s).toBe(s0);
    expect(s.housemaids[0].currentStage).toBe("Reception");
    expect(s.tasks).toHaveLength(0);
    expect(s.outcomes).toHaveLength(0);
  });
});
