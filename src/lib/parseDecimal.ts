export function parseDecimal(value: string): number {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (normalized === '') return NaN;
  return Number(normalized);
}
