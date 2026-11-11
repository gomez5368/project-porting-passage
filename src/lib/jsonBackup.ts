import { z } from "zod";
import { FUEL_TYPES, type AppState, type FillUp, type Cost } from "@/types/fuel";

const id = z.string().min(1);
const nonNegative = z.number().finite().nonnegative();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => {
  const parsed = new Date(`${v}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === v;
});
const stateSchema = z.object({
  vehicles: z.array(z.object({ id, brand: z.string().min(1), model: z.string().min(1), year: z.number().int(), initialOdometer: nonNegative, tankCapacity: z.number().finite().min(0).max(1000).optional() })),
  fillUps: z.array(z.object({
    id, vehicleId: id, date, odometer: nonNegative.int(), liters: z.number().finite().positive(),
    totalCost: nonNegative, pricePerLiter: nonNegative, fuelType: z.enum(FUEL_TYPES), isFullTank: z.boolean(),
    tankLevelPercent: z.number().finite().min(0).max(100).optional(),
  })),
  costs: z.array(z.object({
    id, vehicleId: id, date, amount: nonNegative, category: z.string().min(1), note: z.string(), odometer: nonNegative.nullable(),
  })).default([]),
  selectedVehicleId: id.nullable(),
}).superRefine((state, ctx) => {
  const vehicleIds = new Set(state.vehicles.map((v) => v.id));
  for (const list of [state.vehicles, state.fillUps, state.costs]) {
    if (new Set(list.map((item) => item.id)).size !== list.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicitné identifikátory." });
    }
  }
  if (state.selectedVehicleId !== null && !vehicleIds.has(state.selectedVehicleId)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Neznáme vybrané vozidlo." });
  }
  if ([...state.fillUps, ...state.costs].some((item) => !vehicleIds.has(item.vehicleId))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Záznam bez vozidla." });
  }
});

export function validateBackup(value: unknown): AppState {
  return stateSchema.parse(value);
}

export function parseJsonBackup(text: string): AppState {
  return validateBackup(JSON.parse(text.replace(/^\uFEFF/, "")));
}

export function serializeJsonBackup(state: AppState): string {
  return JSON.stringify(validateBackup(state), null, 2);
}

export function replaceFillUp(state: AppState, fillUpId: string, changes: Omit<FillUp, "id" | "vehicleId">): AppState {
  return { ...state, fillUps: state.fillUps.map((f) => f.id === fillUpId ? { ...changes, id: f.id, vehicleId: f.vehicleId } : f) };
}
export function replaceCost(state: AppState, costId: string, changes: Pick<Cost, "date" | "amount" | "category" | "note">): AppState {
  return { ...state, costs: state.costs.map((c) => c.id === costId ? { ...c, ...changes, id: c.id, vehicleId: c.vehicleId } : c) };
}
