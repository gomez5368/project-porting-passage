import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyCarState } from '@/lib/accountCache';
const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock('@/lib/cloudCars.functions', () => ({ readCloudCars: mocks.read, writeCloudCars: mocks.write }));
vi.mock('@tanstack/react-start', () => ({ useServerFn: (fn: unknown) => fn }));
import { useCloudCars } from '@/context/useCloudCars';
const carState = (brand: string) => ({ ...emptyCarState(), vehicles: [{ id: 'car-1', brand, model: 'Fabia', year: 2015, initialOdometer: 100000 }], selectedVehicleId: 'car-1' });
describe('Cloud account persistence', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
  it('saves edited vehicles using the last cloud revision', async () => {
    mocks.read.mockResolvedValue({ state: carState('Škoda'), revision: 7 });
    mocks.write.mockResolvedValue({ conflict: false, revision: 8 });
    const { result } = renderHook(() => useCloudCars('owner-a'));
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.setState(carState('Toyota')));
    await waitFor(() => expect(mocks.write).toHaveBeenCalledWith({ data: { state: carState('Toyota'), revision: 7 } }));
    await waitFor(() => expect(result.current.status).toBe('Uložené v cloude'));
  });
  it('never exposes the previous account while the next account loads', async () => {
    mocks.read.mockResolvedValueOnce({ state: carState('Škoda'), revision: 2 }).mockImplementationOnce(() => new Promise(() => {}));
    const { result, rerender } = renderHook(({ owner }) => useCloudCars(owner), { initialProps: { owner: 'owner-a' } });
    await waitFor(() => expect(result.current.ready).toBe(true));
    rerender({ owner: 'owner-b' });
    expect(result.current.ready).toBe(false);
    expect(result.current.state.vehicles).toEqual([]);
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it('retains pending changes instead of silently overwriting a newer device revision', async () => {
    mocks.read.mockResolvedValue({ state: carState('Škoda'), revision: 4 });
    mocks.write.mockResolvedValue({ conflict: true });
    const { result } = renderHook(() => useCloudCars('owner-a'));
    await waitFor(() => expect(result.current.ready).toBe(true));
    act(() => result.current.setState(carState('Toyota')));
    await waitFor(() => expect(result.current.error).toContain('Na inom zariadení'));
    expect(result.current.state.vehicles[0]?.brand).toBe('Toyota');
    expect(JSON.parse(localStorage.getItem('spotreba-cloud-v1:owner-a') ?? '{}').pending).toBe(true);
  });
});