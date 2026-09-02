import { describe, it, expect } from "vitest";
import { queueTaskType, isTerminal, PLATFORMS, NAV_TREE } from "../src/lib/stages";

describe("stages", () => {
  it("maps active stages to task types", () => {
    expect(queueTaskType("PendingRetraction")).toBe("retraction");
    expect(queueTaskType("PendingShooting")).toBe("shooting");
    expect(queueTaskType("PendingEditing")).toBe("editing");
    expect(queueTaskType("AvailablePendingPublishing")).toBe("publishing");
    expect(queueTaskType("AvailablePublished")).toBe("available");
    expect(queueTaskType("UnderTrial")).toBe("trial");
  });

  it("archive/terminal stages have no task type", () => {
    for (const s of ["RetractedToCC", "MovedToOffboard", "Hired", "Cancelled", "Reception"] as const) {
      expect(queueTaskType(s)).toBeNull();
      if (s !== "Reception") expect(isTerminal(s)).toBe(true);
    }
    expect(isTerminal("Reception")).toBe(false);
  });

  it("publishing stage has 5 subscreens, media has 3, retraction has 4", () => {
    const pub = NAV_TREE.find((n) => n.key === "publishing");
    const media = NAV_TREE.find((n) => n.key === "media");
    const ret = NAV_TREE.find((n) => n.key === "retraction");
    expect(pub!.children?.length).toBe(5);
    expect(media!.children?.length).toBe(3);
    expect(ret!.children?.length).toBe(4);
  });

  it("publish platforms are ordered maidmatch, peekaboo, yaya", () => {
    expect(PLATFORMS).toEqual(["maidmatch", "peekaboo", "yaya"]);
  });
});
