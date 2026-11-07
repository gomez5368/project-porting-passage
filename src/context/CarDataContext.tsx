import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createId, loadAppState, saveAppState } from '@/lib/storage';
import type { AppState, FillUp, Vehicle } from '@/types/fuel';

type NewVehicle = Omit<Vehicle, 'id'>;
type NewFillUp = Omit<FillUp, 'id'>;

type CarDataContextValue = AppState & {
  isReady: boolean;
  selectedVehicle: Vehicle | null;
  selectedFillUps: FillUp[];
  addVehicle: (vehicle: NewVehicle) => Vehicle;
  selectVehicle: (vehicleId: string) => void;
  addFillUps: (fillUps: NewFillUp[]) => void;
  deleteFillUp: (fillUpId: string) => void;
};

const CarDataContext = createContext<CarDataContextValue | null>(null);

export function CarDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({ vehicles: [], fillUps: [], selectedVehicleId: null });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setState(loadAppState());
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (isReady) saveAppState(state);
  }, [state, isReady]);

  const addVehicle = useCallback((vehicle: NewVehicle) => {
    const created: Vehicle = { ...vehicle, id: createId() };
    setState((prev) => ({
      ...prev,
      vehicles: [...prev.vehicles, created],
      selectedVehicleId: prev.selectedVehicleId ?? created.id,
    }));
    return created;
  }, []);

  const selectVehicle = useCallback((vehicleId: string) => {
    setState((prev) => ({ ...prev, selectedVehicleId: vehicleId }));
  }, []);

  const addFillUps = useCallback((fillUps: NewFillUp[]) => {
    const created: FillUp[] = fillUps.map((fillUp) => ({ ...fillUp, id: createId() }));
    setState((prev) => ({ ...prev, fillUps: [...prev.fillUps, ...created] }));
  }, []);

  const importVehicles = useCallback((items: { vehicle: NewVehicle; fillUps: Omit<FillUp, 'id' | 'vehicleId'>[] }[]) => {
    setState((prev) => {
      const vehicles = [...prev.vehicles];
      const fillUps = [...prev.fillUps];
      for (const item of items) {
        const existing = vehicles.find(
          (v) => v.brand === item.vehicle.brand && v.model === item.vehicle.model && v.year === item.vehicle.year,
        );
        const target = existing ?? { ...item.vehicle, id: createId() };
        if (!existing) vehicles.push(target);
        const keys = new Set(fillUps.filter((f) => f.vehicleId === target.id).map(fillUpKey));
        for (const f of item.fillUps) {
          if (keys.has(fillUpKey(f))) continue;
          keys.add(fillUpKey(f));
          fillUps.push({ ...f, id: createId(), vehicleId: target.id });
        }
      }
      return { vehicles, fillUps, selectedVehicleId: prev.selectedVehicleId ?? vehicles[0]?.id ?? null };
    });
  }, []);

  const deleteFillUp = useCallback((fillUpId: string) => {
    setState((prev) => ({ ...prev, fillUps: prev.fillUps.filter((f) => f.id !== fillUpId) }));
  }, []);

  const value = useMemo<CarDataContextValue>(() => {
    const selectedVehicle =
      state.vehicles.find((v) => v.id === state.selectedVehicleId) ?? state.vehicles[0] ?? null;
    const selectedFillUps = selectedVehicle
      ? state.fillUps.filter((f) => f.vehicleId === selectedVehicle.id)
      : [];
    return {
      ...state,
      selectedVehicle,
      selectedFillUps,
      isReady,
      addVehicle,
      selectVehicle,
      addFillUps,
      deleteFillUp,
    };
  }, [state, isReady, addVehicle, selectVehicle, addFillUps, deleteFillUp]);

  return <CarDataContext.Provider value={value}>{children}</CarDataContext.Provider>;
}

export function useCarData(): CarDataContextValue {
  const context = useContext(CarDataContext);
  if (!context) throw new Error('useCarData must be used within CarDataProvider');
  return context;
}
