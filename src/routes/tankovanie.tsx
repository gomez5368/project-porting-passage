import { createFileRoute } from "@tanstack/react-router";
import { FillUpForm } from "@/components/app/FillUpForm";
import { EmptyVehicleState, ScreenHeader, VehicleSwitcher } from "@/components/app/ui";
import { useCarData } from "@/context/CarDataContext";
import { getLatestOdometer } from "@/lib/fuelCalculations";

export const Route = createFileRoute("/tankovanie")({
  head: () => ({
    meta: [
      { title: "Nové tankovanie – Spotreba auta" },
      { name: "description", content: "Zapíšte tankovanie: stav tachometra, litre, cenu a typ paliva." },
      { property: "og:title", content: "Nové tankovanie – Spotreba auta" },
      { property: "og:description", content: "Zapíšte tankovanie: stav tachometra, litre, cenu a typ paliva." },
    ],
  }),
  component: Refuel,
});

function Refuel() {
  const { vehicles, selectedVehicle, selectedFillUps, selectVehicle, addFillUps } = useCarData();
  return (
    <>
      <ScreenHeader title="Nové tankovanie" subtitle={selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : "Zapíšte nové tankovanie"} />
      {selectedVehicle ? (
        <>
          <VehicleSwitcher vehicles={vehicles} selectedId={selectedVehicle.id} onSelect={selectVehicle} />
          <FillUpForm key={selectedVehicle.id} latestOdometer={getLatestOdometer(selectedVehicle, selectedFillUps)}
            onSubmit={(i) => addFillUps([{ ...i, vehicleId: selectedVehicle.id }])} />
        </>
      ) : (
        <EmptyVehicleState />
      )}
    </>
  );
}
