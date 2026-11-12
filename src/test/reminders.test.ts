import { describe, expect, it } from "vitest";
import { currentOdometer, daysUntil, deadlineStatus, oilState, reminderAlerts } from "@/lib/reminders";
import { parseJsonBackup, removeVehicle, serializeJsonBackup } from "@/lib/jsonBackup";
import type { AppState, VehicleReminders } from "@/types/fuel";

const today = "2026-11-12";
const vehicle = { id: "car", brand: "Škoda", model: "Fabia", year: 2004, initialOdometer: 1000 };
const fill = (id: string, odometer: number) => ({ id, vehicleId: "car", date: "2026-01-01", odometer, liters: 40, totalCost: 60, pricePerLiter: 1.5, fuelType: "Benzín" as const, isFullTank: true });

describe("deadlines", () => {
  it("counts days left until expiry", () => {
    expect(daysUntil("2026-12-12", today)).toBe(30);
    expect(daysUntil("2026-11-11", today)).toBe(-1);
  });
  it("is green with more than 30 days left", () => expect(deadlineStatus(31)).toBe("ok"));
  it("is orange with 30 days or fewer left", () => {
    expect(deadlineStatus(30)).toBe("soon");
    expect(deadlineStatus(0)).toBe("soon");
  });
  it("is red after expiry", () => expect(deadlineStatus(-1)).toBe("overdue"));
});

describe("oil change", () => {
  const r: VehicleReminders = { vehicleId: "car", deadlines: {}, oilLastOdometer: 100000, oilIntervalKm: 15000 };
  it("uses the highest odometer from the vehicle's fill-ups", () => {
    expect(currentOdometer(vehicle, [fill("a", 5000), fill("b", 9000), { ...fill("c", 99999), vehicleId: "other" }])).toBe(9000);
  });
  it("computes km left and progress", () => {
    expect(oilState(r, 106000)).toMatchObject({ nextAt: 115000, remainingKm: 9000, status: "ok", progress: 0.4 });
  });
  it("turns orange with less than 1 500 km left", () => {
    expect(oilState(r, 113500)?.status).toBe("ok");
    expect(oilState(r, 113501)?.status).toBe("soon");
  });
  it("turns red once the interval is exceeded", () => expect(oilState(r, 115001)?.status).toBe("overdue"));
});

describe("overview banner", () => {
  it("lists only deadlines within 30 days and oil under 1 500 km", () => {
    const r: VehicleReminders = { vehicleId: "car", deadlines: { stk: "2026-12-01", pzp: "2027-06-01" }, oilLastOdometer: 0, oilIntervalKm: 15000 };
    expect(reminderAlerts(r, 14000, today).map((a) => a.key)).toEqual(["stk", "oil"]);
    expect(reminderAlerts(r, 10000, "2026-10-01")).toEqual([]);
  });
});

describe("reminders in JSON backup", () => {
  const state: AppState = {
    vehicles: [vehicle], fillUps: [], costs: [], selectedVehicleId: "car",
    reminders: [{ vehicleId: "car", deadlines: { stk: "2027-03-01", dialnicna: "2027-01-31" }, oilLastOdometer: 120000, oilIntervalKm: 10000 }],
  };
  it("exports and restores deadlines and oil settings", () => {
    expect(parseJsonBackup(serializeJsonBackup(state))).toEqual(state);
  });
  it("rejects reminders for an unknown vehicle", () => {
    expect(() => parseJsonBackup(JSON.stringify({ ...state, reminders: [{ ...state.reminders![0], vehicleId: "x" }] }))).toThrow();
  });
  it("removes a vehicle's reminders when the vehicle is deleted", () => {
    expect(removeVehicle(state, "car").reminders).toEqual([]);
  });
});
