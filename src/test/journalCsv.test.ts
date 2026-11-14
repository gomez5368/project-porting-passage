import { describe, expect, it } from "vitest";
import { journalCsvFileName, serializeJournalCsv } from "@/lib/journalCsv";
import type { Cost, FillUp, Vehicle } from "@/types/fuel";

const vehicle: Vehicle = { id: "v", brand: "Škoda", model: "Fabia", year: 2018, initialOdometer: 100000 };
const fillUp: FillUp = {
  id: "f", vehicleId: "v", date: "2025-03-02", odometer: 145000, liters: 40.5, totalCost: 60.75,
  pricePerLiter: 1.5, fuelType: "Benzín", fuelGrade: "premium", isFullTank: false, tankLevelPercent: 78,
};
const cost: Cost = { id: "c", vehicleId: "v", date: "2025-03-01", amount: 1950.84, category: "Údržba", note: "Kontrola; brzdy", odometer: 144800 };
const costNoKm: Cost = { id: "c2", vehicleId: "v", date: "2025-03-03", amount: 12, category: "Parkovanie", note: "", odometer: null };

describe("serializeJournalCsv", () => {
  const csv = serializeJournalCsv([fillUp], [cost, costNoKm], [vehicle]);
  const lines = csv.split("\r\n");

  it("starts with a UTF-8 BOM and the requested header", () => {
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(lines[0]).toBe("\uFEFFDátum;Vozidlo;Kategória;Typ paliva (Normal/Premium);Stav tachometra (km);Množstvo (l);Percentá nádrže (%);Celková suma (€);Poznámka");
  });

  it("writes fuel and cost rows with semicolons, decimal commas and 9 columns", () => {
    expect(lines[1]).toBe('2025-03-01;Škoda Fabia;Údržba;;144800;;;1950,84;"Kontrola; brzdy"');
    expect(lines[2]).toBe("2025-03-02;Škoda Fabia;Palivo;Premium;145000;40,50;78;60,75;");
    expect(lines[3]).toBe("2025-03-03;Škoda Fabia;Parkovanie;;;;;12,00;");
    for (const line of lines.slice(1, 4)) expect(line.split(";").length).toBeGreaterThanOrEqual(9);
  });

  it("orders all records chronologically, oldest first", () => {
    expect(lines.slice(1, 4).map((l) => l.slice(0, 10))).toEqual(["2025-03-01", "2025-03-02", "2025-03-03"]);
  });

  it("exports only records belonging to the selected vehicle", () => {
    const rapid: Vehicle = { ...vehicle, id: "other", brand: "Škoda", model: "Rapid" };
    const filtered = serializeJournalCsv(
      [fillUp, { ...fillUp, id: "other-fill", vehicleId: "other" }],
      [cost, { ...cost, id: "other-cost", vehicleId: "other" }],
      [vehicle, rapid],
      { vehicleId: "other" },
    );
    expect(filtered).toContain("Škoda Rapid");
    expect(filtered).not.toContain("Škoda Fabia");
    expect(filtered.trimEnd().split("\r\n")).toHaveLength(3);
  });

  it("includes only records inside the selected date range, including both boundaries", () => {
    const filtered = serializeJournalCsv([fillUp], [cost, costNoKm], [vehicle], {
      dateFrom: "2025-03-02",
      dateTo: "2025-03-03",
    });
    const dates = filtered.trimEnd().split("\r\n").slice(1).map((line) => line.slice(0, 10));
    expect(dates).toEqual(["2025-03-02", "2025-03-03"]);
  });

  it("exports fuel only when content is fuel", () => {
    const filtered = serializeJournalCsv([fillUp], [cost, costNoKm], [vehicle], { content: "fuel" });
    const lines = filtered.trimEnd().split("\r\n");
    expect(lines.slice(1)).toEqual(["2025-03-02;Škoda Fabia;Palivo;Premium;145000;40,50;78;60,75;"]);
    expect(filtered).not.toContain("Údržba");
    expect(filtered).not.toContain("Parkovanie");
  });

  it("exports other costs only when content is costs", () => {
    const filtered = serializeJournalCsv([fillUp], [cost, costNoKm], [vehicle], { content: "costs" });
    const lines = filtered.trimEnd().split("\r\n");
    expect(lines.slice(1)).toEqual([
      '2025-03-01;Škoda Fabia;Údržba;;144800;;;1950,84;"Kontrola; brzdy"',
      "2025-03-03;Škoda Fabia;Parkovanie;;;;;12,00;",
    ]);
    expect(filtered).not.toContain("Palivo");
  });

  it("combines the content choice with the vehicle and date filters", () => {
    const rapid: Vehicle = { ...vehicle, id: "other", brand: "Škoda", model: "Rapid" };
    const filtered = serializeJournalCsv(
      [fillUp, { ...fillUp, id: "other-fill", vehicleId: "other", date: "2025-03-05" }],
      [cost, { ...cost, id: "other-cost", vehicleId: "other" }],
      [vehicle, rapid],
      { content: "fuel", vehicleId: "other" },
    );
    expect(filtered.trimEnd().split("\r\n").slice(1)).toEqual([
      "2025-03-05;Škoda Rapid;Palivo;Premium;145000;40,50;78;60,75;",
    ]);
  });

  it("names the downloaded file after the chosen content", () => {
    expect(journalCsvFileName("all")).toBe("spotreba_export.csv");
    expect(journalCsvFileName("fuel")).toBe("spotreba_palivo.csv");
    expect(journalCsvFileName("costs")).toBe("spotreba_naklady.csv");
  });
});
