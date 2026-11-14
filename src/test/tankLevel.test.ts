import { describe, expect, it } from "vitest";
import { buildConsumptionSegments, isFullTankFillUp } from "@/lib/fuelCalculations";
import { serializeFillUpsCsv } from "@/lib/fillUpsCsv";
import { parseJsonBackup, serializeJsonBackup } from "@/lib/jsonBackup";
import type { AppState, FillUp } from "@/types/fuel";

const vehicle = { id: "v", brand: "Škoda", model: "Fabia", year: 2004, initialOdometer: 1000 };
const fill = (id: string, odometer: number, liters: number, percent: number): FillUp => ({
  id, vehicleId: "v", date: "2026-11-09", odometer, liters, totalCost: 30, pricePerLiter: 1.5,
  fuelType: "Benzín", isFullTank: true, tankLevelPercent: percent,
});
const state: AppState = { vehicles: [vehicle], fillUps: [fill("a", 1000, 40, 75)], costs: [], selectedVehicleId: "v" };

describe("tank level", () => {
  it("does not treat 75 percent as full even with a legacy true flag", () => {
    expect(isFullTankFillUp(fill("a", 1000, 40, 75))).toBe(false);
    expect(buildConsumptionSegments([fill("a", 1000, 40, 100), fill("b", 1200, 10, 75)])).toEqual([]);
  });
  it("sums partial fill-ups until a 100 percent tank", () => {
    const segments = buildConsumptionSegments([fill("a", 1000, 40, 100), fill("b", 1200, 10, 75), fill("c", 1500, 20, 100)]);
    expect(segments).toHaveLength(1);
    expect(segments[0]?.consumption).toBe(6);
  });
  it("keeps percentages through JSON backup and restore", () => {
    expect(parseJsonBackup(serializeJsonBackup(state)).fillUps[0]?.tankLevelPercent).toBe(75);
  });
  it("rejects percentages outside 0 to 100", () => {
    for (const percent of [-1, 101]) expect(() => serializeJsonBackup({ ...state, fillUps: [fill("a", 1000, 40, percent)] })).toThrow();
  });
  it("exports tank history with vehicle, prices, liters and percentage", () => {
    expect(serializeFillUpsCsv(state.fillUps, state.vehicles)).toContain("2026-11-09;Škoda Fabia;Benzín;;1000;40,00;30,00;1,500;Nie;75");
  });
  it("keeps old full-tank records working without a percentage", () => {
    expect(isFullTankFillUp({ isFullTank: true })).toBe(true);
    expect(isFullTankFillUp({ isFullTank: false })).toBe(false);
  });
});