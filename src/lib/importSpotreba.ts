import { FUEL_TYPES, type FillUp, type FuelType } from '@/types/fuel';

export type ImportedFillUp = Omit<FillUp, 'id' | 'vehicleId'>;
export type ImportIssue = { line: number; message: string };
export type ImportResult = { records: ImportedFillUp[]; issues: ImportIssue[] };

type ColumnKey = 'date' | 'odometer' | 'liters' | 'totalCost' | 'pricePerLiter' | 'fuelType' | 'fullTank';
type HeaderMap = Partial<Record<ColumnKey, number>>;

const INVISIBLE_CHARS = /[\u00a0\u202f\u200b\u200c\u200d\ufeff]/g;
const UNIT_TOKENS = /€|\beur\b|\bkm\b|\bl\b/gi;
const TIME_SUFFIX = /\s+\d{1,2}:\d{2}(:\d{2})?.*$/;
const DATE_LIKE = /\d{1,4}[./-]\d{1,2}[./-]\d{2,4}/;
const FUEL_ALIASES: Record<FuelType, string[]> = {
  Benzín: ['benzin', 'benz', 'natural', 'e10'],
  Diesel: ['diesel', 'nafta'],
  LPG: ['lpg', 'plyn'],
  EV: ['ev', 'elektr'],
};
const YES_WORDS = ['ano', 'yes', 'a', 'true', 'x', '✓', '✔'];
const NO_WORDS = ['nie', 'no', 'n', 'false'];

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function cleanCell(cell: string): string {
  return cell.replace(INVISIBLE_CHARS, ' ').replace(UNIT_TOKENS, ' ').replace(/\s+/g, ' ').trim();
}

function splitColumns(line: string): string[] {
  if (line.includes('\t')) return line.split('\t');
  if (line.includes('|')) return line.split('|').map((c) => c.trim());
  const wide = line.split(/\s{2,}/);
  if (wide.length > 1) return wide;
  const merged: string[] = [];
  for (const token of line.split(/\s+/)) {
    const prev = merged[merged.length - 1];
    if (/^\d{3}$/.test(token) && prev !== undefined && /^\d{1,3}$/.test(prev)) merged[merged.length - 1] = prev + token;
    else merged.push(token);
  }
  return merged;
}

function parseDate(cell: string): string | null {
  const value = cell.replace(TIME_SUFFIX, '').trim();
  const dmy = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const parts = dmy ? [dmy[3], dmy[2], dmy[1]] : iso ? [iso[1], iso[2], iso[3]] : null;
  if (!parts) return null;

  const [year = 0, month = 0, day = 0] = parts.map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseNumber(cell: string): number | null {
  const compact = cell.replace(/\s/g, '').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(compact)) return null;
  return Number(compact);
}

function isIntegerCell(cell: string): boolean {
  return /^\d+$/.test(cell.replace(/\s/g, ''));
}

function matchFuel(cell: string): FuelType | null {
  const normalized = normalizeText(cell);
  return FUEL_TYPES.find((fuel) => FUEL_ALIASES[fuel].some((alias) => normalized === alias)) ?? null;
}

function parseFullTank(cell: string): boolean | null {
  const normalized = normalizeText(cell);
  if (YES_WORDS.includes(normalized)) return true;
  if (NO_WORDS.includes(normalized)) return false;
  return null;
}

function detectHeader(rawCells: string[]): HeaderMap | null {
  const map: HeaderMap = {};
  rawCells.forEach((raw, index) => {
    const n = normalizeText(raw);
    if (map.date === undefined && /datum/.test(n)) map.date = index;
    if (map.odometer === undefined && /tachometer|stav|najazd|^km$|\(km\)/.test(n)) map.odometer = index;
    else if (map.pricePerLiter === undefined && /cena/.test(n) && /liter|\/|za l/.test(n)) map.pricePerLiter = index;
    else if (map.totalCost === undefined && /cena|suma|spolu|celkom/.test(n)) map.totalCost = index;
    else if (map.liters === undefined && /lit|objem|^l$|\(l\)/.test(n)) map.liters = index;
    else if (map.fuelType === undefined && /palivo|typ/.test(n)) map.fuelType = index;
    else if (map.fullTank === undefined && /plna|nadrz/.test(n)) map.fullTank = index;
  });
  return map.date !== undefined && map.odometer !== undefined && map.liters !== undefined ? map : null;
}

function roundCost(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundPrice(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function buildRecordFromHeader(
  cells: string[],
  map: HeaderMap,
  line: number,
): ImportedFillUp | ImportIssue {
  const at = (key: ColumnKey) => (map[key] !== undefined ? cells[map[key]] ?? '' : undefined);

  const date = parseDate(at('date') ?? '');
  if (!date) return { line, message: 'Neplatný dátum.' };

  const odometer = parseNumber(at('odometer') ?? '');
  if (odometer === null || !Number.isInteger(odometer) || odometer < 0) {
    return { line, message: 'Neplatný stav tachometra.' };
  }

  const liters = parseNumber(at('liters') ?? '');
  if (liters === null || liters <= 0) return { line, message: 'Neplatné litre.' };

  const totalInput = at('totalCost') !== undefined ? parseNumber(at('totalCost') ?? '') : null;
  const priceInput = at('pricePerLiter') !== undefined ? parseNumber(at('pricePerLiter') ?? '') : null;
  const totalCost = totalInput ?? (priceInput !== null ? priceInput * liters : null);
  if (totalCost === null) return { line, message: 'Chýba cena tankovania.' };
  const pricePerLiter = priceInput ?? totalCost / liters;

  const fuelCell = at('fuelType');
  const fullCell = at('fullTank');

  return {
    date,
    odometer,
    liters,
    totalCost: roundCost(totalCost),
    pricePerLiter: roundPrice(pricePerLiter),
    fuelType: (fuelCell !== undefined ? matchFuel(fuelCell) : null) ?? 'Benzín',
    isFullTank: (fullCell !== undefined ? parseFullTank(fullCell) : null) ?? false,
  };
}

type NumericCell = { index: number; value: number };

function findTripleConsistent(values: NumericCell[]): { liters: number; price: number; total: number } | null {
  for (const l of values) {
    for (const p of values) {
      for (const t of values) {
        if (l === p || p === t || l === t) continue;
        if (Math.abs(l.value * p.value - t.value) <= Math.max(0.02 * t.value, 0.05)) {
          return { liters: l.value, price: p.value, total: t.value };
        }
      }
    }
  }
  return null;
}

function buildRecordFromPosition(cells: string[], line: number): ImportedFillUp | ImportIssue {
  const dateIndex = cells.findIndex((c) => parseDate(c) !== null);
  if (dateIndex === -1) return { line, message: 'Neplatný dátum.' };
  const date = parseDate(cells[dateIndex] ?? '');
  if (!date) return { line, message: 'Neplatný dátum.' };

  let fuelType: FuelType | null = null;
  let isFullTank: boolean | null = null;
  const numbers: (NumericCell & { integer: boolean })[] = [];

  for (const [index, cell] of cells.entries()) {
    if (index === dateIndex || cell === '') continue;
    const value = parseNumber(cell);
    if (value !== null) {
      numbers.push({ index, value, integer: isIntegerCell(cell) });
      continue;
    }
    fuelType = fuelType ?? matchFuel(cell);
    isFullTank = isFullTank ?? parseFullTank(cell);
  }

  const odometerEntry = numbers.find((n) => n.integer && n.value >= 1000);
  if (!odometerEntry) return { line, message: 'Nepodarilo sa nájsť stav tachometra.' };

  const rest = numbers.filter((n) => n !== odometerEntry);
  let liters: number;
  let pricePerLiter: number;
  let totalCost: number;

  if (rest.length >= 3) {
    const triple = findTripleConsistent(rest);
    if (!triple) return { line, message: 'Nepodarilo sa rozpoznať litre a cenu.' };
    ({ liters, price: pricePerLiter, total: totalCost } = triple);
  } else if (rest.length === 2) {
    const price = rest.find((n) => n.value < 10);
    const other = rest.find((n) => n !== price);
    if (!price || !other) return { line, message: 'Nepodarilo sa rozpoznať litre a cenu.' };
    liters = other.value;
    pricePerLiter = price.value;
    totalCost = liters * pricePerLiter;
  } else {
    return { line, message: 'Nepodarilo sa rozpoznať litre a cenu.' };
  }

  return {
    date,
    odometer: odometerEntry.value,
    liters,
    totalCost: roundCost(totalCost),
    pricePerLiter: roundPrice(pricePerLiter),
    fuelType: fuelType ?? 'Benzín',
    isFullTank: isFullTank ?? false,
  };
}

function isIssue(value: ImportedFillUp | ImportIssue): value is ImportIssue {
  return 'message' in value;
}

export function parseSpotrebaImport(text: string): ImportResult {
  const records: ImportedFillUp[] = [];
  const issues: ImportIssue[] = [];
  let header: HeaderMap | null = null;

  text.split(/\r?\n/).forEach((rawLine, lineIndex) => {
    const line = rawLine.replace(INVISIBLE_CHARS, ' ').trim();
    if (line === '') return;
    const lineNumber = lineIndex + 1;

    const rawCells = splitColumns(line);
    const cells = rawCells.map(cleanCell);
    const hasDate = cells.some((c) => parseDate(c) !== null) || DATE_LIKE.test(line);

    if (!hasDate) {
      const detected = detectHeader(rawCells);
      if (detected) header = detected;
      return;
    }

    const result = header
      ? buildRecordFromHeader(cells, header, lineNumber)
      : buildRecordFromPosition(cells, lineNumber);

    if (isIssue(result)) issues.push(result);
    else records.push(result);
  });

  return { records, issues };
}

export function fillUpKey(fillUp: Pick<ImportedFillUp, 'date' | 'odometer' | 'liters'>): string {
  return `${fillUp.date}|${fillUp.odometer}|${fillUp.liters.toFixed(2)}`;
}
