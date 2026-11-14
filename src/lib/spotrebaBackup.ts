// Converts rows from the Spotreba.sk mobile app backup (SQLite .db3) into app records.
// Only the Cars and Gases tables are read; account/settings tables are never touched.
import type { Cost, FillUp, FuelType, Vehicle } from "@/types/fuel";

export type BackupCarRow = { source: number; pk: number; name: string; year: number | null; fuel: string | null; startOdometer: number | null; tankCapacity?: number | null };
export type BackupGasRow = { carSource: number; carPk: number; odometer: number; price: number; volume: number; timestamp: number; partial: number; tankStatus?: number | null; station?: string | null };

export type BackupCostRow = { carSource: number; carPk: number; price: number; timestamp: number; type: string | null; notes: string | null; odometer: number | null };
export type BackupVehicle = Omit<Vehicle, "id"> & { fillUps: Omit<FillUp, "id" | "vehicleId">[]; costs: Omit<Cost, "id" | "vehicleId">[]; skipped: number };
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

function stationLabel(name: unknown, address: unknown): string | null {
  const clean = (value: unknown) => String(value ?? "").replace(/\s+/g, " ").trim();
  const station = [clean(name), clean(address)].filter(Boolean).join(", ");
  return station ? station.slice(0, 200) : null;
}

/** Tank level after the fill-up (0–100 %). When present it decides "full" (only 100 %); otherwise the partial flag is used. */
function tankFields(g: BackupGasRow): { isFullTank: boolean; tankLevelPercent?: number } {
  const p = g.tankStatus;
  if (p == null || !Number.isFinite(p) || p < 0 || p > 100) return { isFullTank: g.partial === 0 };
  const percent = Math.round(p * 10) / 10;
  return { isFullTank: percent === 100, tankLevelPercent: percent };
}

export function convertBackup(cars: BackupCarRow[], gases: BackupGasRow[], costRows: BackupCostRow[] = []): BackupResult {
  const byKey = new Map<string, BackupVehicle>();
  const result: BackupVehicle[] = [];
  for (const car of cars) {
    const { brand, model } = splitCarName(car.name ?? "");
    const v: BackupVehicle = {
      brand, model,
      year: car.year && car.year > 1900 ? car.year : new Date().getFullYear(),
      initialOdometer: Math.max(0, Math.round(car.startOdometer ?? 0)),
      ...(car.tankCapacity && car.tankCapacity > 0 && car.tankCapacity <= 1000 ? { tankCapacity: car.tankCapacity } : {}),
      fillUps: [], costs: [], skipped: 0,
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
    const station = stationLabel(g.station, null);
    v.fillUps.push({
      date: isoDate(g.timestamp),
      odometer: Math.round(g.odometer),
      liters, totalCost,
      pricePerLiter: Math.round((totalCost / liters) * 1000) / 1000,
      fuelType: fuelByKey.get(key) ?? "Benzín",
      ...(station ? { station } : {}),
      ...tankFields(g),
    });
  }
  for (const c of costRows) {
    const v = byKey.get(`${c.carSource}|${c.carPk}`);
    const amount = Math.round(Math.abs(c.price) * 100) / 100;
    if (!v || !(amount > 0) || !(c.timestamp > 0)) continue;
    const type = (c.type ?? "").trim();
    v.costs.push({
      date: isoDate(c.timestamp), amount,
      category: type === "Dialnica" ? "Diaľnica" : type || "Ostatné",
      note: (c.notes ?? "").trim(),
      odometer: c.odometer && c.odometer > 0 ? Math.round(c.odometer) : null,
    });
  }
  for (const v of result) v.costs.sort((a, b) => a.date.localeCompare(b.date));
  for (const v of result) v.fillUps.sort((a, b) => a.date.localeCompare(b.date) || a.odometer - b.odometer);
  return { vehicles: result, orphanFillUps };
}

/** Reads a .db3 file in the browser. The file never leaves the device. */
export async function readSpotrebaBackup(file: File): Promise<BackupResult> {
  const { default: initSqlJs } = await import("sql.js");
  // Served from public/wasm so the binary never enters the server bundle.
  const wasmUrl = ["/wasm/sql-wasm", "wasm"].join("."); // public/wasm URL, fetched at runtime only
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const db = new SQL.Database(new Uint8Array(await file.arrayBuffer()));
  try {
    const tables = new Set((db.exec("SELECT name FROM sqlite_master WHERE type='table'")[0]?.values ?? []).map((r) => String(r[0])));
    if (!tables.has("Cars") || !tables.has("Gases")) throw new Error("not-spotreba");
    const rows = (sql: string) => {
      const res = db.exec(sql)[0];
      return res ? res.values : [];
    };
    const carColumns = new Set((db.exec("PRAGMA table_info(Cars)")[0]?.values ?? []).map((r) => String(r[1])));
    const capColumn = carColumns.has("Z_GAS_TANK") ? "Z_GAS_TANK" : "NULL";
    const cars = rows(`SELECT Z_SOURCE, Z_PK, ZNAME, Z_YEAR, Z_FUEL, ZSTARTODOMETER, ${capColumn} FROM Cars`).map((r) => ({
      tankCapacity: r[6] == null ? null : Number(r[6]),
      source: Number(r[0]), pk: Number(r[1]), name: String(r[2] ?? ""), year: r[3] == null ? null : Number(r[3]),
      fuel: r[4] == null ? null : String(r[4]), startOdometer: r[5] == null ? null : Number(r[5]),
    }));
    const gasColumns = new Set((db.exec("PRAGMA table_info(Gases)")[0]?.values ?? []).map((r) => String(r[1])));
    const tankColumn = gasColumns.has("Z_GAS_TANK_STATUS") ? "Z_GAS_TANK_STATUS" : "NULL";
    const stationColumn = gasColumns.has("Z_GAS_STATION") ? "Z_GAS_STATION" : "NULL";
    const stationNames = new Map<number, string>();
    // The backup stores either a catalogue station ID or a user's own station ID.
    if (tables.has("GasStations")) {
      for (const r of rows("SELECT ID, Name, Locality FROM GasStations")) {
        const label = stationLabel(r[1], r[2]);
        if (label) stationNames.set(Number(r[0]), label);
      }
    }
    if (tables.has("UserGasStations")) {
      for (const r of rows("SELECT Z_PK, ZNAME, ZADRESS FROM UserGasStations")) {
        const label = stationLabel(r[1], r[2]);
        if (label) stationNames.set(Number(r[0]), label);
      }
    }
    const gases = rows(`SELECT ZCAR_SOURCE, Z1CONSUMPIONS, ZODOMETER, ZPRICE, ZVOLUME, ZTIMESTAMP, ZPARTIALFILLUP, ${tankColumn}, ${stationColumn} FROM Gases`).map((r) => ({
      carSource: Number(r[0]), carPk: Number(r[1]), odometer: Number(r[2]), price: Number(r[3]),
      volume: Number(r[4]), timestamp: Number(r[5]), partial: Number(r[6] ?? 0),
      tankStatus: r[7] == null ? null : Number(r[7]),
      station: r[8] == null ? null : stationNames.get(Number(r[8])) ?? null,
    }));
    const costs = tables.has("Costs")
      ? rows("SELECT ZCAR_SOURCE, Z1COSTS, ZPRICE, ZTIMESTAMP, ZTYPE, ZNOTES, zODOMETER FROM Costs").map((r) => ({
          carSource: Number(r[0]), carPk: Number(r[1]), price: Number(r[2]), timestamp: Number(r[3]),
          type: r[4] == null ? null : String(r[4]), notes: r[5] == null ? null : String(r[5]), odometer: r[6] == null ? null : Number(r[6]),
        }))
      : [];
    return convertBackup(cars, gases, costs);
  } finally {
    db.close();
  }
}
