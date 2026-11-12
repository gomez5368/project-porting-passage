import type { AppState, DeadlineType, FillUp, Vehicle, VehicleReminders } from "@/types/fuel";

export const DEADLINE_LABELS: Record<DeadlineType, string> = {
  stk: "STK",
  ek: "Emisná kontrola (EK)",
  pzp: "PZP",
  havarijne: "Havarijné poistenie",
  dialnicna: "Diaľničná známka",
};
export const DEADLINE_SHORT: Record<DeadlineType, string> = {
  stk: "STK", ek: "EK", pzp: "PZP", havarijne: "Havarijné poistenie", dialnicna: "Diaľničná známka",
};

export const DEFAULT_OIL_INTERVAL_KM = 15000;
/** A deadline with this many days or fewer left is highlighted as approaching. */
export const DEADLINE_WARNING_DAYS = 30;
/** Oil change with fewer than this many km left is highlighted as approaching. */
export const OIL_WARNING_KM = 1500;

export type ReminderStatus = "ok" | "soon" | "overdue";

export function emptyReminders(vehicleId: string): VehicleReminders {
  return { vehicleId, deadlines: {}, oilIntervalKm: DEFAULT_OIL_INTERVAL_KM };
}

export function remindersFor(state: Pick<AppState, "reminders">, vehicleId: string): VehicleReminders {
  return state.reminders?.find((r) => r.vehicleId === vehicleId) ?? emptyReminders(vehicleId);
}

export function upsertReminders(state: AppState, next: VehicleReminders): AppState {
  const others = (state.reminders ?? []).filter((r) => r.vehicleId !== next.vehicleId);
  return { ...state, reminders: [...others, next] };
}

/** Whole days from `today` to `date` (both YYYY-MM-DD). Negative once the date has passed. */
export function daysUntil(date: string, today: string): number {
  const a = Date.parse(`${today}T00:00:00Z`);
  const b = Date.parse(`${date}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function deadlineStatus(daysLeft: number): ReminderStatus {
  if (daysLeft < 0) return "overdue";
  if (daysLeft <= DEADLINE_WARNING_DAYS) return "soon";
  return "ok";
}

/** Highest odometer reading known for the vehicle (fill-ups or initial odometer). */
export function currentOdometer(vehicle: Vehicle, fillUps: FillUp[]): number {
  return fillUps.reduce((max, f) => (f.vehicleId === vehicle.id && f.odometer > max ? f.odometer : max), vehicle.initialOdometer);
}

export type OilState = { nextAt: number; remainingKm: number; driven: number; progress: number; status: ReminderStatus };

export function oilState(reminders: VehicleReminders, odometer: number): OilState | null {
  if (reminders.oilLastOdometer === undefined || reminders.oilIntervalKm <= 0) return null;
  const nextAt = reminders.oilLastOdometer + reminders.oilIntervalKm;
  const remainingKm = nextAt - odometer;
  const driven = Math.max(0, odometer - reminders.oilLastOdometer);
  const progress = Math.min(1, driven / reminders.oilIntervalKm);
  const status: ReminderStatus = remainingKm < 0 ? "overdue" : remainingKm < OIL_WARNING_KM ? "soon" : "ok";
  return { nextAt, remainingKm, driven, progress, status };
}

export type ReminderAlert = { key: string; label: string; status: Exclude<ReminderStatus, "ok">; text: string };

/** Approaching or overdue items for the overview banner. */
export function reminderAlerts(reminders: VehicleReminders, odometer: number, today: string): ReminderAlert[] {
  const alerts: ReminderAlert[] = [];
  for (const type of Object.keys(DEADLINE_LABELS) as DeadlineType[]) {
    const date = reminders.deadlines[type];
    if (!date) continue;
    const days = daysUntil(date, today);
    const status = deadlineStatus(days);
    if (status === "ok") continue;
    alerts.push({ key: type, label: DEADLINE_SHORT[type], status, text: formatDaysLeft(days) });
  }
  const oil = oilState(reminders, odometer);
  if (oil && oil.status !== "ok") {
    alerts.push({ key: "oil", label: "Výmena oleja", status: oil.status, text: formatKmLeft(oil.remainingKm) });
  }
  return alerts;
}

function plural(n: number, one: string, few: string, many: string) {
  const a = Math.abs(n);
  return a === 1 ? one : a >= 2 && a <= 4 ? few : many;
}

export function formatDaysLeft(days: number): string {
  if (days === 0) return "vyprší dnes";
  if (days > 0) return `zostáva ${days} ${plural(days, "deň", "dni", "dní")}`;
  return `vypršalo pred ${-days} ${plural(days, "dňom", "dňami", "dňami")}`;
}

export function formatKmLeft(km: number): string {
  const n = Math.abs(Math.round(km)).toLocaleString("sk-SK");
  return km >= 0 ? `zostáva ${n} km` : `prekročené o ${n} km`;
}

export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
