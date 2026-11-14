export const VEHICLE_FUEL_TYPES = ['Benzín', 'Nafta', 'LPG', 'Elektro'] as const;
/** Includes legacy labels so existing fill-ups and backups remain valid. */
export const FUEL_TYPES = [...VEHICLE_FUEL_TYPES, 'Diesel', 'EV'] as const;
export const FUEL_GRADES = ['normal', 'premium'] as const;

export type VehicleFuelType = (typeof VEHICLE_FUEL_TYPES)[number];
export type FuelType = (typeof FUEL_TYPES)[number];
export type FuelGrade = (typeof FUEL_GRADES)[number];

export type Vehicle = {
  id: string;
  brand: string;
  model: string;
  year: number;
  initialOdometer: number;
  /** Tank capacity in liters (0–1000). */
  tankCapacity?: number | undefined;
  /** Engine power in kW (optional). */
  enginePowerKw?: number | undefined;
  /** Preferred fuel for new fill-ups; optional for vehicles saved before this setting existed. */
  fuelType?: VehicleFuelType | undefined;
  /** Compressed local JPEG, included in JSON backups. */
  photo?: string | undefined;
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
  /** Normal or Plus/Premium for petrol and diesel; absent on older records and other fuels. */
  fuelGrade?: FuelGrade | undefined;
  isFullTank: boolean;
  tankLevelPercent?: number | undefined;
  /** Optional station name and address, imported from Spotreba or entered manually. */
  station?: string | undefined;
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
