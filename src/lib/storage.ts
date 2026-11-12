import type { AppState } from '@/types/fuel';

const STORAGE_KEY = 'spotreba-app-state-v1';

const emptyState: AppState = {
  vehicles: [],
  fillUps: [],
  costs: [],
  selectedVehicleId: null,
};

export function loadAppState(): AppState {
  if (typeof window === 'undefined' || !window.localStorage) return emptyState;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      vehicles: Array.isArray(parsed.vehicles) ? parsed.vehicles : [],
      fillUps: Array.isArray(parsed.fillUps) ? parsed.fillUps : [],
      costs: Array.isArray(parsed.costs) ? parsed.costs : [],
      reminders: Array.isArray(parsed.reminders) ? parsed.reminders : [],
      selectedVehicleId: typeof parsed.selectedVehicleId === 'string' ? parsed.selectedVehicleId : null,
    };
  } catch {
    return emptyState;
  }
}

export function saveAppState(state: AppState): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
