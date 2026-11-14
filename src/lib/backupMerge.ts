// Merges vehicles, fill-ups and costs read from a Spotreba .db3 backup into the saved state.
// Matching records are never duplicated; missing tank percentages and stations are filled from the backup.
import { fillUpKey } from '@/lib/importSpotreba';
import type { AppState, Cost, FillUp, Vehicle } from '@/types/fuel';

type NewFillUp = Omit<FillUp, 'id' | 'vehicleId'>;
type NewCost = Omit<Cost, 'id' | 'vehicleId'>;

export type ImportItem = { vehicle: Omit<Vehicle, 'id'>; fillUps: NewFillUp[]; costs?: NewCost[] };
export type ImportItemStats = {
  existing: boolean;
  newFillUps: NewFillUp[];
  duplicateFillUps: number;
  newCosts: NewCost[];
  percentsFilled: number;
  stationsFilled: number;
};

export const costKey = (c: Pick<Cost, 'date' | 'amount' | 'category'>) => `${c.date}|${c.amount.toFixed(2)}|${c.category}`;

export function mergeImport(
  prev: AppState,
  items: ImportItem[],
  makeId: () => string,
): { state: AppState; stats: ImportItemStats[] } {
  const vehicles = [...prev.vehicles];
  const fillUps = [...prev.fillUps];
  const costs = [...prev.costs];
  const stats: ImportItemStats[] = [];

  for (const item of items) {
    const existing = vehicles.find(
      (v) => v.brand === item.vehicle.brand && v.model === item.vehicle.model && v.year === item.vehicle.year,
    );
    const target = existing ?? { ...item.vehicle, id: makeId() };
    if (!existing) vehicles.push(target);
    else if (existing.tankCapacity === undefined && item.vehicle.tankCapacity !== undefined) {
      const i = vehicles.indexOf(existing);
      vehicles[i] = { ...existing, tankCapacity: item.vehicle.tankCapacity };
    }

    // Index of this vehicle's saved fill-ups by key, so a match can be updated in place.
    const indexByKey = new Map<string, number>();
    fillUps.forEach((f, i) => {
      if (f.vehicleId === target.id && !indexByKey.has(fillUpKey(f))) indexByKey.set(fillUpKey(f), i);
    });

    const itemStats: ImportItemStats = { existing: !!existing, newFillUps: [], duplicateFillUps: 0, newCosts: [], percentsFilled: 0, stationsFilled: 0 };
    for (const f of item.fillUps) {
      const key = fillUpKey(f);
      const index = indexByKey.get(key);
      if (index !== undefined) {
        itemStats.duplicateFillUps++;
        const saved = fillUps[index];
        // Only fill missing imported details; never overwrite values the user entered or edited.
        if (saved) {
          const fillPercent = saved.tankLevelPercent === undefined && f.tankLevelPercent !== undefined;
          const fillStation = !saved.station?.trim() && !!f.station?.trim();
          if (fillPercent || fillStation) {
            fillUps[index] = {
              ...saved,
              ...(fillPercent ? { tankLevelPercent: f.tankLevelPercent } : {}),
              ...(fillStation ? { station: f.station } : {}),
            };
            if (fillPercent) itemStats.percentsFilled++;
            if (fillStation) itemStats.stationsFilled++;
          }
        }
        continue;
      }
      indexByKey.set(key, fillUps.length);
      fillUps.push({ ...f, id: makeId(), vehicleId: target.id });
      itemStats.newFillUps.push(f);
    }

    const cKeys = new Set(costs.filter((c) => c.vehicleId === target.id).map(costKey));
    for (const c of item.costs ?? []) {
      if (cKeys.has(costKey(c))) continue;
      cKeys.add(costKey(c));
      costs.push({ ...c, id: makeId(), vehicleId: target.id });
      itemStats.newCosts.push(c);
    }
    stats.push(itemStats);
  }

  return {
    state: { ...prev, vehicles, fillUps, costs, selectedVehicleId: prev.selectedVehicleId ?? vehicles[0]?.id ?? null },
    stats,
  };
}
