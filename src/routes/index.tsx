import { Link, createFileRoute } from "@tanstack/react-router";
import { BellRing, ChevronRight } from "lucide-react";
import { EmptyVehicleState, ScreenHeader, StatCard, TrendChart, VehicleSwitcher } from "@/components/app/ui";
import { useCarData } from "@/context/CarDataContext";
import { formatNumber, formatShortDate, sortFillUps, summarizeVehicle } from "@/lib/fuelCalculations";
import { currentOdometer, reminderAlerts, remindersFor, todayIso, type ReminderAlert } from "@/lib/reminders";
import { statusCard, statusText } from "@/components/app/reminderTone";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prehľad spotreby – Spotreba auta" },
      { name: "description", content: "Priemerná spotreba, náklady na palivo a cena za kilometer vášho auta." },
      { property: "og:title", content: "Prehľad spotreby – Spotreba auta" },
      { property: "og:description", content: "Priemerná spotreba, náklady na palivo a cena za kilometer vášho auta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { vehicles, reminders, selectedVehicle, selectedFillUps, selectedCosts, selectVehicle } = useCarData();
  const otherCosts = selectedCosts.reduce((s, c) => s + c.amount, 0);
  const summary = selectedVehicle ? summarizeVehicle(selectedVehicle, selectedFillUps) : null;
  const lastSegment = summary?.segments.at(-1) ?? null;
  const alerts = selectedVehicle
    ? reminderAlerts(remindersFor({ reminders }, selectedVehicle.id), currentOdometer(selectedVehicle, selectedFillUps), todayIso())
    : [];
  return (
    <>
      <ScreenHeader title="Prehľad" subtitle={selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : "Štatistiky vášho auta"} />
      {selectedVehicle && summary ? (
        <>
          <VehicleSwitcher vehicles={vehicles} selectedId={selectedVehicle.id} onSelect={selectVehicle} />
          {alerts.length > 0 ? <ReminderBanner alerts={alerts} /> : null}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Priemerná spotreba" value={summary.averageConsumption !== null ? formatNumber(summary.averageConsumption, 1) : "—"} unit="l/100 km" tone="primary" />
            <StatCard label="Náklady na palivo" value={formatNumber(summary.totalCost, 2)} unit="€" tone="secondary" />
            <StatCard label="Cena za 1 km" value={summary.costPerKm !== null ? formatNumber(summary.costPerKm, 3) : "—"} unit="€/km" tone="warning" />
            <StatCard label="Najazdené km" value={formatNumber(summary.totalKm)} unit="km" tone="success" />
            <StatCard label="Ostatné náklady" value={formatNumber(otherCosts, 2)} unit="€" tone="warning" />
            <StatCard label="Celkom za auto" value={formatNumber(summary.totalCost + otherCosts, 2)} unit="€" tone="primary" />
            <StatCard label="Posledná spotreba" value={lastSegment ? formatNumber(lastSegment.consumption, 1) : "—"} unit="l/100 km" tone="success" />
            <StatCard label="Celková cena za 1 km" value={summary.totalKm > 0 ? formatNumber((summary.totalCost + otherCosts) / summary.totalKm, 3) : "—"} unit="€/km" tone="secondary" />
          </div>
          {summary.averageConsumption === null ? (
            <p className="mt-3 text-sm text-muted-foreground">Priemerná spotreba sa zobrazí po dvoch tankovaniach do plnej nádrže.</p>
          ) : null}
          <TrendChart title="Vývoj spotreby" tone="primary"
            points={summary.segments.map((s) => ({ label: formatShortDate(s.date), value: s.consumption }))}
            formatValue={(v) => `${formatNumber(v, 1)} l/100 km`}
            emptyText="Graf spotreby sa zobrazí po dvoch tankovaniach do plnej nádrže." />
          <TrendChart title="Vývoj ceny paliva" tone="secondary"
            points={sortFillUps(selectedFillUps).map((f) => ({ label: formatShortDate(f.date), value: f.pricePerLiter }))}
            formatValue={(v) => `${formatNumber(v, 3)} €/l`}
            emptyText="Zatiaľ žiadne tankovania. Graf ceny sa zobrazí po prvom tankovaní." />
        </>
      ) : (
        <EmptyVehicleState />
      )}
    </>
  );
}

function ReminderBanner({ alerts }: { alerts: ReminderAlert[] }) {
  const tone = alerts.some((a) => a.status === "overdue") ? "overdue" : "soon";
  return (
    <Link to="/terminy" data-testid="reminder-banner"
      className={cn("mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors hover:bg-card", statusCard[tone])}>
      <BellRing className={cn("size-5 shrink-0", statusText[tone])} />
      <span className="min-w-0 flex-1">
        <span className="font-semibold">{tone === "overdue" ? "Treba vybaviť" : "Blíži sa termín"}: </span>
        {alerts.map((a, i) => (
          <span key={a.key}>
            {i > 0 ? " · " : ""}{a.label} <span className={cn("font-semibold", statusText[a.status])}>({a.text})</span>
          </span>
        ))}
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}
