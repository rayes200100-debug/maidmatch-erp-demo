import type { Housemaid, HousemaidType } from "../data";

export interface GoldenProfileRule {
  nationalities: string[];
  ageMin: number;
  ageMax: number;
  visaExpiryMonthsMin: number;
  visaExpiryMonthsMax: number;
  housemaidTypes: HousemaidType[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_DAYS = 30.44;

/**
 * Golden-profile rule, computed from the editable System Configuration definition so the
 * flag changes without a release. Current working definition: Filipina, under 45.
 */
export function computeGolden(maid: Housemaid, rule: GoldenProfileRule, now = Date.now()): boolean {
  if (!rule.nationalities.includes(maid.nationality)) return false;
  if (maid.age < rule.ageMin || maid.age > rule.ageMax) return false;
  if (!rule.housemaidTypes.includes(maid.housemaidType)) return false;
  const expiry = new Date(`${maid.visaExpiry}T00:00:00`).getTime();
  const months = (expiry - now) / (MONTH_DAYS * DAY_MS);
  return months >= rule.visaExpiryMonthsMin && months <= rule.visaExpiryMonthsMax;
}
