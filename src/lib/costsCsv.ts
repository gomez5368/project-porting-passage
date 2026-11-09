import type { Cost, Vehicle } from "@/types/fuel";

function csvCell(value: string): string {
  if (/[;"\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function formatAmount(amount: number): string {
  return amount.toFixed(2).replace(".", ",");
}

export function serializeCostsCsv(costs: Cost[], vehicles: Vehicle[]): string {
  const nameById = new Map(vehicles.map((v) => [v.id, `${v.brand} ${v.model}`.trim()]));
  const sorted = [...costs].sort((a, b) => a.date.localeCompare(b.date));
  const lines = [
    "Dátum;Vozidlo;Kategória;Suma;Poznámka",
    ...sorted.map((c) =>
      [
        csvCell(c.date),
        csvCell(nameById.get(c.vehicleId) ?? "Neznáme vozidlo"),
        csvCell(c.category),
        formatAmount(c.amount),
        csvCell(c.note),
      ].join(";"),
    ),
  ];
  return `﻿${lines.join("\r\n")}\r\n`;
}

export function costsCsvFilename(vehicle: Vehicle | null): string {
  const slug = vehicle
    ? `${vehicle.brand}_${vehicle.model}`
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
    : "";
  return slug ? `naklady_${slug}.csv` : "naklady.csv";
}
