import type { CcLiveInDuePayload, CcLiveInEntry } from "../data";

/**
 * Mock of the "CC live-in due today" API. The real system calls maids.cc hourly and
 * receives the list of CC live-in maids due to go to the retractor today. This returns
 * a deterministic set so the panel is exercisable with no credentials. See
 * `DEPENDENCY-REGISTER.md` RD-9 for what the real endpoint must provide.
 */
export function fetchCcLiveInDueToday(): CcLiveInDuePayload[] {
  return [
    { maidsCcId: "CC-1501", name: "Lorna Del Rosario", nationality: "Filipino", age: 30, room: "Villa 3 · Room 12", visaExpiry: "2026-12-05", dueReason: "Visa expiring within 60 days" },
    { maidsCcId: "CC-1502", name: "Marta Teshome", nationality: "Ethiopian", age: 28, room: "Villa 3 · Room 08", visaExpiry: "2026-12-20", dueReason: "Employer contract ends today" },
    { maidsCcId: "CC-1503", name: "Wambui Njeri", nationality: "Kenyan", age: 34, room: "Villa 2 · Room 04", visaExpiry: "2027-01-15", dueReason: "Returned from leave — reassign" },
    { maidsCcId: "CC-1504", name: "Rosa Bonifacio", nationality: "Filipino", age: 26, room: "Villa 3 · Room 21", visaExpiry: "2026-12-28", dueReason: "Visa expiring within 60 days" },
    { maidsCcId: "CC-1505", name: "Almaz Bekele", nationality: "Ethiopian", age: 32, room: "Villa 2 · Room 09", visaExpiry: "2027-02-01", dueReason: "Employer contract ends today" },
    { maidsCcId: "CC-1506", name: "Grace Atieno", nationality: "Kenyan", age: 29, room: "Villa 3 · Room 17", visaExpiry: "2027-01-10", dueReason: "Scheduled retraction slot" },
    { maidsCcId: "CC-1507", name: "Carmen Reyes", nationality: "Filipino", age: 31, room: "Villa 2 · Room 03", visaExpiry: "2027-03-05", dueReason: "Scheduled retraction slot" },
  ];
}

/** Start of the local calendar day for a timestamp. */
export function dayStart(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Whole calendar days between two timestamps (a older than b). */
export function wholeDaysBetween(a: number, b: number): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((dayStart(b) - dayStart(a)) / msPerDay);
}

/** Days since `addedAt` if it was before today, otherwise null (not carried over). */
export function carriedOverDays(addedAt: number, now: number): number | null {
  const days = wholeDaysBetween(addedAt, now);
  return days > 0 ? days : null;
}

export type CcLiveInFilter =
  | { kind: "today" }
  | { kind: "yesterday" }
  | { kind: "last7" }
  | { kind: "custom"; from: number; to: number };

/**
 * Filter CC live-in entries by when they were added to the panel. "Custom" is an
 * inclusive calendar-day range on `addedAt`.
 */
export function filterCcLiveIn(items: CcLiveInEntry[], filter: CcLiveInFilter, now: number): CcLiveInEntry[] {
  const day = (ts: number) => dayStart(ts);
  switch (filter.kind) {
    case "today":
      return items.filter((i) => day(i.addedAt) === day(now));
    case "yesterday":
      return items.filter((i) => day(i.addedAt) === day(now) - 86400000);
    case "last7":
      return items.filter((i) => day(i.addedAt) >= day(now) - 6 * 86400000);
    case "custom":
      return items.filter((i) => day(i.addedAt) >= day(filter.from) && day(i.addedAt) <= day(filter.to));
  }
}
