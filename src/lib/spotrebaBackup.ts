// Converts rows from the Spotreba.sk mobile app backup (SQLite .db3) into app records.
// Only the Cars and Gases tables are read; account/settings tables are never touched.
import type { FillUp, FuelType, Vehicle } from "@/types/fuel";

export type BackupCarRow = { source: number; pk: number; name: string; year: number | null; fuel: string | null; startOdometer: number | null };
export type BackupGasRow = { carSource: number; carPk: number; odometer: number; price: number; volume: number; timestamp: number; partial: number };

export type BackupVehicle = Omit<Vehicle, "id"> & { fillUps: Omit<FillUp, "id" | "vehicleId">[]; skipped: number };
export type BackupResult = { vehicles: BackupVehicle[]; orphanFillUps: number };

export function mapFuel(raw: string | null): FuelType {
  const n = (raw ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (n.includes("diesel") || n.includes("nafta")) return "Diesel";
  if (n.includes("lpg")) return "LPG";
  if (n.includes("elektr") || n === "ev") return "EV";
  return "Benzín";
}

export function splitCarName(name: string): { brand: string; model: string } {
  const parts = name.trim().split(/\s+/);
  const brand = parts[0] ?? "";
  const pretty = brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
  return { brand: pretty || "Auto", model: parts.slice(1).join(" ") || "—" };
}

function isoDate(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function convertBackup(cars: BackupCarRow[], gases: BackupGasRow[]): BackupResult {
  const byKey = new Map<string, BackupVehicle>();
  const result: BackupVehicle[] = [];
  for (const car of cars) {
    const { brand, model } = splitCarName(car.name ?? "");
    const v: BackupVehicle = {
      brand, model,
      year: car.year && car.year > 1900 ? car.year : new Date().getFullYear(),
      initialOdometer: Math.max(0, Math.round(car.startOdometer ?? 0)),
      fillUps: [], skipped: 0,
    };
    byKey.set(`${car.source}|${car.pk}`, v);
    result.push(v);
  }
  const fuelByKey = new Map(cars.map((c) => [`${c.source}|${c.pk}`, mapFuel(c.fuel)]));
  let orphanFillUps = 0;
  for (const g of gases) {
    const key = `${g.carSource}|${g.carPk}`;
    const v = byKey.get(key);
    if (!v) { orphanFillUps++; continue; }
    // Obviously broken rows (zero volume/price or odometer below the car's start) would corrupt consumption.
    if (!(g.volume > 0) || !(g.price > 0) || !(g.odometer >= v.initialOdometer) || !(g.timestamp > 0)) { v.skipped++; continue; }
    const liters = Math.round(g.volume * 100) / 100;
    const totalCost = Math.round(g.price * 100) / 100;
    v.fillUps.push({
      date: isoDate(g.timestamp),
      odometer: Math.round(g.odometer),
      liters, totalCost,
      pricePerLiter: Math.round((totalCost / liters) * 1000) / 1000,
      fuelType: fuelByKey.get(key) ?? "Benzín",
      isFullTank: g.partial === 0,
    });
  }
  for (const v of result) v.fillUps.sort((a, b) => a.date.localeCompare(b.date) || a.odometer - b.odometer);
  return { vehicles: result, orphanFillUps };
}

/** Reads a .db3 file in the browser. The file never leaves the device. */
export async function readSpotrebaBackup(file: File): Promise<BackupResult> {
  const { default: initSqlJs } = await import("sql.js");
  // Served from public/wasm so the binary never enters the server bundle.
  const SQL = await initSqlJs({ locateFile: () => "/wasm/sql-wasm.wasm" });
  const db = new SQL.Database(new Uint8Array(await file.arrayBuffer()));
  try {
    const tables = new Set((db.exec("SELECT name FROM sqlite_master WHERE type='table'")[0]?.values ?? []).map((r) => String(r[0])));
    if (!tables.has("Cars") || !tables.has("Gases")) throw new Error("not-spotreba");
    const rows = (sql: string) => {
      const res = db.exec(sql)[0];
      return res ? res.values : [];
    };
    const cars = rows("SELECT Z_SOURCE, Z_PK, ZNAME, Z_YEAR, Z_FUEL, ZSTARTODOMETER FROM Cars").map((r) => ({
      source: Number(r[0]), pk: Number(r[1]), name: String(r[2] ?? ""), year: r[3] == null ? null : Number(r[3]),
      fuel: r[4] == null ? null : String(r[4]), startOdometer: r[5] == null ? null : Number(r[5]),
    }));
    const gases = rows("SELECT ZCAR_SOURCE, Z1CONSUMPIONS, ZODOMETER, ZPRICE, ZVOLUME, ZTIMESTAMP, ZPARTIALFILLUP FROM Gases").map((r) => ({
      carSource: Number(r[0]), carPk: Number(r[1]), odometer: Number(r[2]), price: Number(r[3]),
      volume: Number(r[4]), timestamp: Number(r[5]), partial: Number(r[6] ?? 0),
    }));
    return convertBackup(cars, gases);
  } finally {
    db.close();
  }
}
