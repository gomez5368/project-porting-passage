import { describe, expect, it } from "vitest";
import { plannedServiceState, reminderAlerts } from "@/lib/reminders";
import { parseJsonBackup, serializeJsonBackup } from "@/lib/jsonBackup";
import type { AppState, VehicleReminders } from "@/types/fuel";

const date = "2026-11-14";
describe("planned maintenance", () => {
  it("warns by date without a kilometer target", () => {
    expect(plannedServiceState({ id: "a", title: "Rozvody", date: "2026-12-14" }, 100000, date).status).toBe("soon");
    expect(plannedServiceState({ id: "a", title: "Rozvody", date: "2026-12-15" }, 100000, date).status).toBe("ok");
  });
  it("warns by kilometers without a date", () => {
    expect(plannedServiceState({ id: "b", title: "Brzdy", odometer: 110000 }, 108501, date).status).toBe("soon");
    expect(plannedServiceState({ id: "b", title: "Brzdy", odometer: 110000 }, 108500, date).status).toBe("ok");
  });
  it("uses whichever of date or kilometers is reached first", () => {
    expect(plannedServiceState({ id: "a", title: "Brzdy", date: "2027-12-01", odometer: 110000 }, 110001, date).status).toBe("overdue");
    expect(plannedServiceState({ id: "a", title: "Brzdy", date: "2026-11-13", odometer: 200000 }, 100000, date).status).toBe("overdue");
  });
  it("includes approaching planned services in the overview", () => {
    const r: VehicleReminders = { vehicleId: "car", deadlines: {}, oilIntervalKm: 15000, plannedServices: [{ id: "a", title: "Rozvody", date: "2026-11-20" }] };
    expect(reminderAlerts(r, 100000, date).map((a) => a.key)).toEqual(["service-a"]);
    expect(reminderAlerts({ ...r, plannedServices: [] }, 100000, date)).toEqual([]);
  });
  const state: AppState = { vehicles: [{ id: "car", brand: "Škoda", model: "Fabia", year: 2005, initialOdometer: 0 }], fillUps: [], costs: [], selectedVehicleId: "car", reminders: [{ vehicleId: "car", deadlines: {}, oilIntervalKm: 15000, plannedServices: [{ id: "a", title: "Rozvody", date: "2027-01-01", odometer: 200000 }] }] };
  it("preserves both maintenance targets in JSON backups", () => expect(parseJsonBackup(serializeJsonBackup(state))).toEqual(state));
  it("rejects a reminder without date or kilometers", () => {
    expect(() => serializeJsonBackup({ ...state, reminders: [{ vehicleId: "car", deadlines: {}, oilIntervalKm: 15000, plannedServices: [{ id: "a", title: "Rozvody" }] }] })).toThrow();
  });
});