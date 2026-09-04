import { describe, it, expect } from "vitest";
import { reducer, openTasks, myTeamWork, archiveForOutcome, avgTimeByStage, avgHandlingTime, makeSeedState, housemaidStatus, retractionPosition, canSendToRetraction, retractionAdherenceRate, sortedRetractionTasks, reshootCount, type AppState } from "../src/store";
import { defaultConfig, seedHousemaids, type Housemaid, type MaidMatchProfile, type Task } from "../src/data";
import { queueTaskType, isTerminal } from "../src/lib/stages";
import { initialPublishState } from "../src/lib/publishApi";

function maid(stage: Housemaid["currentStage"] = "Reception", overrides: Partial<Housemaid> = {}): Housemaid {
  return {
    id: "m1", name: "Maria Santos", nationality: "Filipino", age: 31,
    housemaidType: "MV", subType: "Normal MV",
    mobile: "+971501111111", whatsapp: "+971501111111",
    visaStartDate: "2025-06-01", visaExpiry: "2027-05-01", passportExpiry: "2029-01-01", passportNumber: "P1111111",
    arrivalDate: "2026-09-12", salary: 2200,
    wpsHistory: [], employmentHistory: [], complaints: [],
    isGoldenProfile: false, maidsCcId: "MM-1001", currentStage: stage,
    ...overrides,
  };
}

function profile(overrides: Partial<MaidMatchProfile> = {}): MaidMatchProfile {
  return {
    hasClient: null, disclosedClient: null, kids: 0, cities: [],
    childcare: null, childcareAgeBands: [], cook: null, pets: null, petsTypes: [],
    smoker: null, languages: [], certifications: null, certificationTypes: [], tasksSkills: [], daysOffPerWeek: 0,
    ...overrides,
  };
}

function base(h: Housemaid[]): AppState {
  return {
    housemaids: h, tasks: [], outcomes: [], users: [], currentRole: "sysadmin", onBreak: false,
    config: defaultConfig, now: 0, seededAt: 0,
    ccLiveIn: { items: [], lastRefreshedAt: null, lastSuccessfulAt: null, lastRefreshError: null },
    adherence: [],
  };
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

  it("retract to maidmatch opens a Documents Collection task (documents precedes shooting)", () => {
    let s = reducer(base([maid("Reception")]), { type: "SEND_TO_RETRACTION", housemaidId: "m1", actor: "retractor", now: 1000 });
    s = reducer(s, { type: "RETRACT_TO_MAIDMATCH", housemaidId: "m1", actor: "retractor", now: 2000, profile: profile({ hasClient: true, disclosedClient: true, prospectName: "Acme", prospectPhone: "055111" }) });
    expect(s.housemaids[0].currentStage).toBe("DocumentsCollection");
    expect(s.outcomes.some((o) => o.type === "RetractedToMaidMatch")).toBe(true);
    expect(s.tasks.filter((t) => t.type === "documents" && t.status === "open")).toHaveLength(1);
    expect(s.tasks.find((t) => t.type === "retraction")!.status).toBe("closed");
    expect(s.tasks.filter((t) => t.type === "shooting")).toHaveLength(0);
  });

  it("retract to maidmatch stores the profile with joined date and computed unpaid-leave date", () => {
    let s = reducer(base([maid("Reception", { arrivalDate: "2026-09-12" })]), { type: "SEND_TO_RETRACTION", housemaidId: "m1", actor: "retractor", now: 1000 });
    s = reducer(s, { type: "RETRACT_TO_MAIDMATCH", housemaidId: "m1", actor: "retractor", now: 2000, profile: profile({ livingArrangement: "Live-in" }) });
    const stored = s.housemaids[0].maidMatchProfile!;
    expect(stored.livingArrangement).toBe("Live-in");
    expect(stored.unpaidLeaveDueDate).toBe("2026-10-31"); // arrival 12 Sep → due 31 Oct
    expect(stored.joinedMaidMatchAt).toBeTruthy();
  });

  it("documents are collected via the document-collection flow", () => {
    const s0: AppState = {
      ...base([maid("DocumentsCollection")]),
      tasks: [{ id: "t1", housemaidId: "m1", type: "documents", status: "open", assignedRole: "retractor", createdAt: 900, metadata: { documents: { unpaidLeave: { collected: false }, mmrConsent: { collected: false } } } }],
    };
    let s = reducer(s0, { type: "UPLOAD_DOCUMENT", housemaidId: "m1", document: "unpaidLeave", now: 2000 });
    expect(s.housemaids[0].currentStage).toBe("DocumentsCollection"); // not complete yet
    s = reducer(s, { type: "UPLOAD_DOCUMENT", housemaidId: "m1", document: "mmrConsent", now: 2100 });
    expect(s.housemaids[0].currentStage).toBe("DocumentsCollection"); // expiry still missing
    s = reducer(s, { type: "SET_UNPAID_LEAVE_EXPIRY", housemaidId: "m1", expiryDate: "2027-10-31" });
    expect(s.housemaids[0].currentStage).toBe("PendingShooting");
    expect(s.tasks.find((t) => t.type === "documents")!.status).toBe("closed");
    expect(s.tasks.filter((t) => t.type === "shooting" && t.status === "open")).toHaveLength(1);
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

describe("publishing", () => {
  function publishingMaid(id = "m1"): Housemaid {
    return maid("AvailablePendingPublishing", {
      id,
      maidMatchProfile: profile({ livingArrangement: "Live-in", expectedSalaryMin: 2000, expectedSalaryMax: 2500 }),
    });
  }
  const media = { finalPhoto: "p.png", finalVideo: "v.mp4" };

  function pubTask(housemaid: Housemaid, publish?: NonNullable<Task["metadata"]>["publish"]): Task {
    return {
      id: "t1", housemaidId: housemaid.id, type: "publishing", status: "open", assignedRole: "sales", createdAt: 900,
      metadata: { ...media, publish: publish ?? initialPublishState(housemaid, media) },
    };
  }

  it("run publish job posts pending platforms and advances when all three are green", () => {
    const h = publishingMaid();
    let s: AppState = { ...base([h]), tasks: [pubTask(h)] };
    s = reducer(s, { type: "RUN_PUBLISH_JOB", now: 1000 });
    expect(s.housemaids[0].currentStage).toBe("AvailablePublished");
    expect(s.tasks.find((t) => t.type === "publishing")!.status).toBe("closed");
    expect(s.tasks.filter((t) => t.type === "available" && t.status === "open")).toHaveLength(1);
  });

  it("manual mark posted is the escape hatch and also completes", () => {
    const h = publishingMaid();
    let s: AppState = { ...base([h]), tasks: [pubTask(h)] };
    s = reducer(s, { type: "MANUAL_MARK_POSTED", housemaidId: "m1", platform: "maidmatch", now: 1000 });
    s = reducer(s, { type: "MANUAL_MARK_POSTED", housemaidId: "m1", platform: "peekaboo", now: 1100 });
    expect(s.housemaids[0].currentStage).toBe("AvailablePendingPublishing");
    s = reducer(s, { type: "MANUAL_MARK_POSTED", housemaidId: "m1", platform: "yaya", now: 1200 });
    expect(s.housemaids[0].currentStage).toBe("AvailablePublished");
    const pub = s.tasks.find((t) => t.type === "publishing")!.metadata!.publish!;
    expect(pub.platforms.maidmatch.source).toBe("manual");
  });

  it("held profiles are not posted and keep their stated reason", () => {
    const h = maid("AvailablePendingPublishing"); // no maidMatchProfile
    let s: AppState = { ...base([h]), tasks: [pubTask(h)] };
    s = reducer(s, { type: "RUN_PUBLISH_JOB", now: 1000 });
    expect(s.housemaids[0].currentStage).toBe("AvailablePendingPublishing");
    const pub = s.tasks.find((t) => t.type === "publishing")!.metadata!.publish!;
    expect(pub.heldReason).toBe("Profile information incomplete");
    expect(pub.platforms.maidmatch.status).toBe("pending");
  });

  it("a failed platform is retried on the next job and records lastFailedAt", () => {
    // The mock fails Yaya for maid h015 deterministically.
    const h = publishingMaid("h015");
    let s: AppState = { ...base([h]), tasks: [pubTask(h)] };
    s = reducer(s, { type: "RUN_PUBLISH_JOB", now: 1000 });
    let pub = s.tasks.find((t) => t.type === "publishing")!.metadata!.publish!;
    expect(pub.platforms.yaya.status).toBe("failed");
    expect(pub.platforms.yaya.failureReason).toContain("Yaya Middle East");
    expect(pub.lastFailedAt).toBe(1000);
    expect(s.housemaids[0].currentStage).toBe("AvailablePendingPublishing"); // not all green
    s = reducer(s, { type: "RUN_PUBLISH_JOB", now: 2000 });
    pub = s.tasks.find((t) => t.type === "publishing")!.metadata!.publish!;
    expect(pub.platforms.yaya.status).toBe("failed"); // still fails deterministically
    expect(pub.lastFailedAt).toBe(2000);
  });
});

describe("user management", () => {
  function withUsers(users: AppState["users"]): AppState {
    return { ...base([maid("Reception")]), users };
  }

  it("DEACTIVATE_USER removes a non-admin user", () => {
    const s = reducer(
      withUsers([
        { id: "u1", name: "Admin", email: "a@x.com", roles: ["sysadmin"] },
        { id: "u2", name: "User", email: "b@x.com", roles: ["retractor"] },
      ]),
      { type: "DEACTIVATE_USER", userId: "u2" }
    );
    expect(s.users.map((u) => u.id)).toEqual(["u1"]);
  });

  it("DEACTIVATE_USER refuses to remove the last admin", () => {
    const s = reducer(
      withUsers([{ id: "u1", name: "Admin", email: "a@x.com", roles: ["sysadmin"] }]),
      { type: "DEACTIVATE_USER", userId: "u1" }
    );
    expect(s.users).toHaveLength(1);
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

  it("publishing tasks carry a publish state with at least one platform still pending", () => {
    const s = makeSeedState();
    const publishing = s.tasks.filter((t) => t.type === "publishing");
    expect(publishing.length).toBeGreaterThan(0);
    for (const t of publishing) {
      const pub = t.metadata?.publish;
      expect(pub).toBeDefined();
      const allPosted = Object.values(pub!.platforms).every((p) => p.status === "posted");
      expect(allPosted).toBe(false);
    }
  });

  it("seeds a maid with two of three platforms already posted", () => {
    const s = makeSeedState();
    const partial = s.tasks.find(
      (t) => t.type === "publishing" && Object.values(t.metadata?.publish?.platforms ?? {}).filter((p) => p.status === "posted").length === 2
    );
    expect(partial).toBeTruthy();
  });

  it("seeds a held publishing profile and a failed platform", () => {
    const s = makeSeedState();
    const held = s.tasks.find((t) => t.type === "publishing" && t.metadata?.publish?.heldReason);
    expect(held).toBeTruthy();
    const failed = s.tasks.find((t) =>
      t.type === "publishing" && Object.values(t.metadata?.publish?.platforms ?? {}).some((p) => p.status === "failed")
    );
    expect(failed).toBeTruthy();
  });
});

describe("remaining transitions", () => {
  it("move to offboard records outcome and terminal stage", () => {
    let s: AppState = reducer(base([maid("Reception")]), { type: "SEND_TO_RETRACTION", housemaidId: "m1", actor: "retractor", now: 1000 });
    s = reducer(s, { type: "MOVE_TO_OFFBOARD", housemaidId: "m1", actor: "retractor", now: 2000, reason: "Expired visa", handNote: "Overstayed" });
    expect(s.housemaids[0].currentStage).toBe("MovedToOffboard");
    expect(s.outcomes.some((o) => o.type === "MovedToOffboard")).toBe(true);
    const outcome = s.outcomes.find((o) => o.type === "MovedToOffboard")!;
    expect(outcome.note).toBe("Expired visa");
    expect((outcome.metadata as Record<string, unknown>).complaintDescription).toContain("reason: Expired visa");
    expect((outcome.metadata as Record<string, unknown>).complaintDescription).toContain("Overstayed");
  });

  it("move to offboard drops the hand-note line when blank", () => {
    let s: AppState = reducer(base([maid("Reception")]), { type: "SEND_TO_RETRACTION", housemaidId: "m1", actor: "retractor", now: 1000 });
    s = reducer(s, { type: "MOVE_TO_OFFBOARD", housemaidId: "m1", actor: "retractor", now: 2000, reason: "Health issues" });
    const desc = (s.outcomes[0].metadata as Record<string, unknown>).complaintDescription as string;
    expect(desc).toBe("Maid for termination, reason: Health issues");
  });

  it("retract to CC with granted amount records a payroll complaint; without it, none", () => {
    let s: AppState = reducer(base([maid("Reception")]), { type: "SEND_TO_RETRACTION", housemaidId: "m1", actor: "retractor", now: 1000 });
    s = reducer(s, { type: "RETRACT_TO_CC", housemaidId: "m1", actor: "retractor", now: 2000, grantedAmount: 2500 });
    expect(s.housemaids[0].currentStage).toBe("RetractedToCC");
    const meta = s.outcomes[0].metadata as Record<string, unknown>;
    expect(meta.complaintDescription).toContain("AED 2500");

    let s2: AppState = reducer(base([maid("Reception")]), { type: "SEND_TO_RETRACTION", housemaidId: "m1", actor: "retractor", now: 1000 });
    s2 = reducer(s2, { type: "RETRACT_TO_CC", housemaidId: "m1", actor: "retractor", now: 2000 });
    expect(s2.outcomes[0].metadata).toBeUndefined();
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

describe("housemaid status", () => {
  it("Reception is N/A (not in pipeline)", () => {
    const s = base([maid("Reception")]);
    const st = housemaidStatus(s, s.housemaids[0]);
    expect(st.label).toBe("N/A");
    expect(st.inPipeline).toBe(false);
  });

  it("PendingRetraction reports queue position", () => {
    const s: AppState = {
      ...base([
        { ...maid("PendingRetraction"), id: "a" },
        { ...maid("PendingRetraction"), id: "b" },
      ]),
      tasks: [
        { id: "t1", housemaidId: "a", type: "retraction", status: "open", assignedRole: "retractor", createdAt: 200 },
        { id: "t2", housemaidId: "b", type: "retraction", status: "open", assignedRole: "retractor", createdAt: 100 },
      ],
    };
    // FIFO: b (created 100) before a (created 200)
    expect(retractionPosition(s, "b")).toBe(1);
    expect(retractionPosition(s, "a")).toBe(2);
    expect(housemaidStatus(s, s.housemaids[0]).label).toBe("In retraction queue, position 2");
  });

  it("later stages report their screen name", () => {
    const s = base([maid("PendingShooting")]);
    expect(housemaidStatus(s, s.housemaids[0]).label).toBe("Videographers");
  });

  it("canSendToRetraction is true only at Reception", () => {
    const s = base([maid("Reception")]);
    expect(canSendToRetraction(s.housemaids[0])).toBe(true);
    const s2 = base([maid("PendingRetraction")]);
    expect(canSendToRetraction(s2.housemaids[0])).toBe(false);
  });
});

describe("cc live-in", () => {
  const payload = {
    maidsCcId: "CC-1501", name: "Lorna", nationality: "Filipino", age: 30,
    room: "Villa 3", visaExpiry: "2026-12-05", dueReason: "Visa expiring",
  };

  it("REFRESH adds new entries and dedupes existing by maids.cc id", () => {
    const s0: AppState = {
      ...base([]),
      ccLiveIn: { items: [{ ...payload, addedAt: 1, collected: false }], lastRefreshedAt: 1, lastSuccessfulAt: 1, lastRefreshError: null },
    };
    const s = reducer(s0, { type: "REFRESH_CC_LIVE_IN", now: 2, entries: [payload, { ...payload, maidsCcId: "CC-1502" }] });
    expect(s.ccLiveIn.items.map((i) => i.maidsCcId)).toEqual(["CC-1501", "CC-1502"]);
    expect(s.ccLiveIn.lastRefreshError).toBeNull();
  });

  it("REFRESH on error keeps the list and records the error", () => {
    const s0: AppState = {
      ...base([]),
      ccLiveIn: { items: [{ ...payload, addedAt: 1, collected: false }], lastRefreshedAt: 1, lastSuccessfulAt: 1, lastRefreshError: null },
    };
    const s = reducer(s0, { type: "REFRESH_CC_LIVE_IN", now: 2, error: "network down" });
    expect(s.ccLiveIn.items).toHaveLength(1);
    expect(s.ccLiveIn.lastRefreshError).toBe("network down");
  });

  it("COLLECT ingests a new maid, marks collected, and opens a retraction task", () => {
    const s0: AppState = {
      ...base([]),
      ccLiveIn: { items: [{ ...payload, addedAt: 1, collected: false }], lastRefreshedAt: 1, lastSuccessfulAt: 1, lastRefreshError: null },
    };
    const s = reducer(s0, { type: "COLLECT_CC_LIVE_IN", maidsCcId: "CC-1501", actor: "retractor", now: 2000 });
    const entry = s.ccLiveIn.items[0];
    expect(entry.collected).toBe(true);
    expect(s.housemaids).toHaveLength(1);
    expect(s.housemaids[0].maidsCcId).toBe("CC-1501");
    expect(s.housemaids[0].currentStage).toBe("PendingRetraction");
    expect(s.tasks.filter((t) => t.type === "retraction" && t.status === "open")).toHaveLength(1);
  });

  it("COLLECT on an already-collected entry is a no-op", () => {
    const s0: AppState = {
      ...base([]),
      ccLiveIn: { items: [{ ...payload, addedAt: 1, collected: true }], lastRefreshedAt: 1, lastSuccessfulAt: 1, lastRefreshError: null },
    };
    const s = reducer(s0, { type: "COLLECT_CC_LIVE_IN", maidsCcId: "CC-1501", actor: "retractor", now: 2000 });
    expect(s.housemaids).toHaveLength(0);
    expect(s.tasks).toHaveLength(0);
  });

  it("COLLECT links an existing maid by maids.cc id instead of duplicating", () => {
    const existing = { ...maid("Reception"), maidsCcId: "CC-1501" };
    const s0: AppState = {
      ...base([existing]),
      ccLiveIn: { items: [{ ...payload, addedAt: 1, collected: false }], lastRefreshedAt: 1, lastSuccessfulAt: 1, lastRefreshError: null },
    };
    const s = reducer(s0, { type: "COLLECT_CC_LIVE_IN", maidsCcId: "CC-1501", actor: "retractor", now: 2000 });
    expect(s.housemaids).toHaveLength(1);
    expect(s.housemaids[0].currentStage).toBe("PendingRetraction");
    expect(s.tasks.filter((t) => t.type === "retraction" && t.status === "open")).toHaveLength(1);
  });
});

describe("adherence", () => {
  it("records each open with its position and reports the rate", () => {
    let s: AppState = base([maid("PendingRetraction")]);
    s = reducer(s, { type: "RECORD_RETRACTION_OPEN", housemaidId: "m1", role: "retractor", openedPosition: 1, now: 1000 });
    s = reducer(s, { type: "RECORD_RETRACTION_OPEN", housemaidId: "m1", role: "retractor", openedPosition: 3, now: 2000 });
    s = reducer(s, { type: "RECORD_RETRACTION_OPEN", housemaidId: "m1", role: "retractor", openedPosition: 1, now: 3000 });
    const summary = retractionAdherenceRate(s);
    expect(summary.total).toBe(3);
    expect(summary.followed).toBe(2);
    expect(summary.rate).toBe(67);
  });

  it("rate is 0 when nothing has been opened", () => {
    expect(retractionAdherenceRate(base([]))).toEqual({ followed: 0, total: 0, rate: 0 });
  });
});

describe("retraction queue ordering", () => {
  it("puts CC live-in maids first when live-in priority is on", () => {
    const mv = maid("PendingRetraction", { id: "a", housemaidType: "MV" });
    const liveIn = maid("PendingRetraction", { id: "b", housemaidType: "CC live-in" });
    const s: AppState = {
      ...base([mv, liveIn]),
      tasks: [
        { id: "t1", housemaidId: "a", type: "retraction", status: "open", assignedRole: "retractor", createdAt: 100 },
        { id: "t2", housemaidId: "b", type: "retraction", status: "open", assignedRole: "retractor", createdAt: 200 },
      ],
    };
    const sorted = sortedRetractionTasks(s);
    expect(sorted[0].maid.id).toBe("b");
    expect(sorted[1].maid.id).toBe("a");
  });
});

describe("document collection details", () => {
  function docState(): AppState {
    return {
      ...base([maid("DocumentsCollection")]),
      tasks: [{ id: "t1", housemaidId: "m1", type: "documents", status: "open", assignedRole: "retractor", createdAt: 1000, metadata: { documents: { unpaidLeave: { collected: false }, mmrConsent: { collected: false } } } }],
    };
  }

  it("manual upload marks collected with source manual", () => {
    const s = reducer(docState(), { type: "UPLOAD_DOCUMENT", housemaidId: "m1", document: "mmrConsent", now: 2000 });
    const docs = s.tasks[0].metadata!.documents!;
    expect(docs.mmrConsent?.collected).toBe(true);
    expect(docs.mmrConsent?.source).toBe("manual");
  });

  it("failed upload does not mark collected and records the error", () => {
    const s = reducer(docState(), { type: "UPLOAD_DOCUMENT", housemaidId: "m1", document: "mmrConsent", now: 2000, error: "Upload failed" });
    const docs = s.tasks[0].metadata!.documents!;
    expect(docs.mmrConsent?.collected).toBe(false);
    expect(docs.lastCheckError).toBe("Upload failed");
  });

  it("CHECK_DOCUMENTS flags uploaded docs collected from the ERP", () => {
    let s = docState();
    // retracted 10 min ago → both papers past the mock thresholds (2m / 5m)
    s = { ...s, tasks: [{ ...s.tasks[0], createdAt: 1000 }] };
    s = reducer(s, { type: "CHECK_DOCUMENTS", now: 1000 + 10 * 60_000 });
    const docs = s.tasks[0].metadata!.documents!;
    expect(docs.unpaidLeave?.collected).toBe(true);
    expect(docs.mmrConsent?.collected).toBe(true);
    expect(docs.unpaidLeave?.source).toBe("erp");
    expect(s.housemaids[0].currentStage).toBe("DocumentsCollection"); // no expiry yet
  });

  it("CHECK_DOCUMENTS error keeps the docs uncollected and records the error", () => {
    const s = reducer(docState(), { type: "CHECK_DOCUMENTS", now: 2000, error: "network down" });
    const docs = s.tasks[0].metadata!.documents!;
    expect(docs.lastCheckError).toBe("network down");
    expect(docs.unpaidLeave?.collected).toBe(false);
  });
});

describe("media production", () => {
  it("done shooting carries the editor note to the editing task", () => {
    const s0: AppState = {
      ...base([maid("PendingShooting")]),
      tasks: [{ id: "t1", housemaidId: "m1", type: "shooting", status: "open", assignedRole: "media", createdAt: 900 }],
    };
    const s = reducer(s0, { type: "DONE_SHOOTING", housemaidId: "m1", actor: "media", now: 2000, stockPhotoUrl: "raw.png", stockVideoUrl: "raw.mp4", editorNote: "Background noise in take 2" });
    const editing = s.tasks.find((t) => t.type === "editing" && t.status === "open");
    expect(editing?.metadata?.editorNote).toBe("Background noise in take 2");
  });

  it("send back to shooting records a SentBackToShooting outcome", () => {
    const s0: AppState = {
      ...base([maid("PendingEditing")]),
      tasks: [{ id: "t1", housemaidId: "m1", type: "editing", status: "open", assignedRole: "media", createdAt: 900 }],
    };
    const s = reducer(s0, { type: "SEND_BACK_TO_SHOOTING", housemaidId: "m1", actor: "media", now: 2000, comment: "Photo is out of focus" });
    expect(s.housemaids[0].currentStage).toBe("PendingShooting");
    expect(s.outcomes.some((o) => o.type === "SentBackToShooting" && o.note === "Photo is out of focus")).toBe(true);
    expect(reshootCount(s, "m1")).toBe(1);
    // the comment is attached to the new shooting task for the shooter
    expect(s.tasks.find((t) => t.type === "shooting" && t.status === "open")?.metadata?.comment).toBe("Photo is out of focus");
  });
});

describe("system configuration", () => {
  it("editing the golden-profile definition recomputes golden flags live", () => {
    let s = makeSeedState();
    expect(s.housemaids.some((h) => h.isGoldenProfile)).toBe(true);
    s = reducer(s, { type: "SET_CONFIG", patch: { goldenProfile: { ...s.config.goldenProfile, nationalities: [] } } });
    expect(s.housemaids.every((h) => !h.isGoldenProfile)).toBe(true);
  });

  it("terminate outcome carries the configured ERP complaint type and team", () => {
    let s = reducer(base([maid("Reception")]), { type: "SEND_TO_RETRACTION", housemaidId: "m1", actor: "retractor", now: 1000 });
    s = reducer(s, { type: "MOVE_TO_OFFBOARD", housemaidId: "m1", actor: "retractor", now: 2000, reason: "Health issues" });
    const meta = s.outcomes[0].metadata as Record<string, unknown>;
    expect(meta.complaintType).toBe("Offboarding");
    expect(meta.handlingTeam).toBe("Offboarding team");
  });

  it("RECORD_TASK_OPEN stamps the first open only, and handling time is measured from it", () => {
    const start = Date.UTC(2026, 8, 1, 9, 0, 0);
    const s0: AppState = {
      ...base([maid("PendingRetraction")]),
      tasks: [{ id: "t1", housemaidId: "m1", type: "retraction", status: "open", assignedRole: "retractor", createdAt: start - 3600_000 }],
    };
    let s = reducer(s0, { type: "RECORD_TASK_OPEN", taskId: "t1", now: start });
    expect(s.tasks[0].openedAt).toBe(start);
    s = reducer(s, { type: "RECORD_TASK_OPEN", taskId: "t1", now: start + 60_000 });
    expect(s.tasks[0].openedAt).toBe(start); // first open wins
    // close 2 active hours later
    const closed: AppState = {
      ...s,
      tasks: s.tasks.map((t) => ({ ...t, status: "closed", closedAt: start + 2 * 3600_000 })),
    };
    expect(avgHandlingTime(closed)).toBeCloseTo(2, 2);
  });

  it("EDIT_PROFILE updates the MaidMatch profile and records a ProfileEdited outcome", () => {
    const withProfile = maid("Reception", { maidMatchProfile: profile({ livingArrangement: "Live-in", kids: 0 }) });
    let s: AppState = base([withProfile]);
    s = reducer(s, { type: "EDIT_PROFILE", housemaidId: "m1", patch: { livingArrangement: "Live-out", kids: 2 }, actor: "sales", now: 2000 });
    expect(s.housemaids[0].maidMatchProfile?.livingArrangement).toBe("Live-out");
    expect(s.housemaids[0].maidMatchProfile?.kids).toBe(2);
    const outcome = s.outcomes.find((o) => o.type === "ProfileEdited");
    expect(outcome?.actorRole).toBe("sales");
    expect(outcome?.note).toContain("livingArrangement");
  });
});
