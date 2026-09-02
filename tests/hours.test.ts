import { describe, it, expect } from "vitest";
import { activeHoursBetween, avgActiveHours } from "../src/lib/hours";

// 2026-09-07 is a Monday. 08:00–20:00 local, no days off.
const MON = new Date(2026, 8, 7, 8, 0, 0).getTime();   // Mon 08:00
const TUE = new Date(2026, 8, 8, 8, 0, 0).getTime();   // Tue 08:00
const WH = { startHour: 8, endHour: 20 };

describe("active hours", () => {
  it("counts only working hours within a single day", () => {
    // 08:00 → 14:00 = 6h
    expect(activeHoursBetween(MON, MON + 6 * 3600_000, WH, [])).toBeCloseTo(6, 2);
  });

  it("skips non-working hours (night)", () => {
    // 20:00 Mon → 08:00 Tue = 0 working hours (20:00–08:00 is outside 8–20)
    const start = new Date(2026, 8, 7, 20, 0, 0).getTime();
    const end = TUE;
    expect(activeHoursBetween(start, end, WH, [])).toBeCloseTo(0, 2);
  });

  it("skips days off", () => {
    // Mon 08:00 → Tue 08:00 with Tuesday (day index 2) off = 12h (Mon 8–20)
    expect(activeHoursBetween(MON, TUE, WH, [2])).toBeCloseTo(12, 2);
  });

  it("averages spans", () => {
    const s1: [number, number] = [MON, MON + 2 * 3600_000];   // 2h
    const s2: [number, number] = [MON, MON + 4 * 3600_000];   // 4h
    expect(avgActiveHours([s1, s2], WH, [])).toBeCloseTo(3, 2);
  });
});
