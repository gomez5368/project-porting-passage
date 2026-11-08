import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FillUpForm } from "@/components/app/FillUpForm";
import { JsonBackupSection } from "@/components/app/JsonBackupSection";
import type { FillUp } from "@/types/fuel";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: History,
});

function History() {
  const { vehicles, selectedVehicle, selectedFillUps, selectVehicle, deleteFillUp, addFillUps, updateFillUp } = useCarData();
  const [editing, setEditing] = useState<FillUp | null>(null);
  const consumption = new Map(buildConsumptionSegments(selectedFillUps).map((s) => [s.fillUpId, s.consumption]));
  const newest = sortFillUps(selectedFillUps).reverse();
  return (
    <>
      <ScreenHeader title="História" subtitle={selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model} · ${selectedFillUps.length} tankovaní` : "Všetky zapísané tankovania"} />
      <JsonBackupSection />
      {selectedVehicle ? (
        <>
          <VehicleSwitcher vehicles={vehicles} selectedId={selectedVehicle.id} onSelect={selectVehicle} />
          <ImportSpotrebaCard existingFillUps={selectedFillUps}
            onImport={(r) => addFillUps(r.map((x) => ({ ...x, vehicleId: selectedVehicle.id })))} />
          {newest.length === 0 ? (
            <div className="panel text-muted-foreground">Zatiaľ nemáte žiadne tankovanie. Zapíšte prvé na karte Tankovanie.</div>
          ) : (
            newest.map((f) => <FillUpRow key={f.id} fillUp={f} consumption={consumption.get(f.id) ?? null} onDelete={deleteFillUp} onEdit={setEditing} />)
          )}
        </>
      ) : (
        <EmptyVehicleState />
      )}
      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Upraviť tankovanie</DialogTitle></DialogHeader>
          {editing ? <FillUpForm key={editing.id} latestOdometer={0} initialFillUp={editing} onSubmit={(changes) => {
            updateFillUp(editing.id, changes);
            setEditing(null);
          }} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
