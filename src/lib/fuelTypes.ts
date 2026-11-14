import { VEHICLE_FUEL_TYPES, type FillUp, type FuelType, type Vehicle, type VehicleFuelType } from "@/types/fuel";

export function normalizeVehicleFuelType(fuelType: FuelType): VehicleFuelType {
  if (fuelType === "Diesel") return "Nafta";
  if (fuelType === "EV") return "Elektro";
  return fuelType;
}

export function isPremiumEligible(fuelType: FuelType): boolean {
  return fuelType === "Benzín" || fuelType === "Nafta" || fuelType === "Diesel";
}

/** Uses the saved vehicle preference, falling back to its most recent fill-up. */
export function vehicleFuelType(vehicle: Vehicle, fillUps: FillUp[]): VehicleFuelType {
  if (vehicle.fuelType && VEHICLE_FUEL_TYPES.includes(vehicle.fuelType)) return vehicle.fuelType;
  const latest = fillUps
    .filter((fillUp) => fillUp.vehicleId === vehicle.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.odometer - a.odometer)[0];
  return latest ? normalizeVehicleFuelType(latest.fuelType) : "Benzín";
}
