import type { Cost, FillUp } from "@/types/fuel";

export type MonthTotal = { month: string; fuel: number; other: number };

/** Súčty nákladov po mesiacoch (RRRR-MM), zoradené vzostupne, posledných `limit` mesiacov s údajmi. */
export function monthlyTotals(fillUps: FillUp[], costs: Cost[], limit = 12): MonthTotal[] {
  const map = new Map<string, MonthTotal>();
  const get = (m: string) => map.get(m) ?? (map.set(m, { month: m, fuel: 0, other: 0 }), map.get(m)!);
  for (const f of fillUps) get(f.date.slice(0, 7)).fuel += f.totalCost;
  for (const c of costs) get(c.date.slice(0, 7)).other += c.amount;
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-limit);
}
