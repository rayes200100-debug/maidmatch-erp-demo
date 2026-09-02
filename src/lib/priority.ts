export type PriorityAlgorithm = "FIFO" | "LIFO" | "FILIPINA" | "GOLDEN";

export interface SortableMaid {
  createdAt: number;
  nationality: string;
  isGoldenProfile: boolean;
}

export function sortRetraction(tasks: SortableMaid[], algorithm: PriorityAlgorithm): SortableMaid[] {
  const copy = [...tasks];
  switch (algorithm) {
    case "FIFO": return copy.sort((a, b) => a.createdAt - b.createdAt);
    case "LIFO": return copy.sort((a, b) => b.createdAt - a.createdAt);
    case "FILIPINA": {
      const isFil = (x: SortableMaid) => /filipin/i.test(x.nationality);
      return copy.sort((a, b) => Number(isFil(b)) - Number(isFil(a)) || a.createdAt - b.createdAt);
    }
    case "GOLDEN":
      return copy.sort((a, b) => Number(b.isGoldenProfile) - Number(a.isGoldenProfile) || a.createdAt - b.createdAt);
  }
}
