import { describe, expect, it } from 'vitest';
import { accountCacheKey, emptyCarState, parseAccountCache } from '@/lib/accountCache';
describe('Private account cache', () => {
  it('keeps separate local keys for different signed-in owners', () => {
    expect(accountCacheKey('owner-a')).toBe('spotreba-cloud-v1:owner-a');
    expect(accountCacheKey('owner-a')).not.toBe(accountCacheKey('owner-b'));
  });
  it('retains unsaved state and its base revision for safe retry', () => {
    const state = { ...emptyCarState(), vehicles: [{ id: 'car-1', brand: 'Škoda', model: 'Fabia', year: 2015, initialOdometer: 150000 }], selectedVehicleId: 'car-1' };
    const result = parseAccountCache(JSON.stringify({ state, revision: 3, pending: true }));
    expect(result?.pending).toBe(true);
    expect(result?.revision).toBe(3);
    expect(result?.state.vehicles[0]?.model).toBe('Fabia');
  });
  it('rejects orphaned records instead of importing corrupt account data', () => {
    expect(parseAccountCache(JSON.stringify({ state: { ...emptyCarState(), costs: [{ id: 'cost-1', vehicleId: 'missing', date: '2026-11-14', amount: 25, category: 'Servis', note: '', odometer: null }] }, revision: 1, pending: false }))).toBeNull();
  });
});