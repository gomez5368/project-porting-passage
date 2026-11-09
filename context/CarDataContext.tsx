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
  replaceAppState: (nextState: AppState) => void;
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

  const deleteFillUp = useCallback((fillUpId: string) => {
    setState((prev) => ({ ...prev, fillUps: prev.fillUps.filter((f) => f.id !== fillUpId) }));
  }, []);

  const replaceAppState = useCallback((nextState: AppState) => {
    setState(nextState);
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
      replaceAppState,
    };
  }, [state, isReady, addVehicle, selectVehicle, addFillUps, deleteFillUp, replaceAppState]);

  return <CarDataContext.Provider value={value}>{children}</CarDataContext.Provider>;
}

export function useCarData(): CarDataContextValue {
  const context = useContext(CarDataContext);
  if (!context) throw new Error('useCarData must be used within CarDataProvider');
  return context;
}
