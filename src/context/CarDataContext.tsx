import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createId, loadAppState, saveAppState } from '@/lib/storage';
import { mergeImport } from '@/lib/backupMerge';
import { replaceCost, replaceFillUp, validateBackup } from '@/lib/jsonBackup';
import type { AppState, Cost, FillUp, Vehicle } from '@/types/fuel';

type NewVehicle = Omit<Vehicle, 'id'>;
type NewFillUp = Omit<FillUp, 'id'>;
type NewCost = Omit<Cost, 'id' | 'vehicleId'>;
export { costKey } from '@/lib/backupMerge';

type CarDataContextValue = AppState & {
  isReady: boolean;
  selectedVehicle: Vehicle | null;
  selectedFillUps: FillUp[];
  selectedCosts: Cost[];
  addCost: (cost: NewCost & { vehicleId: string }) => void;
  deleteCost: (costId: string) => void;
  updateCost: (costId: string, changes: Pick<Cost, 'date' | 'amount' | 'category' | 'note'>) => void;
  addVehicle: (vehicle: NewVehicle) => Vehicle;
  selectVehicle: (vehicleId: string) => void;
  updateVehicle: (vehicleId: string, data: NewVehicle) => void;
  addFillUps: (fillUps: NewFillUp[]) => void;
  deleteFillUp: (fillUpId: string) => void;
  updateFillUp: (fillUpId: string, changes: Omit<FillUp, 'id' | 'vehicleId'>) => void;
  restoreData: (data: AppState) => void;
  importVehicles: (items: { vehicle: NewVehicle; fillUps: Omit<FillUp, 'id' | 'vehicleId'>[]; costs?: NewCost[] }[]) => void;
};

const CarDataContext = createContext<CarDataContextValue | null>(null);

export function CarDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({ vehicles: [], fillUps: [], costs: [], selectedVehicleId: null });
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

  const updateVehicle = useCallback((vehicleId: string, data: NewVehicle) => {
    setState((prev) => ({ ...prev, vehicles: prev.vehicles.map((v) => (v.id === vehicleId ? { ...data, id: v.id } : v)) }));
  }, []);

  const selectVehicle = useCallback((vehicleId: string) => {
    setState((prev) => ({ ...prev, selectedVehicleId: vehicleId }));
  }, []);

  const addFillUps = useCallback((fillUps: NewFillUp[]) => {
    const created: FillUp[] = fillUps.map((fillUp) => ({ ...fillUp, id: createId() }));
    setState((prev) => ({ ...prev, fillUps: [...prev.fillUps, ...created] }));
  }, []);

  const importVehicles = useCallback((items: { vehicle: NewVehicle; fillUps: Omit<FillUp, 'id' | 'vehicleId'>[]; costs?: NewCost[] }[]) => {
    setState((prev) => mergeImport(prev, items, createId).state);
  }, []);

  const addCost = useCallback((cost: NewCost & { vehicleId: string }) => {
    setState((prev) => ({ ...prev, costs: [...prev.costs, { ...cost, id: createId() }] }));
  }, []);

  const deleteCost = useCallback((costId: string) => {
    setState((prev) => ({ ...prev, costs: prev.costs.filter((c) => c.id !== costId) }));
  }, []);

  const updateCost = useCallback((costId: string, changes: Pick<Cost, 'date' | 'amount' | 'category' | 'note'>) => {
    setState((prev) => replaceCost(prev, costId, changes));
  }, []);

  const deleteFillUp = useCallback((fillUpId: string) => {
    setState((prev) => ({ ...prev, fillUps: prev.fillUps.filter((f) => f.id !== fillUpId) }));
  }, []);

  const updateFillUp = useCallback((fillUpId: string, changes: Omit<FillUp, 'id' | 'vehicleId'>) => {
    setState((prev) => replaceFillUp(prev, fillUpId, changes));
  }, []);

  const restoreData = useCallback((data: AppState) => {
    const restored = validateBackup(data);
    saveAppState(restored);
    setState(restored);
  }, []);

  const value = useMemo<CarDataContextValue>(() => {
    const selectedVehicle =
      state.vehicles.find((v) => v.id === state.selectedVehicleId) ?? state.vehicles[0] ?? null;
    const selectedFillUps = selectedVehicle
      ? state.fillUps.filter((f) => f.vehicleId === selectedVehicle.id)
      : [];
    const selectedCosts = selectedVehicle ? state.costs.filter((c) => c.vehicleId === selectedVehicle.id) : [];
    return {
      ...state,
      selectedVehicle,
      selectedFillUps,
      selectedCosts,
      addCost,
      deleteCost,
      updateCost,
      isReady,
      addVehicle,
      selectVehicle,
      updateVehicle,
      addFillUps,
      deleteFillUp,
      updateFillUp,
      restoreData,
      importVehicles,
    };
  }, [state, isReady, addVehicle, selectVehicle, updateVehicle, addFillUps, deleteFillUp, updateFillUp, restoreData, importVehicles, addCost, deleteCost, updateCost]);

  return <CarDataContext.Provider value={value}>{children}</CarDataContext.Provider>;
}

export function useCarData(): CarDataContextValue {
  const context = useContext(CarDataContext);
  if (!context) throw new Error('useCarData must be used within CarDataProvider');
  return context;
}
