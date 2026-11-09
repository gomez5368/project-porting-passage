import { FUEL_TYPES, type AppState, type FillUp, type Vehicle } from '@/types/fuel';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

class BackupFormatError extends Error {}

function fail(message: string): never {
  throw new BackupFormatError(message);
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(`${label} nemá správny tvar.`);
  return value as Record<string, unknown>;
}

function asString(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim() === '') fail(`${label} musí byť vyplnený text.`);
  return value;
}

function asNumber(value: unknown, label: string, min = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min) fail(`${label} má neplatnú hodnotu.`);
  return value;
}

function asDate(value: unknown, label: string): string {
  const text = asString(value, label);
  const parsed = new Date(`${text}T00:00:00Z`);
  if (!DATE_PATTERN.test(text) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) {
    fail(`${label} má neplatný dátum.`);
  }
  return text;
}

function asArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) fail(`${label} musí byť zoznam.`);
  return value;
}

function parseVehicle(value: unknown): Vehicle {
  const record = asRecord(value, 'Vozidlo');
  return {
    id: asString(record.id, 'Identifikátor vozidla'),
    brand: asString(record.brand, 'Značka vozidla'),
    model: asString(record.model, 'Model vozidla'),
    year: asNumber(record.year, 'Rok výroby', 1900),
    initialOdometer: asNumber(record.initialOdometer, 'Počiatočný stav'),
  };
}

function asPercent(value: unknown): number {
  const percent = asNumber(value, 'Stav nádrže');
  if (percent > 100) fail('Stav nádrže musí byť od 0 do 100 %.');
  return percent;
}

function parseFillUp(value: unknown): FillUp {
  const record = asRecord(value, 'Tankovanie');
  const fuelType = record.fuelType;
  if (!FUEL_TYPES.includes(fuelType as FillUp['fuelType'])) fail('Tankovanie má neznámy typ paliva.');
  if (typeof record.isFullTank !== 'boolean') fail('Tankovanie musí mať údaj o plnej nádrži.');
  return {
    id: asString(record.id, 'Identifikátor tankovania'),
    vehicleId: asString(record.vehicleId, 'Vozidlo tankovania'),
    date: asDate(record.date, 'Dátum tankovania'),
    odometer: asNumber(record.odometer, 'Stav tachometra'),
    liters: asNumber(record.liters, 'Počet litrov', Number.MIN_VALUE),
    totalCost: asNumber(record.totalCost, 'Celková cena'),
    pricePerLiter: asNumber(record.pricePerLiter, 'Cena za liter'),
    fuelType: fuelType as FillUp['fuelType'],
    isFullTank: record.isFullTank,
    tankLevelPercent: record.tankLevelPercent === undefined ? undefined : asPercent(record.tankLevelPercent),
  };
}

function assertUniqueIds(ids: string[]) {
  if (new Set(ids).size !== ids.length) fail('Záloha obsahuje duplicitné identifikátory.');
}

export function validateBackup(value: unknown): AppState {
  const record = asRecord(value, 'Záloha');
  const vehicles = asArray(record.vehicles, 'Zoznam vozidiel').map(parseVehicle);
  const fillUps = asArray(record.fillUps, 'Zoznam tankovaní').map(parseFillUp);

  assertUniqueIds(vehicles.map((vehicle) => vehicle.id));
  assertUniqueIds(fillUps.map((fillUp) => fillUp.id));

  const vehicleIds = new Set(vehicles.map((vehicle) => vehicle.id));
  if (fillUps.some((fillUp) => !vehicleIds.has(fillUp.vehicleId))) fail('Tankovanie patrí neexistujúcemu vozidlu.');

  const selectedVehicleId = record.selectedVehicleId;
  if (selectedVehicleId !== null && (typeof selectedVehicleId !== 'string' || !vehicleIds.has(selectedVehicleId))) {
    fail('Vybrané vozidlo v zálohe neexistuje.');
  }

  return { vehicles, fillUps, selectedVehicleId };
}

export function parseJsonBackup(text: string): AppState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    fail('Súbor nie je platný JSON.');
  }
  return validateBackup(parsed);
}

export function serializeJsonBackup(state: AppState): string {
  return JSON.stringify(validateBackup(state), null, 2);
}

export function getBackupErrorMessage(error: unknown): string {
  return error instanceof BackupFormatError ? error.message : 'Zálohu sa nepodarilo načítať.';
}
