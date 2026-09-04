import { describe, it, expect } from "vitest";
import { unpaidLeaveDueDate, daysUntil } from "../src/lib/unpaidLeave";

describe("unpaidLeaveDueDate", () => {
  it("arrival on 12 Sep is due 31 Oct (day 1–20 → last day of next month)", () => {
    expect(unpaidLeaveDueDate("2026-09-12")).toBe("2026-10-31");
  });

  it("arrival on 24 Sep is due 30 Nov (day 21+ → last day two months ahead)", () => {
    expect(unpaidLeaveDueDate("2026-09-24")).toBe("2026-11-30");
  });

  it("arrival on 20th is treated as the 1–20 band", () => {
    expect(unpaidLeaveDueDate("2026-09-20")).toBe("2026-10-31");
  });

  it("arrival on 21st is treated as the 21+ band", () => {
    expect(unpaidLeaveDueDate("2026-09-21")).toBe("2026-11-30");
  });

  it("handles year rollover (December arrival)", () => {
    expect(unpaidLeaveDueDate("2026-12-10")).toBe("2027-01-31");
  });
});

describe("daysUntil", () => {
  it("counts days from a fixed reference", () => {
    const ref = new Date(2026, 8, 10, 12, 0, 0).getTime(); // 10 Sep 2026
    expect(daysUntil("2026-09-20", ref)).toBe(10);
    expect(daysUntil("2026-09-01", ref)).toBe(-9);
  });
});
