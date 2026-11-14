import { isFullTankFillUp, sortFillUps } from "@/lib/fuelCalculations";
import type { FillUp } from "@/types/fuel";

/** Odhad % nádrže po natankovaní: zvyšok z minulého tankovania − spotrebované palivo + natankované litre. */
export function estimateTankLevel(input: {
  capacity: number | undefined; previous: FillUp | undefined; averageConsumption: number | null;
  odometer: number; liters: number;
}): number | null {
  const { capacity, previous, averageConsumption, odometer, liters } = input;
  if (!capacity || capacity <= 0 || !previous || averageConsumption === null) return null;
  if (!Number.isFinite(odometer) || !Number.isFinite(liters) || liters <= 0 || odometer < previous.odometer) return null;
  const prevLevel = previous.tankLevelPercent ?? (isFullTankFillUp(previous) ? 100 : undefined);
  if (prevLevel === undefined) return null;
  const remaining = Math.max(0, (capacity * prevLevel) / 100 - ((odometer - previous.odometer) * averageConsumption) / 100);
  return Math.round(Math.min(100, Math.max(0, ((remaining + liters) / capacity) * 100)));
}

export function previousFillUp(fillUps: FillUp[], odometer: number, excludeId?: string): FillUp | undefined {
  return sortFillUps(fillUps).filter((f) => f.id !== excludeId && f.odometer <= odometer).at(-1);
}
