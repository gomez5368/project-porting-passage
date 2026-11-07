import { describe, expect, it } from "vitest";
import { buildConsumptionSegments } from "@/lib/fuelCalculations";
import { parseSpotrebaImport } from "@/lib/importSpotreba";
import type { FillUp } from "@/types/fuel";

const f = (id: string, odometer: number, liters: number, isFullTank: boolean): FillUp => ({
  id, vehicleId: "v", date: "2025-01-01", odometer, liters, totalCost: 1, pricePerLiter: 1, fuelType: "Benzín", isFullTank,
});

describe("consumption", () => {
  it("counts only between two full-tank fill-ups, summing partials", () => {
    const s = buildConsumptionSegments([f("a", 1000, 40, true), f("b", 1200, 10, false), f("c", 1500, 20, true)]);
    expect(s).toHaveLength(1);
    expect(s[0]!.consumption).toBeCloseTo(6);
  });
});

describe("spotreba.sk import", () => {
  it("parses a tab-separated table with Slovak decimals", () => {
    const r = parseSpotrebaImport("Dátum\tStav tachometra\tLitre\tCena\n01.10.2025\t125 340\t45,20\t72,90");
    expect(r.records[0]).toMatchObject({ date: "2025-10-01", odometer: 125340, liters: 45.2, totalCost: 72.9 });
  });
});

import { convertBackup } from "@/lib/spotrebaBackup";
describe("Spotreba .db3 backup", () => {
  const cars = [{ source: 2, pk: 1, name: "ŠKODA  Fabia 1.2", year: 2004, fuel: "benzín", startOdometer: 168648 }];
  it("links fill-ups to the car, maps partial fill-ups and skips broken rows", () => {
    const r = convertBackup(cars, [
      { carSource: 2, carPk: 1, odometer: 168688, price: 20, volume: 15.05, timestamp: 1420506000, partial: 1 },
      { carSource: 2, carPk: 1, odometer: 0, price: 10, volume: 6.9, timestamp: 1521745425, partial: 0 },
      { carSource: 9, carPk: 9, odometer: 5000, price: 10, volume: 5, timestamp: 1521745425, partial: 0 },
    ]);
    const v = r.vehicles[0]!;
    expect(v).toMatchObject({ brand: "Škoda", model: "Fabia 1.2", initialOdometer: 168648, skipped: 1 });
    expect(v.fillUps).toHaveLength(1);
    expect(v.fillUps[0]).toMatchObject({ date: "2015-01-06", liters: 15.05, totalCost: 20, isFullTank: false });
    expect(r.orphanFillUps).toBe(1);
  });
});

describe("Spotreba .db3 costs", () => {
  it("imports costs as positive amounts linked to the car", () => {
    const r = convertBackup(
      [{ source: 2, pk: 1, name: "ŠKODA Fabia", year: 2004, fuel: "benzín", startOdometer: 1000 }], [],
      [{ carSource: 2, carPk: 1, price: -20, timestamp: 1420120941, type: "Parkovanie", notes: "Parkovné Senica", odometer: 168648 },
       { carSource: 2, carPk: 1, price: -14, timestamp: 1420120941, type: "Dialnica", notes: null, odometer: 0 }]);
    expect(r.vehicles[0]!.costs[0]).toMatchObject({ amount: 20, category: "Parkovanie", note: "Parkovné Senica", odometer: 168648 });
    expect(r.vehicles[0]!.costs[1]).toMatchObject({ amount: 14, category: "Diaľnica", odometer: null });
  });
});
