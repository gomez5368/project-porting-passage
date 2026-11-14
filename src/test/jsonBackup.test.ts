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
  it("preserves vehicle photos in a complete JSON round trip", () => {
    const photo = "data:image/jpeg;base64,/9j/2Q==";
    const withPhoto = { ...state, vehicles: [{ ...vehicle, photo }] };
    expect(parseJsonBackup(serializeJsonBackup(withPhoto))).toEqual(withPhoto);
  });
  it("rejects active or external photo content", () => {
    for (const photo of ['data:image/svg+xml;base64,PHN2Zz4=', 'https://example.com/car.jpg']) {
      expect(() => parseJsonBackup(JSON.stringify({ ...state, vehicles: [{ ...vehicle, photo }] }))).toThrow();
    }
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
import { removeVehicle as _removeVehicle } from "@/lib/jsonBackup";
describe("vehicle deletion", () => {
  const s = {
    vehicles: [{ id: "a", brand: "Škoda", model: "Fabia", year: 2010, initialOdometer: 0 }, { id: "b", brand: "Škoda", model: "Rapid", year: 2015, initialOdometer: 0 }],
    fillUps: [{ id: "f1", vehicleId: "a", date: "2025-01-01", odometer: 100, liters: 30, pricePerLiter: 1.6, totalPrice: 48, isFullTank: true }, { id: "f2", vehicleId: "b", date: "2025-01-01", odometer: 100, liters: 30, pricePerLiter: 1.6, totalPrice: 48, isFullTank: true }],
    costs: [{ id: "c1", vehicleId: "a", date: "2025-01-01", amount: 20, category: "STK", note: "" }, { id: "c2", vehicleId: "b", date: "2025-01-01", amount: 30, category: "STK", note: "" }],
    selectedVehicleId: "a",
  };
  it("removes the vehicle with its fill-ups and costs and selects another car", () => {
    const r = _removeVehicle(s as never, "a");
    expect(r.vehicles.map((v) => v.id)).toEqual(["b"]);
    expect(r.fillUps.map((f) => f.id)).toEqual(["f2"]);
    expect(r.costs.map((c) => c.id)).toEqual(["c2"]);
    expect(r.selectedVehicleId).toBe("b");
  });
  it("keeps the selection when another car is deleted", () => {
    expect(_removeVehicle(s as never, "b").selectedVehicleId).toBe("a");
  });
});
