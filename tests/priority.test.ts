import { describe, it, expect } from "vitest";
import { sortRetraction, type SortableMaid } from "../src/lib/priority";

function m(createdAt: number, nationality: string, isGoldenProfile = false): SortableMaid {
  return { createdAt, nationality, isGoldenProfile };
}

describe("sortRetraction", () => {
  const order = (arr: SortableMaid[]) => arr.map((x) => x.createdAt);

  it("FIFO keeps created order", () => {
    const a = m(1, "Filipino"), b = m(2, "Ethiopian"), c = m(3, "Filipino");
    expect(order(sortRetraction([c, a, b], "FIFO"))).toEqual([1, 2, 3]);
  });

  it("LIFO reverses created order", () => {
    const a = m(1, "Filipino"), b = m(2, "Ethiopian"), c = m(3, "Filipino");
    expect(order(sortRetraction([a, b, c], "LIFO"))).toEqual([3, 2, 1]);
  });

  it("FILIPINA puts Filipina first (stable within group)", () => {
    const a = m(1, "Ethiopian"), b = m(2, "Filipino"), c = m(3, "Kenyan"), d = m(4, "Filipino");
    expect(sortRetraction([a, b, c, d], "FILIPINA").map((x) => x.nationality))
      .toEqual(["Filipino", "Filipino", "Ethiopian", "Kenyan"]);
  });

  it("GOLDEN puts golden profiles first", () => {
    const a = m(1, "Ethiopian"), b = m(2, "Filipino", true), c = m(3, "Kenyan");
    expect(sortRetraction([a, b, c], "GOLDEN").map((x) => x.isGoldenProfile))
      .toEqual([true, false, false]);
  });
});
