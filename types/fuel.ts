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

export type AppState = {
  vehicles: Vehicle[];
  fillUps: FillUp[];
  selectedVehicleId: string | null;
};
