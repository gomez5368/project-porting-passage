export const FUEL_TYPES = ['Benzín', 'Diesel', 'LPG', 'EV'] as const;

export type FuelType = (typeof FUEL_TYPES)[number];

export type Vehicle = {
  id: string;
  brand: string;
  model: string;
  year: number;
  initialOdometer: number;
  /** Tank capacity in liters (0–1000). */
  tankCapacity?: number | undefined;
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
  tankLevelPercent?: number | undefined;
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

export const DEADLINE_TYPES = ['stk', 'ek', 'pzp', 'havarijne', 'dialnicna'] as const;
export type DeadlineType = (typeof DEADLINE_TYPES)[number];

/** Per-vehicle deadlines (expiry dates) and oil-change interval. */
export type VehicleReminders = {
  vehicleId: string;
  deadlines: { [K in DeadlineType]?: string | undefined };
  oilLastOdometer?: number | undefined;
  oilIntervalKm: number;
};

export type AppState = {
  vehicles: Vehicle[];
  fillUps: FillUp[];
  costs: Cost[];
  /** Optional so older saved data and backups without reminders stay valid. */
  reminders?: VehicleReminders[] | undefined;
  selectedVehicleId: string | null;
};
