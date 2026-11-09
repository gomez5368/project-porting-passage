import type { FillUp, Vehicle } from '@/types/fuel';

export type ConsumptionSegment = {
  fillUpId: string;
  date: string;
  liters: number;
  km: number;
  consumption: number;
};

export type VehicleSummary = {
  averageConsumption: number | null;
  totalCost: number;
  totalKm: number;
  costPerKm: number | null;
  segments: ConsumptionSegment[];
};

export function sortFillUps(fillUps: FillUp[]): FillUp[] {
  return [...fillUps].sort((a, b) => {
    if (a.odometer !== b.odometer) return a.odometer - b.odometer;
    return a.date.localeCompare(b.date);
  });
}

export function isFullTankFillUp(fillUp: Pick<FillUp, 'isFullTank' | 'tankLevelPercent'>): boolean {
  return fillUp.tankLevelPercent === undefined ? fillUp.isFullTank : fillUp.tankLevelPercent === 100;
}

export function buildConsumptionSegments(fillUps: FillUp[]): ConsumptionSegment[] {
  const segments: ConsumptionSegment[] = [];
  let litersSinceLastFull = 0;
  let lastFull: FillUp | null = null;

  for (const fillUp of sortFillUps(fillUps)) {
    litersSinceLastFull += fillUp.liters;
    if (!isFullTankFillUp(fillUp)) continue;

    if (lastFull && fillUp.odometer > lastFull.odometer) {
      const km = fillUp.odometer - lastFull.odometer;
      segments.push({
        fillUpId: fillUp.id,
        date: fillUp.date,
        liters: litersSinceLastFull,
        km,
        consumption: (litersSinceLastFull / km) * 100,
      });
    }

    lastFull = fillUp;
    litersSinceLastFull = 0;
  }

  return segments;
}

export function summarizeVehicle(vehicle: Vehicle, fillUps: FillUp[]): VehicleSummary {
  const segments = buildConsumptionSegments(fillUps);
  const totalLiters = segments.reduce((sum, s) => sum + s.liters, 0);
  const segmentKm = segments.reduce((sum, s) => sum + s.km, 0);
  const totalCost = fillUps.reduce((sum, f) => sum + f.totalCost, 0);

  const totalKm = Math.max(0, getLatestOdometer(vehicle, fillUps) - vehicle.initialOdometer);

  return {
    averageConsumption: segmentKm > 0 ? (totalLiters / segmentKm) * 100 : null,
    totalCost,
    totalKm,
    costPerKm: totalKm > 0 ? totalCost / totalKm : null,
    segments,
  };
}

export function getLatestOdometer(vehicle: Vehicle, fillUps: FillUp[]): number {
  return fillUps.reduce((max, f) => Math.max(max, f.odometer), vehicle.initialOdometer);
}

const numberFormatter = (decimals: number) =>
  new Intl.NumberFormat('sk-SK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

export function formatNumber(value: number, decimals = 0): string {
  return numberFormatter(decimals).format(value);
}

export function formatCurrency(value: number, decimals = 2): string {
  return `${formatNumber(value, decimals)} €`;
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${Number(day)}. ${Number(month)}. ${year}`;
}

export function formatShortDate(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${Number(day)}.${Number(month)}.`;
}
