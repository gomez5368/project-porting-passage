import { validateBackup } from '@/lib/jsonBackup';
import type { AppState } from '@/types/fuel';
export type AccountCache = { state: AppState; revision: number; pending: boolean };
export const emptyCarState = (): AppState => ({ vehicles: [], fillUps: [], costs: [], selectedVehicleId: null });
export function parseAccountCache(raw: string | null): AccountCache | null {
  try {
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!Number.isInteger(value.revision) || value.revision < 0 || typeof value.pending !== 'boolean') return null;
    return { state: validateBackup(value.state), revision: value.revision, pending: value.pending };
  } catch { return null; }
}
export const accountCacheKey = (userId: string) => `spotreba-cloud-v1:${userId}`;