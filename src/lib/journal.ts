import type { Cost, FillUp } from "@/types/fuel";

export type JournalEntry =
  | { kind: "fuel"; id: string; date: string; odometer: number | null; fillUp: FillUp }
  | { kind: "cost"; id: string; date: string; odometer: number | null; cost: Cost };

/** Fill-ups and costs in one list: highest odometer first; entries without km or equal km fall back to newest date. */
export function buildJournal(fillUps: FillUp[], costs: Cost[]): JournalEntry[] {
  const entries: JournalEntry[] = [
    ...fillUps.map((f) => ({ kind: "fuel" as const, id: f.id, date: f.date, odometer: f.odometer, fillUp: f })),
    ...costs.map((c) => ({ kind: "cost" as const, id: c.id, date: c.date, odometer: c.odometer && c.odometer > 0 ? c.odometer : null, cost: c })),
  ];
  return entries.sort((a, b) => {
    if (a.odometer !== null && b.odometer !== null && a.odometer !== b.odometer) return b.odometer - a.odometer;
    return b.date.localeCompare(a.date);
  });
}
