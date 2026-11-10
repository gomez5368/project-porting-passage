import { describe, expect, it } from "vitest";
import { mergeImport } from "@/lib/backupMerge";
import { convertBackup } from "@/lib/spotrebaBackup";
import { summarizeVehicle } from "@/lib/fuelCalculations";
import type { AppState } from "@/types/fuel";

const car = { source: 1, pk: 1, name: "ŠKODA Fabia", year: 2004, fuel: "benzín", startOdometer: 1000 };
const day = (d: number) => Date.UTC(2025, 0, d, 12) / 1000;
const gas = (d: number, odometer: number, volume: number, partial: number, tankStatus: number | null) =>
  ({ carSource: 1, carPk: 1, odometer, price: volume * 1.5, volume, timestamp: day(d), partial, tankStatus });

// Partial flag says "full" (0) on every row; only the tank percentages tell the truth.
const backup = convertBackup([car], [gas(1, 1000, 40, 0, 100), gas(2, 1200, 10, 0, 75), gas(3, 1500, 20, 0, 100)]);
const items = backup.vehicles.map((v) => ({
  vehicle: { brand: v.brand, model: v.model, year: v.year, initialOdometer: v.initialOdometer },
  fillUps: v.fillUps,
  costs: v.costs,
}));
let n = 0;
const id = () => `id${++n}`;

// The same fill-ups as already saved by an older import, before percentages were read.
function savedWithoutPercents(): AppState {
  const { state } = mergeImport({ vehicles: [], fillUps: [], costs: [], selectedVehicleId: null }, items, id);
  return { ...state, fillUps: state.fillUps.map(({ tankLevelPercent: _drop, ...f }) => ({ ...f, isFullTank: true })) };
}

describe("db3 tank percentage import", () => {
  it("reads the tank percentage and treats only 100 % as a full tank", () => {
    const fills = backup.vehicles[0]!.fillUps;
    expect(fills.map((f) => f.tankLevelPercent)).toEqual([100, 75, 100]);
    expect(fills.map((f) => f.isFullTank)).toEqual([true, false, true]);
  });

  it("fills percentages into existing fill-ups without adding duplicates", () => {
    const before = savedWithoutPercents();
    const { state, stats } = mergeImport(before, items, id);
    expect(state.fillUps).toHaveLength(3);
    expect(state.vehicles).toHaveLength(1);
    expect(stats[0]?.percentsFilled).toBe(3);
    expect(stats[0]?.newFillUps).toHaveLength(0);
    expect(state.fillUps.map((f) => f.id)).toEqual(before.fillUps.map((f) => f.id));
    expect(state.fillUps.map((f) => f.tankLevelPercent)).toEqual([100, 75, 100]);
  });

  it("does not overwrite a percentage the user already set", () => {
    const before = savedWithoutPercents();
    before.fillUps[1] = { ...before.fillUps[1]!, tankLevelPercent: 90 };
    const { state, stats } = mergeImport(before, items, id);
    expect(state.fillUps[1]?.tankLevelPercent).toBe(90);
    expect(stats[0]?.percentsFilled).toBe(2);
  });

  it("recalculates consumption between 100 % fills after the percentages arrive", () => {
    const before = savedWithoutPercents();
    const vehicle = before.vehicles[0]!;
    // Treated as all-full: 10 l / 200 km = 5 and 20 l / 300 km.
    expect(summarizeVehicle(vehicle, before.fillUps).segments).toHaveLength(2);
    const { state } = mergeImport(before, items, id);
    const summary = summarizeVehicle(vehicle, state.fillUps);
    expect(summary.segments).toHaveLength(1);
    expect(summary.averageConsumption).toBe(6); // (10 + 20) l / 500 km
  });

  it("running the import twice changes nothing the second time", () => {
    const once = mergeImport(savedWithoutPercents(), items, id).state;
    const twice = mergeImport(once, items, id);
    expect(twice.state.fillUps).toEqual(once.fillUps);
    expect(twice.stats[0]?.percentsFilled).toBe(0);
  });
});
