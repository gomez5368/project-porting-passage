import type { FillUp, Vehicle } from "@/types/fuel";
import { isFullTankFillUp, sortFillUps } from "@/lib/fuelCalculations";

function cell(value: string): string {
  return /[;"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function serializeFillUpsCsv(fillUps: FillUp[], vehicles: Vehicle[]): string {
  const names = new Map(vehicles.map((v) => [v.id, `${v.brand} ${v.model}`]));
  const number = (value: number, digits: number) => value.toFixed(digits).replace(".", ",");
  const rows = sortFillUps(fillUps).map((f) => [
    f.date, names.get(f.vehicleId) ?? "Neznáme vozidlo", f.fuelType, String(f.odometer),
    number(f.liters, 2), number(f.totalCost, 2), number(f.pricePerLiter, 3),
    isFullTankFillUp(f) ? "Áno" : "Nie", f.tankLevelPercent === undefined ? "" : String(f.tankLevelPercent).replace(".", ","),
  ].map(cell).join(";"));
  return `\uFEFF${["Dátum;Vozidlo;Palivo;Tachometer (km);Litre;Suma (€);Cena za liter (€);Plná nádrž;Nádrž po natankovaní (%)", ...rows].join("\r\n")}\r\n`;
}