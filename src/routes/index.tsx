import { createFileRoute } from "@tanstack/react-router";
import { EmptyVehicleState, ScreenHeader, StatCard, TrendChart, VehicleSwitcher } from "@/components/app/ui";
import { useCarData } from "@/context/CarDataContext";
import { formatNumber, formatShortDate, sortFillUps, summarizeVehicle } from "@/lib/fuelCalculations";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prehľad spotreby – Spotreba auta" },
      { name: "description", content: "Priemerná spotreba, náklady na palivo a cena za kilometer vášho auta." },
      { property: "og:title", content: "Prehľad spotreby – Spotreba auta" },
      { property: "og:description", content: "Priemerná spotreba, náklady na palivo a cena za kilometer vášho auta." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { vehicles, selectedVehicle, selectedFillUps, selectedCosts, selectVehicle } = useCarData();
  const otherCosts = selectedCosts.reduce((s, c) => s + c.amount, 0);
  const summary = selectedVehicle ? summarizeVehicle(selectedVehicle, selectedFillUps) : null;
  return (
    <>
      <ScreenHeader title="Prehľad" subtitle={selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : "Štatistiky vášho auta"} />
      {selectedVehicle && summary ? (
        <>
          <VehicleSwitcher vehicles={vehicles} selectedId={selectedVehicle.id} onSelect={selectVehicle} />
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Priemerná spotreba" value={summary.averageConsumption !== null ? formatNumber(summary.averageConsumption, 1) : "—"} unit="l/100 km" tone="primary" />
            <StatCard label="Náklady na palivo" value={formatNumber(summary.totalCost, 2)} unit="€" tone="secondary" />
            <StatCard label="Cena za 1 km" value={summary.costPerKm !== null ? formatNumber(summary.costPerKm, 3) : "—"} unit="€/km" tone="warning" />
            <StatCard label="Najazdené km" value={formatNumber(summary.totalKm)} unit="km" tone="success" />
            <StatCard label="Ostatné náklady" value={formatNumber(otherCosts, 2)} unit="€" tone="warning" />
            <StatCard label="Celkom za auto" value={formatNumber(summary.totalCost + otherCosts, 2)} unit="€" tone="primary" />
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
