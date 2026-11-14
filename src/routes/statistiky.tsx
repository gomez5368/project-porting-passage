import { createFileRoute } from "@tanstack/react-router";
import { EmptyVehicleState, ScreenHeader, StatCard, TrendChart, VehicleSwitcher } from "@/components/app/ui";
import { useCarData } from "@/context/CarDataContext";
import { formatNumber, formatShortDate, sortFillUps, summarizeVehicle } from "@/lib/fuelCalculations";

export const Route = createFileRoute("/statistiky")({
  head: () => ({
    meta: [
      { title: "Štatistiky spotreby – Spotreba auta" },
      { name: "description", content: "Podrobné štatistiky spotreby, nákladov, ceny za kilometer a vývoja cien paliva." },
      { property: "og:title", content: "Štatistiky spotreby – Spotreba auta" },
      { property: "og:description", content: "Podrobné štatistiky spotreby, nákladov, ceny za kilometer a vývoja cien paliva." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Statistics,
});

function Statistics() {
  const { vehicles, selectedVehicle, selectedFillUps, selectedCosts, selectVehicle } = useCarData();
  const otherCosts = selectedCosts.reduce((sum, cost) => sum + cost.amount, 0);
  const summary = selectedVehicle ? summarizeVehicle(selectedVehicle, selectedFillUps) : null;
  const lastSegment = summary?.segments.at(-1) ?? null;

  return (
    <>
      <ScreenHeader title="Štatistiky" subtitle={selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : "Podrobný prehľad spotreby a nákladov"} />
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
            <StatCard label="Posledná spotreba" value={lastSegment ? formatNumber(lastSegment.consumption, 1) : "—"} unit="l/100 km" tone="success" />
            <StatCard label="Celková cena za 1 km" value={summary.totalKm > 0 ? formatNumber((summary.totalCost + otherCosts) / summary.totalKm, 3) : "—"} unit="€/km" tone="secondary" />
          </div>
          {summary.averageConsumption === null ? (
            <p className="mt-3 text-sm text-muted-foreground">Priemerná spotreba sa zobrazí po dvoch tankovaniach do plnej nádrže.</p>
          ) : null}
          <TrendChart title="Vývoj spotreby" tone="primary"
            points={summary.segments.map((segment) => ({ label: formatShortDate(segment.date), value: segment.consumption }))}
            formatValue={(value) => `${formatNumber(value, 1)} l/100 km`}
            emptyText="Graf spotreby sa zobrazí po dvoch tankovaniach do plnej nádrže." />
          <TrendChart title="Vývoj ceny paliva" tone="secondary"
            points={sortFillUps(selectedFillUps).map((fillUp) => ({ label: formatShortDate(fillUp.date), value: fillUp.pricePerLiter }))}
            formatValue={(value) => `${formatNumber(value, 3)} €/l`}
            emptyText="Zatiaľ žiadne tankovania. Graf ceny sa zobrazí po prvom tankovaní." />
        </>
      ) : <EmptyVehicleState />}
    </>
  );
}
