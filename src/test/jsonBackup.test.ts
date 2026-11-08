import { describe, expect, it } from "vitest";
import { parseJsonBackup, replaceFillUp, serializeJsonBackup } from "@/lib/jsonBackup";
import { summarizeVehicle } from "@/lib/fuelCalculations";
import type { AppState } from "@/types/fuel";

const vehicle = { id: "car", brand: "Škoda", model: "Fabia", year: 2004, initialOdometer: 1000 };
const state: AppState = {
  vehicles: [vehicle], selectedVehicleId: "car",
  fillUps: [
    { id: "first", vehicleId: "car", date: "2026-01-01", odometer: 1000, liters: 40, totalCost: 60, pricePerLiter: 1.5, fuelType: "Benzín", isFullTank: true },
    { id: "second", vehicleId: "car", date: "2026-01-10", odometer: 1500, liters: 35, totalCost: 52.5, pricePerLiter: 1.5, fuelType: "Benzín", isFullTank: true },
  ],
  costs: [{ id: "cost", vehicleId: "car", date: "2026-01-02", amount: 20, category: "Parkovanie", note: "Centrum", odometer: null }],
};

describe("JSON backup", () => {
  it("exports and restores every vehicle, fill-up, cost and selection", () => {
    expect(parseJsonBackup(serializeJsonBackup(state))).toEqual(state);
  });
  it("accepts an empty backup to restore an empty history", () => {
    const empty = { vehicles: [], fillUps: [], costs: [], selectedVehicleId: null };
    expect(parseJsonBackup(JSON.stringify(empty))).toEqual(empty);
  });
  it("supports older backups without costs", () => {
    expect(parseJsonBackup(JSON.stringify({ ...state, costs: undefined })).costs).toEqual([]);
  });
  it("rejects malformed JSON", () => {
    expect(() => parseJsonBackup("{broken")).toThrow();
  });
  it("rejects missing history instead of silently deleting it", () => {
    expect(() => parseJsonBackup(JSON.stringify({ vehicles: state.vehicles, selectedVehicleId: "car" }))).toThrow();
  });
  it("rejects records belonging to unknown vehicles", () => {
    expect(() => parseJsonBackup(JSON.stringify({ ...state, vehicles: [], selectedVehicleId: null }))).toThrow();
  });
  it("rejects duplicate record IDs", () => {
    expect(() => parseJsonBackup(JSON.stringify({ ...state, fillUps: [state.fillUps[0], state.fillUps[0]] }))).toThrow();
  });
  it("rejects impossible dates", () => {
    expect(() => parseJsonBackup(JSON.stringify({ ...state, fillUps: [{ ...state.fillUps[0], date: "2026-02-30" }] }))).toThrow();
  });
});

describe("fill-up editing", () => {
  it("updates original record without adding a new one and recalculates consumption", () => {
    const original = state.fillUps[1];
    if (!original) throw new Error("Missing test fill-up");
    const updated = replaceFillUp(state, original.id, { ...original, liters: 40, totalCost: 64, pricePerLiter: 1.6 });
    expect(updated.fillUps).toHaveLength(2);
    expect(updated.fillUps[1]).toMatchObject({ id: "second", vehicleId: "car", liters: 40, totalCost: 64 });
    expect(summarizeVehicle(vehicle, state.fillUps).averageConsumption).toBeCloseTo(7);
    expect(summarizeVehicle(vehicle, updated.fillUps).averageConsumption).toBe(8);
    expect(summarizeVehicle(vehicle, updated.fillUps).totalCost).toBe(124);
    expect(state.fillUps[1]?.liters).toBe(35);
  });
  it("recalculates when a full tank becomes a partial fill-up", () => {
    const original = state.fillUps[1];
    if (!original) throw new Error("Missing test fill-up");
    const updated = replaceFillUp(state, original.id, { ...original, isFullTank: false });
    expect(summarizeVehicle(vehicle, updated.fillUps).averageConsumption).toBeNull();
  });
});
import { replaceCost as _replaceCost } from "@/lib/jsonBackup";
describe("cost editing", () => {
  it("updates a cost in place and keeps id, vehicle and odometer", () => {
    const s = { vehicles: [], fillUps: [], selectedVehicleId: null,
      costs: [{ id: "c1", vehicleId: "v", date: "2025-01-01", amount: 20, category: "Údržba", note: "", odometer: 1000 }] };
    const r = _replaceCost(s, "c1", { date: "2025-02-02", amount: 55.5, category: "STK", note: "x" });
    expect(r.costs[0]).toEqual({ id: "c1", vehicleId: "v", date: "2025-02-02", amount: 55.5, category: "STK", note: "x", odometer: 1000 });
    expect(r.costs.reduce((t, c) => t + c.amount, 0)).toBe(55.5);
  });
});
