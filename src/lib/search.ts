export interface SearchFields {
  name: string;
  maidsCcId: string;
  mobile: string;
  whatsapp: string;
  passportNumber: string;
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr = new Array<number>(b.length + 1);
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

/** Lowercase + strip non-alphanumerics (for phone/ERP/passport comparison). */
function compact(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function nameTokenScore(name: string, token: string): number {
  const n = name.toLowerCase();
  const words = n.split(/\s+/).filter(Boolean);
  let best = 0;
  for (const w of words) {
    if (w === token) best = Math.max(best, 5);
    else if (w.startsWith(token)) best = Math.max(best, 4);
    else if (w.includes(token)) best = Math.max(best, 3);
    else if (token.length >= 3 && w.length >= 3 && levenshtein(w, token) <= 2) best = Math.max(best, 1.5);
  }
  if (n.includes(token)) best = Math.max(best, 2.5);
  return best;
}

function fieldScore(field: string, token: string): number {
  const f = compact(field);
  const t = compact(token);
  if (!t || !f) return 0;
  if (f === t) return 5;
  if (f.includes(t)) return 2;
  return 0;
}

function scoreFor(item: SearchFields, tokens: string[]): number {
  let total = 0;
  for (const raw of tokens) {
    const t = raw.toLowerCase();
    total += nameTokenScore(item.name, t);
    total += fieldScore(item.maidsCcId, t) * 0.8;
    total += fieldScore(item.mobile, t) * 0.7;
    total += fieldScore(item.whatsapp, t) * 0.7;
    total += fieldScore(item.passportNumber, t) * 0.9;
  }
  return total;
}

/**
 * Forgiving search across name, maids.cc ERP ID, mobile, WhatsApp and passport
 * number. A maid matches if any query token matches any field (substring, prefix,
 * exact, or a small edit-distance on name tokens). Results are ranked by relevance.
 */
export function searchByFields<T extends SearchFields>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  const tokens = q.split(/\s+/).filter(Boolean);
  return items
    .map((item) => ({ item, score: scoreFor(item, tokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .map((x) => x.item);
}
