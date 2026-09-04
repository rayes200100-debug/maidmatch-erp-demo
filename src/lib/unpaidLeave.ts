/**
 * Unpaid-leave-due rule (see Batch #2 / SPEC BR): the due date is computed from the
 * maid's arrival date by day of month.
 *
 * - Arrival day 1–20  → due on the last day of the *next* month.
 * - Arrival day 21–31 → due on the last day of the month *two* months ahead.
 *
 * Examples: arrival 12 Sep → 31 Oct; arrival 24 Sep → 30 Nov.
 */
function fmtLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function unpaidLeaveDueDate(arrivalDate: string): string {
  const d = new Date(`${arrivalDate}T00:00:00`);
  const day = d.getDate();
  const offset = day <= 20 ? 2 : 3;
  const due = new Date(d.getFullYear(), d.getMonth() + offset, 0);
  return fmtLocal(due);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from a reference point (default now) until the given ISO date (can be negative). */
export function daysUntil(dateStr: string, now = Date.now()): number {
  const target = new Date(`${dateStr}T00:00:00`).getTime();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / DAY_MS);
}
