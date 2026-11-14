import type { Cost, FillUp, FuelGrade, Vehicle } from "@/types/fuel";

/** Slovak Excel: semicolon separated, decimal comma, UTF-8 BOM. */
const HEADER = "Dátum;Vozidlo;Kategória;Typ paliva (Normal/Premium);Stav tachometra (km);Množstvo (l);Percentá nádrže (%);Celková suma (€);Poznámka";

function cell(value: string): string {
  return /[;"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Decimal comma so Excel reads litres, prices and consumption as numbers. */
function decimal(value: number, digits: number): string {
  return value.toFixed(digits).replace(".", ",");
}

function fuelGradeLabel(grade: FuelGrade | undefined): string {
  if (grade === "premium") return "Premium";
  if (grade === "normal") return "Normal";
  return "";
}

type Row = { date: string; odometer: number | null; cells: string[] };

/** Fill-ups and costs in one chronologically ordered sheet (oldest record first). */
export function serializeJournalCsv(fillUps: FillUp[], costs: Cost[], vehicles: Vehicle[]): string {
  const names = new Map(vehicles.map((v) => [v.id, `${v.brand} ${v.model}`.trim()]));
  const name = (vehicleId: string) => names.get(vehicleId) ?? "Neznáme vozidlo";

  const rows: Row[] = [
    ...fillUps.map((f) => ({
      date: f.date,
      odometer: f.odometer,
      cells: [
        f.date,
        name(f.vehicleId),
        "Palivo",
        fuelGradeLabel(f.fuelGrade),
        String(f.odometer),
        decimal(f.liters, 2),
        f.tankLevelPercent === undefined ? "" : String(Math.round(f.tankLevelPercent)),
        decimal(f.totalCost, 2),
        "",
      ],
    })),
    ...costs.map((c) => ({
      date: c.date,
      odometer: c.odometer,
      cells: [
        c.date,
        name(c.vehicleId),
        c.category,
        "",
        c.odometer === null ? "" : String(c.odometer),
        "",
        "",
        decimal(c.amount, 2),
        c.note,
      ],
    })),
  ];

  rows.sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return (a.odometer ?? -1) - (b.odometer ?? -1);
  });

  const lines = [HEADER, ...rows.map((r) => r.cells.map(cell).join(";"))];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}
