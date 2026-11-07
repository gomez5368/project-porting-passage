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
    expect(s[0].consumption).toBeCloseTo(6);
  });
});

describe("spotreba.sk import", () => {
  it("parses a tab-separated table with Slovak decimals", () => {
    const r = parseSpotrebaImport("Dátum\tStav tachometra\tLitre\tCena\n01.10.2025\t125 340\t45,20\t72,90");
    expect(r.records[0]).toMatchObject({ date: "2025-10-01", odometer: 125340, liters: 45.2, totalCost: 72.9 });
  });
});
