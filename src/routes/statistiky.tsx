import { createFileRoute } from "@tanstack/react-router";
import { EmptyVehicleState, ScreenHeader, StatCard, TrendChart, VehicleSwitcher } from "@/components/app/ui";
import { useCarData } from "@/context/CarDataContext";
import { monthlyTotals } from "@/lib/monthlyTotals";
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
  const { vehicles, fillUps, costs, selectedVehicle, selectedFillUps, selectedCosts, selectVehicle } = useCarData();
  const months = monthlyTotals(selectedFillUps, selectedCosts);
  const categories = Object.entries(selectedCosts.reduce<Record<string, number>>((a, c) => ({ ...a, [c.category]: (a[c.category] ?? 0) + c.amount }), {})).sort((a, b) => b[1] - a[1]);
  const maxCat = categories[0]?.[1] ?? 0;
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
          <TrendChart title="Náklady po mesiacoch (palivo + ostatné)" tone="primary"
            points={months.map((m) => ({ label: `${m.month.slice(5)}/${m.month.slice(2, 4)}`, value: m.fuel + m.other }))}
            formatValue={(value) => `${formatNumber(value, 0)} €`}
            emptyText="Graf sa zobrazí po prvom zapísanom výdavku." />
          {categories.length > 0 ? (
            <section className="panel mt-4">
              <h2 className="mb-3 font-semibold">Ostatné náklady podľa kategórií</h2>
              {categories.map(([name, sum]) => (
                <div key={name} className="mb-2">
                  <div className="flex justify-between text-sm"><span>{name}</span><span className="tabular font-semibold">{formatNumber(sum, 2)} €</span></div>
                  <div className="mt-1 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-secondary" style={{ width: `${(sum / maxCat) * 100}%` }} /></div>
                </div>
              ))}
            </section>
          ) : null}
          {vehicles.length > 1 ? (
            <section className="panel mt-4 overflow-x-auto">
              <h2 className="mb-3 font-semibold">Porovnanie áut</h2>
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground"><tr><th className="py-1">Auto</th><th>l/100 km</th><th>Najazdené</th><th>€/km celkom</th></tr></thead>
                <tbody>
                  {vehicles.map((v) => {
                    const vf = fillUps.filter((f) => f.vehicleId === v.id);
                    const s = summarizeVehicle(v, vf);
                    const other = costs.filter((c) => c.vehicleId === v.id).reduce((a, c) => a + c.amount, 0);
                    return (
                      <tr key={v.id} className="tabular border-t border-border">
                        <td className="py-2 font-semibold">{v.brand} {v.model}</td>
                        <td>{s.averageConsumption !== null ? formatNumber(s.averageConsumption, 1) : "—"}</td>
                        <td>{formatNumber(s.totalKm)} km</td>
                        <td>{s.totalKm > 0 ? formatNumber((s.totalCost + other) / s.totalKm, 3) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ) : null}
        </>
      ) : <EmptyVehicleState />}
    </>
  );
}
