import { describe, it, expect } from "vitest";
import { computeGolden, type GoldenProfileRule } from "../src/lib/golden";
import type { Housemaid } from "../src/data";

function maid(overrides: Partial<Housemaid>): Housemaid {
  return {
    id: "m1", name: "X", nationality: "Filipino", age: 30, housemaidType: "MV", subType: "Normal MV",
    mobile: "", whatsapp: "", visaStartDate: "2025-01-01", visaExpiry: "2027-01-01",
    passportExpiry: "2030-01-01", passportNumber: "", arrivalDate: "2026-01-01",
    salary: 2000, wpsHistory: [], employmentHistory: [], complaints: [],
    isGoldenProfile: false, maidsCcId: "", currentStage: "Reception",
    ...overrides,
  };
}

const RULE: GoldenProfileRule = {
  nationalities: ["Filipino"],
  ageMin: 18,
  ageMax: 45,
  visaExpiryMonthsMin: 0,
  visaExpiryMonthsMax: 120,
  housemaidTypes: ["MV", "CC live-in", "CC live-out", "Cleaner"],
};

const NOW = Date.UTC(2026, 8, 4); // 4 Sep 2026

describe("computeGolden", () => {
  it("Filipina under 45 with in-range visa is golden", () => {
    expect(computeGolden(maid({}), RULE, NOW)).toBe(true);
  });

  it("non-Filipina is not golden", () => {
    expect(computeGolden(maid({ nationality: "Kenyan" }), RULE, NOW)).toBe(false);
  });

  it("over 45 is not golden", () => {
    expect(computeGolden(maid({ age: 50 }), RULE, NOW)).toBe(false);
  });

  it("visa outside the month range is not golden", () => {
    const tight = { ...RULE, visaExpiryMonthsMin: 3, visaExpiryMonthsMax: 24 };
    expect(computeGolden(maid({ visaExpiry: "2026-10-01" }), tight, NOW)).toBe(false); // ~1 month out
    expect(computeGolden(maid({ visaExpiry: "2027-06-01" }), tight, NOW)).toBe(true); // ~9 months
  });

  it("type not in the list is not golden", () => {
    const mvOnly: GoldenProfileRule = { ...RULE, housemaidTypes: ["MV"] };
    expect(computeGolden(maid({ housemaidType: "Cleaner" }), mvOnly, NOW)).toBe(false);
  });
});
