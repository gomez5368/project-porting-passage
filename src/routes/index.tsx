import { Link, createFileRoute } from "@tanstack/react-router";
import { BarChart3, BellRing, ChevronRight, Fuel, History, Settings, type LucideIcon } from "lucide-react";
import { EmptyVehicleState, ScreenHeader, StatCard, VehicleSwitcher } from "@/components/app/ui";
import { useCarData } from "@/context/CarDataContext";
import { formatNumber, summarizeVehicle } from "@/lib/fuelCalculations";
import { currentOdometer, reminderAlerts, remindersFor, todayIso, type ReminderAlert } from "@/lib/reminders";
import { statusCard, statusText } from "@/components/app/reminderTone";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { DatabaseBackup } from "lucide-react";
import { LAST_BACKUP_KEY, daysSince, needsBackupReminder } from "@/lib/backupReminder";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prehľad spotreby – Spotreba auta" },
      { name: "description", content: "Rýchly prístup k tankovaniam, histórii, nákladom, štatistikám a nastaveniam vášho auta." },
      { property: "og:title", content: "Prehľad spotreby – Spotreba auta" },
      { property: "og:description", content: "Rýchly prístup k tankovaniam, histórii, nákladom, štatistikám a nastaveniam vášho auta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Overview,
});

type TileProps = {
  to: "/tankovanie" | "/historia" | "/statistiky" | "/nastavenia";
  label: string;
  icon: LucideIcon;
  tone: "fuel" | "costs" | "stats" | "settings";
  badge?: string | undefined;
};

const tileTones = {
  fuel: "border-primary/30 bg-primary/12 text-primary",
  costs: "border-secondary/30 bg-secondary/12 text-secondary",
  stats: "border-chart-2/30 bg-chart-2/12 text-chart-2",
  settings: "border-chart-4/30 bg-chart-4/12 text-chart-4",
} as const;

function HomeTile({ to, label, icon: Icon, tone, badge }: TileProps) {
  return (
    <Link to={to} className="panel group relative flex min-h-36 flex-col items-center justify-center gap-3 px-3 py-5 text-center transition duration-200 hover:-translate-y-0.5 hover:border-primary/60">
      {badge ? <span className="absolute right-3 top-3 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-bold text-warning">{badge}</span> : null}
      <span className={cn("rounded-2xl border p-4 shadow-lg transition-transform duration-200 group-hover:scale-105", tileTones[tone])}><Icon className="size-9" strokeWidth={1.8} /></span>
      <span className="font-semibold leading-snug">{label}</span>
    </Link>
  );
}

function Overview() {
  const { vehicles, reminders, selectedVehicle, selectedFillUps, selectedCosts, selectVehicle } = useCarData();
  const otherCosts = selectedCosts.reduce((sum, cost) => sum + cost.amount, 0);
  const summary = selectedVehicle ? summarizeVehicle(selectedVehicle, selectedFillUps) : null;
  const lastSegment = summary?.segments.at(-1) ?? null;
  const alerts = selectedVehicle
    ? reminderAlerts(remindersFor({ reminders }, selectedVehicle.id), currentOdometer(selectedVehicle, selectedFillUps), todayIso())
    : [];
  const inspectionAlerts = alerts.filter((alert) => alert.key === "stk" || alert.key === "ek");

  return (
    <>
      <ScreenHeader title="Prehľad" subtitle={selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : "Všetko o vašom aute na jednom mieste"} />
      {selectedVehicle ? <VehicleSwitcher vehicles={vehicles} selectedId={selectedVehicle.id} onSelect={selectVehicle} /> : null}
      {selectedVehicle?.photo ? <img src={selectedVehicle.photo} alt={`${selectedVehicle.brand} ${selectedVehicle.model}`} className="mb-5 max-h-64 w-full rounded-lg bg-muted object-contain" /> : null}
      {alerts.length > 0 ? <ReminderBanner alerts={alerts} /> : null}
      <BackupBanner hasData={vehicles.length > 0} />

      <nav aria-label="Hlavné menu" className="mb-6 grid grid-cols-2 gap-3">
        <HomeTile to="/tankovanie" label="Nové tankovanie" icon={Fuel} tone="fuel" />
        <HomeTile to="/historia" label="História a Náklady" icon={History} tone="costs" />
        <HomeTile to="/statistiky" label="Štatistiky" icon={BarChart3} tone="stats" />
        <HomeTile to="/nastavenia" label="Nastavenia vozidla" icon={Settings} tone="settings" badge={inspectionAlerts.length > 0 ? "STK/EK" : undefined} />
      </nav>

      {selectedVehicle && summary ? (
        <section aria-labelledby="quick-stats-title">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 id="quick-stats-title" className="font-semibold">Rýchly prehľad</h2>
            <Link to="/statistiky" className="text-sm font-semibold text-primary hover:underline">Všetky štatistiky</Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Priemerná spotreba" value={summary.averageConsumption !== null ? formatNumber(summary.averageConsumption, 1) : "—"} unit="l/100 km" tone="primary" />
            <StatCard label="Posledná spotreba" value={lastSegment ? formatNumber(lastSegment.consumption, 1) : "—"} unit="l/100 km" tone="success" />
            <StatCard label="Najazdené km" value={formatNumber(summary.totalKm)} unit="km" tone="secondary" />
            <StatCard label="Celkom za auto" value={formatNumber(summary.totalCost + otherCosts, 2)} unit="€" tone="warning" />
          </div>
        </section>
      ) : <EmptyVehicleState />}
    </>
  );
}

function ReminderBanner({ alerts }: { alerts: ReminderAlert[] }) {
  const tone = alerts.some((alert) => alert.status === "overdue") ? "overdue" : "soon";
  return (
    <Link to="/nastavenia" data-testid="reminder-banner"
      className={cn("mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors hover:bg-card", statusCard[tone])}>
      <BellRing className={cn("size-5 shrink-0", statusText[tone])} />
      <span className="min-w-0 flex-1">
        <span className="font-semibold">{tone === "overdue" ? "Treba vybaviť" : "Blíži sa termín"}: </span>
        {alerts.map((alert, index) => (
          <span key={alert.key}>
            {index > 0 ? " · " : ""}{alert.label} <span className={cn("font-semibold", statusText[alert.status])}>({alert.text})</span>
          </span>
        ))}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function BackupBanner({ hasData }: { hasData: boolean }) {
  const [last, setLast] = useState<string | null | undefined>(undefined);
  useEffect(() => { try { setLast(localStorage.getItem(LAST_BACKUP_KEY)); } catch { setLast(null); } }, []);
  if (last === undefined || !needsBackupReminder(last, new Date(), hasData)) return null;
  const d = daysSince(last, new Date());
  return (
    <Link to="/historia" data-testid="backup-banner"
      className="mb-4 flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm transition-colors hover:bg-card">
      <DatabaseBackup className="size-5 shrink-0 text-primary" />
      <span className="min-w-0 flex-1"><span className="font-semibold">Zálohujte si dáta: </span>
        {d === null ? "zatiaľ ste nevytvorili žiadnu zálohu." : `posledná záloha pred ${d} dňami.`}</span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
