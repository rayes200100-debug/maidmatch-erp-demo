export interface WorkingHours { startHour: number; endHour: number; }

export function activeHoursBetween(startMs: number, endMs: number, wh: WorkingHours, daysOff: number[]): number {
  if (endMs <= startMs) return 0;
  let total = 0;
  // step through the span in hour increments (sufficient for prototype precision)
  let t = startMs;
  while (t < endMs) {
    const d = new Date(t);
    const hour = d.getHours();
    const day = d.getDay();
    const isWorkingDay = !daysOff.includes(day);
    if (isWorkingDay && hour >= wh.startHour && hour < wh.endHour) {
      const hourStart = t;
      const hourEnd = Math.min(hourStart + 3600_000, endMs);
      total += Math.max(0, hourEnd - hourStart) / 3600_000;
    }
    t += 3600_000;
  }
  return total;
}

export function avgActiveHours(spans: [number, number][], wh: WorkingHours, daysOff: number[]): number {
  if (spans.length === 0) return 0;
  const sum = spans.reduce((acc, [s, e]) => acc + activeHoursBetween(s, e, wh, daysOff), 0);
  return sum / spans.length;
}

/**
 * Human "time in queue" counting only configured working hours/days — an overnight or a
 * weekend must not make a maid look neglected. Returns e.g. "3h 20m", "1d 4h", or "42m".
 */
export function activeTimeInQueue(startMs: number, endMs: number, wh: WorkingHours, daysOff: number[]): string {
  const hours = activeHoursBetween(startMs, endMs, wh, daysOff);
  const totalMinutes = Math.floor(hours * 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const days = Math.floor(totalMinutes / (wh.endHour - wh.startHour) / 60);
  const rem = totalMinutes - days * (wh.endHour - wh.startHour) * 60;
  const h = Math.floor(rem / 60);
  const m = rem % 60;
  if (days > 0) return `${days}d ${h}h`;
  return `${h}h ${m}m`;
}
