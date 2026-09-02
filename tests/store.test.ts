import { describe, it, expect } from "vitest";
import { reducer, type AppState } from "../src/store";
import { defaultConfig, type Housemaid } from "../src/data";

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
  return { housemaids: h, tasks: [], outcomes: [], users: [], currentRole: "sysadmin", onBreak: false, config: defaultConfig, now: 0 };
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
