import { describe, expect, it } from "vitest";
import { serializeFillUpsCsv } from "@/lib/fillUpsCsv";
import { isPremiumEligible, normalizeVehicleFuelType, vehicleFuelType } from "@/lib/fuelTypes";
import { parseJsonBackup, serializeJsonBackup } from "@/lib/jsonBackup";
import type { AppState, FillUp, Vehicle } from "@/types/fuel";

const vehicle: Vehicle = { id: "car", brand: "Škoda", model: "Octavia", year: 2020, initialOdometer: 1000, fuelType: "Nafta" };
const fillUp: FillUp = {
  id: "fill", vehicleId: "car", date: "2026-11-14", odometer: 1200, liters: 40,
  totalCost: 64, pricePerLiter: 1.6, fuelType: "Nafta", fuelGrade: "premium", isFullTank: true,
};
const state: AppState = { vehicles: [vehicle], fillUps: [fillUp], costs: [], selectedVehicleId: "car" };

describe("vehicle fuel types", () => {
  it("offers premium only for petrol and diesel", () => {
    expect(isPremiumEligible("Benzín")).toBe(true);
    expect(isPremiumEligible("Nafta")).toBe(true);
    expect(isPremiumEligible("LPG")).toBe(false);
    expect(isPremiumEligible("Elektro")).toBe(false);
  });

  it("keeps legacy Diesel and EV records readable with the new labels", () => {
    expect(normalizeVehicleFuelType("Diesel")).toBe("Nafta");
    expect(normalizeVehicleFuelType("EV")).toBe("Elektro");
    expect(vehicleFuelType({ ...vehicle, fuelType: undefined }, [{ ...fillUp, fuelType: "Diesel" }])).toBe("Nafta");
  });

  it("stores Nafta and Plus/Premium through JSON backup and restore", () => {
    const restored = parseJsonBackup(serializeJsonBackup(state));
    expect(restored.vehicles[0]?.fuelType).toBe("Nafta");
    expect(restored.fillUps[0]?.fuelGrade).toBe("premium");
  });

  it("exports the Normal/Premium variant in the fill-up CSV", () => {
    expect(serializeFillUpsCsv(state.fillUps, state.vehicles)).toContain("Nafta;Plus / Premium;1200");
    expect(serializeFillUpsCsv([{ ...fillUp, fuelGrade: "normal" }], state.vehicles)).toContain("Nafta;Normal;1200");
  });
});
