export const FUEL_TYPES = ['Benzín', 'Diesel', 'LPG', 'EV'] as const;

export type FuelType = (typeof FUEL_TYPES)[number];

export type Vehicle = {
  id: string;
  brand: string;
  model: string;
  year: number;
  initialOdometer: number;
};

export type FillUp = {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number;
  liters: number;
  totalCost: number;
  pricePerLiter: number;
  fuelType: FuelType;
  isFullTank: boolean;
  tankLevelPercent?: number;
};

export const COST_CATEGORIES = ['Údržba', 'Výmena oleja', 'Pneumatiky', 'Poistka', 'STK', 'Dane a poplatky', 'Diaľnica', 'Parkovanie', 'Ostatné'] as const;

export type Cost = {
  id: string;
  vehicleId: string;
  date: string;
  amount: number;
  category: string;
  note: string;
  odometer: number | null;
};

export type AppState = {
  vehicles: Vehicle[];
  fillUps: FillUp[];
  costs: Cost[];
  selectedVehicleId: string | null;
};
