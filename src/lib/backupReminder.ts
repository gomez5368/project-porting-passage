export const LAST_BACKUP_KEY = "spotreba-last-backup-v1";
export const BACKUP_REMINDER_DAYS = 30;

export function daysSince(lastIso: string | null, now: Date): number | null {
  if (!lastIso) return null;
  const t = Date.parse(lastIso);
  return Number.isFinite(t) ? Math.floor((now.getTime() - t) / 86_400_000) : null;
}

/** Pripomenúť zálohu, ak existujú dáta a záloha ešte nebola alebo je staršia ako 30 dní. */
export function needsBackupReminder(lastIso: string | null, now: Date, hasData: boolean): boolean {
  if (!hasData) return false;
  const d = daysSince(lastIso, now);
  return d === null || d >= BACKUP_REMINDER_DAYS;
}
