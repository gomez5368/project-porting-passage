import { describe, expect, it } from "vitest";
import { estimateTankLevel } from "@/lib/tankEstimate";
import { needsBackupReminder } from "@/lib/backupReminder";
import { monthlyTotals } from "@/lib/monthlyTotals";
import type { Cost, FillUp } from "@/types/fuel";

const prev: FillUp = { id: "p", vehicleId: "v", date: "2025-01-01", odometer: 1000, liters: 40, totalCost: 60, pricePerLiter: 1.5, fuelType: "Benzín", isFullTank: true };

describe("estimateTankLevel", () => {
  it("full 50 l tank, 500 km at 6 l/100, +30 l → 100 %", () => {
    expect(estimateTankLevel({ capacity: 50, previous: prev, averageConsumption: 6, odometer: 1500, liters: 30 })).toBe(100);
  });
  it("full 50 l tank, 500 km at 6 l/100, +10 l → 60 %", () => {
    expect(estimateTankLevel({ capacity: 50, previous: prev, averageConsumption: 6, odometer: 1500, liters: 10 })).toBe(60);
  });
  it("no capacity → no estimate", () => {
    expect(estimateTankLevel({ capacity: undefined, previous: prev, averageConsumption: 6, odometer: 1500, liters: 10 })).toBeNull();
  });
});

describe("needsBackupReminder", () => {
  const now = new Date("2025-03-01T00:00:00Z");
  it("reminds when never backed up", () => expect(needsBackupReminder(null, now, true)).toBe(true));
  it("reminds after 30 days", () => expect(needsBackupReminder("2025-01-30T00:00:00Z", now, true)).toBe(true));
  it("quiet within 29 days", () => expect(needsBackupReminder("2025-01-31T00:00:00Z", now, true)).toBe(false));
  it("quiet without data", () => expect(needsBackupReminder(null, now, false)).toBe(false));
});

it("monthlyTotals sums fuel and other costs per month", () => {
  const c: Cost = { id: "c", vehicleId: "v", date: "2025-01-20", amount: 100, category: "Servis", note: "", odometer: null };
  expect(monthlyTotals([prev, { ...prev, id: "q", date: "2025-02-02" }], [c])).toEqual([
    { month: "2025-01", fuel: 60, other: 100 }, { month: "2025-02", fuel: 60, other: 0 },
  ]);
});
