import { describe, expect, it } from "vitest";
import { costsCsvFilename, serializeCostsCsv } from "@/lib/costsCsv";
import type { Cost, Vehicle } from "@/types/fuel";

const vehicles: Vehicle[] = [
  { id: "car", brand: "Škoda", model: "Fabia", year: 2004, initialOdometer: 1000 },
];

const costs: Cost[] = [
  { id: "c2", vehicleId: "car", date: "2026-03-05", amount: 55.5, category: "STK", note: "", odometer: null },
  { id: "c1", vehicleId: "car", date: "2026-01-02", amount: 20, category: "Parkovanie", note: "Centrum; garáž", odometer: null },
];

describe("costs CSV export", () => {
  it("exports date, vehicle, category, amount and note for every cost", () => {
    const csv = serializeCostsCsv(costs, vehicles);
    const lines = csv.replace(/^﻿/, "").trim().split("\r\n");
    expect(lines[0]).toBe("Dátum;Vozidlo;Kategória;Suma;Poznámka");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('2026-01-02;Škoda Fabia;Parkovanie;20,00;"Centrum; garáž"');
    expect(lines[2]).toBe("2026-03-05;Škoda Fabia;STK;55,50;");
  });

  it("starts with a BOM so Excel reads Slovak characters correctly", () => {
    expect(serializeCostsCsv(costs, vehicles).charCodeAt(0)).toBe(0xfeff);
  });

  it("sorts rows by date ascending", () => {
    const csv = serializeCostsCsv(costs, vehicles);
    expect(csv.indexOf("2026-01-02")).toBeLessThan(csv.indexOf("2026-03-05"));
  });

  it("escapes quotes and newlines inside notes", () => {
    const tricky: Cost[] = [
      { id: "c3", vehicleId: "car", date: "2026-02-01", amount: 10, category: "Údržba", note: 'povedal "ahoj"\njj', odometer: null },
    ];
    const csv = serializeCostsCsv(tricky, vehicles);
    expect(csv).toContain('"povedal ""ahoj""\njj"');
  });

  it("marks costs of unknown vehicles instead of crashing", () => {
    const csv = serializeCostsCsv([{ ...costs[0]!, vehicleId: "ghost" }], vehicles);
    expect(csv).toContain("Neznáme vozidlo");
  });

  it("exports an empty history as header only", () => {
    const csv = serializeCostsCsv([], vehicles);
    expect(csv.replace(/^﻿/, "").trim()).toBe("Dátum;Vozidlo;Kategória;Suma;Poznámka");
  });

  it("builds a safe filename from the vehicle name", () => {
    expect(costsCsvFilename(vehicles[0]!)).toBe("naklady_Skoda_Fabia.csv");
    expect(costsCsvFilename(null)).toBe("naklady.csv");
  });
});
