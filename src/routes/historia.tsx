import { createFileRoute } from "@tanstack/react-router";
import { EmptyVehicleState, FillUpRow, ImportSpotrebaCard, ScreenHeader, VehicleSwitcher } from "@/components/app/ui";
import { useCarData } from "@/context/CarDataContext";
import { buildConsumptionSegments, sortFillUps } from "@/lib/fuelCalculations";

export const Route = createFileRoute("/historia")({
  head: () => ({
    meta: [
      { title: "História tankovaní – Spotreba auta" },
      { name: "description", content: "Všetky tankovania so spotrebou a import starých dát zo spotreba.sk." },
      { property: "og:title", content: "História tankovaní – Spotreba auta" },
      { property: "og:description", content: "Všetky tankovania so spotrebou a import starých dát zo spotreba.sk." },
    ],
  }),
  component: History,
});

function History() {
  const { vehicles, selectedVehicle, selectedFillUps, selectVehicle, deleteFillUp, addFillUps } = useCarData();
  const consumption = new Map(buildConsumptionSegments(selectedFillUps).map((s) => [s.fillUpId, s.consumption]));
  const newest = sortFillUps(selectedFillUps).reverse();
  return (
    <>
      <ScreenHeader title="História" subtitle={selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model} · ${selectedFillUps.length} tankovaní` : "Všetky zapísané tankovania"} />
      {selectedVehicle ? (
        <>
          <VehicleSwitcher vehicles={vehicles} selectedId={selectedVehicle.id} onSelect={selectVehicle} />
          <ImportSpotrebaCard existingFillUps={selectedFillUps}
            onImport={(r) => addFillUps(r.map((x) => ({ ...x, vehicleId: selectedVehicle.id })))} />
          {newest.length === 0 ? (
            <div className="panel text-muted-foreground">Zatiaľ nemáte žiadne tankovanie. Zapíšte prvé na karte Tankovanie.</div>
          ) : (
            newest.map((f) => <FillUpRow key={f.id} fillUp={f} consumption={consumption.get(f.id) ?? null} onDelete={deleteFillUp} />)
          )}
        </>
      ) : (
        <EmptyVehicleState />
      )}
    </>
  );
}
