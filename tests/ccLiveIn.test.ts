import { describe, it, expect } from "vitest";
import {
  fetchCcLiveInDueToday,
  wholeDaysBetween,
  carriedOverDays,
  filterCcLiveIn,
  dayStart,
} from "../src/lib/ccLiveIn";
import type { CcLiveInEntry } from "../src/data";

const NOW = new Date(2026, 8, 4, 12, 0, 0).getTime(); // Fri 4 Sep 2026 noon
const YESTERDAY = NOW - 86400000;
const THREE_DAYS_AGO = NOW - 3 * 86400000;

function entry(addedAt: number, overrides: Partial<CcLiveInEntry> = {}): CcLiveInEntry {
  return {
    maidsCcId: "CC-1",
    name: "Lorna",
    nationality: "Filipino",
    age: 30,
    room: "Villa 3",
    visaExpiry: "2026-12-05",
    dueReason: "Visa expiring",
    addedAt,
    collected: false,
    ...overrides,
  };
}

describe("fetchCcLiveInDueToday", () => {
  it("returns a stable non-empty due list", () => {
    const list = fetchCcLiveInDueToday();
    expect(list.length).toBeGreaterThan(0);
    const ids = list.map((e) => e.maidsCcId);
    expect(new Set(ids).size).toBe(ids.length); // no dup ids in a single call
  });
});

describe("wholeDaysBetween / carriedOverDays", () => {
  it("counts whole calendar days", () => {
    expect(wholeDaysBetween(YESTERDAY, NOW)).toBe(1);
    expect(wholeDaysBetween(THREE_DAYS_AGO, NOW)).toBe(3);
    expect(wholeDaysBetween(NOW, NOW)).toBe(0);
  });

  it("marks carried-over only when added on a previous day", () => {
    expect(carriedOverDays(NOW, NOW)).toBeNull();
    expect(carriedOverDays(YESTERDAY, NOW)).toBe(1);
    expect(carriedOverDays(THREE_DAYS_AGO, NOW)).toBe(3);
  });
});

describe("filterCcLiveIn", () => {
  const items = [
    entry(NOW, { maidsCcId: "CC-today" }),
    entry(YESTERDAY, { maidsCcId: "CC-yest" }),
    entry(THREE_DAYS_AGO, { maidsCcId: "CC-3d" }),
  ];

  it("filters today", () => {
    expect(filterCcLiveIn(items, { kind: "today" }, NOW).map((i) => i.maidsCcId)).toEqual(["CC-today"]);
  });

  it("filters yesterday", () => {
    expect(filterCcLiveIn(items, { kind: "yesterday" }, NOW).map((i) => i.maidsCcId)).toEqual(["CC-yest"]);
  });

  it("filters last 7 days", () => {
    expect(filterCcLiveIn(items, { kind: "last7" }, NOW).map((i) => i.maidsCcId)).toEqual([
      "CC-today",
      "CC-yest",
      "CC-3d",
    ]);
  });

  it("filters a custom range", () => {
    const result = filterCcLiveIn(items, { kind: "custom", from: YESTERDAY, to: NOW }, NOW);
    expect(result.map((i) => i.maidsCcId)).toEqual(["CC-today", "CC-yest"]);
  });
});

describe("dayStart", () => {
  it("floors to local midnight", () => {
    expect(dayStart(NOW)).toBe(new Date(2026, 8, 4, 0, 0, 0).getTime());
  });
});
