export type PriorityAlgorithm = "FIFO" | "LIFO" | "FILIPINA" | "GOLDEN";

export interface SortableMaid {
  createdAt: number;
  nationality: string;
  isGoldenProfile: boolean;
  isCcLiveIn: boolean;
}

/**
 * Order the retraction queue. Base order is the configured algorithm (FIFO by default =
 * reception order). When `liveInPriority` is on, CC live-in maids jump ahead of the rest,
 * preserving the base order within each group (stable sort). Rules are layered here, never
 * in the retractor's own screen.
 */
export function sortRetraction(tasks: SortableMaid[], algorithm: PriorityAlgorithm, liveInPriority = false): SortableMaid[] {
  const copy = [...tasks];
  copy.sort(byAlgorithm(algorithm));
  if (liveInPriority) {
    copy.sort((a, b) => Number(b.isCcLiveIn) - Number(a.isCcLiveIn));
  }
  return copy;
}

function byAlgorithm(algorithm: PriorityAlgorithm): (a: SortableMaid, b: SortableMaid) => number {
  switch (algorithm) {
    case "FIFO":
      return (a, b) => a.createdAt - b.createdAt;
    case "LIFO":
      return (a, b) => b.createdAt - a.createdAt;
    case "FILIPINA": {
      const isFil = (x: SortableMaid) => /filipin/i.test(x.nationality);
      return (a, b) => Number(isFil(b)) - Number(isFil(a)) || a.createdAt - b.createdAt;
    }
    case "GOLDEN":
      return (a, b) => Number(b.isGoldenProfile) - Number(a.isGoldenProfile) || a.createdAt - b.createdAt;
  }
}
