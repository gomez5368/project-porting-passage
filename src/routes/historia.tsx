import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { serializeFillUpsCsv } from "@/lib/fillUpsCsv";
import { downloadFile } from "@/lib/downloadFile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FillUpForm } from "@/components/app/FillUpForm";
import { JsonBackupSection } from "@/components/app/JsonBackupSection";
import type { FillUp } from "@/types/fuel";
import { EmptyVehicleState, FillUpRow, ImportSpotrebaCard, ScreenHeader, VehicleSwitcher } from "@/components/app/ui";
import { useCarData } from "@/context/CarDataContext";
import { buildConsumptionSegments, sortFillUps } from "@/lib/fuelCalculations";
import { cn } from "@/lib/utils";

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

const PAGE = 50;

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={cn("rounded-full border px-3 py-1 text-sm font-semibold transition-colors",
        active ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:bg-card")}>
      {label}
    </button>
  );
}

function History() {
  const { vehicles, selectedVehicle, selectedFillUps, selectVehicle, deleteFillUp, addFillUps, updateFillUp } = useCarData();
  const [editing, setEditing] = useState<FillUp | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE);
  const consumption = new Map(buildConsumptionSegments(selectedFillUps).map((s) => [s.fillUpId, s.consumption]));
  const newest = sortFillUps(selectedFillUps).reverse();
  const years = [...new Set(newest.map((f) => f.date.slice(0, 4)))].sort().reverse();
  const filtered = year ? newest.filter((f) => f.date.startsWith(year)) : newest;
  const shown = filtered.slice(0, visible);
  const pickYear = (y: string | null) => { setYear(y); setVisible(PAGE); };
  return (
    <>
      <ScreenHeader title="História" subtitle={selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model} · ${selectedFillUps.length} tankovaní` : "Všetky zapísané tankovania"} />
      <JsonBackupSection />
      {selectedVehicle ? (
        <>
          <VehicleSwitcher vehicles={vehicles} selectedId={selectedVehicle.id} onSelect={selectVehicle} />
          <ImportSpotrebaCard existingFillUps={selectedFillUps}
            onImport={(r) => addFillUps(r.map((x) => ({ ...x, vehicleId: selectedVehicle.id })))} />
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Všetky tankovania</h2>
            <Button variant="outline" size="sm" disabled={selectedFillUps.length === 0} onClick={() => downloadFile(
              new Blob([serializeFillUpsCsv(selectedFillUps, vehicles)], { type: "text/csv;charset=utf-8" }), "tankovania.csv",
            )}><Download className="size-4" />Exportovať CSV</Button>
          </div>
          {years.length > 1 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              <FilterChip label="Všetky roky" active={year === null} onClick={() => pickYear(null)} />
              {years.map((y) => <FilterChip key={y} label={y} active={year === y} onClick={() => pickYear(y)} />)}
            </div>
          ) : null}
          {filtered.length === 0 ? (
            <div className="panel text-muted-foreground">V tomto roku zatiaľ nie je žiadne tankovanie.</div>
          ) : (
            shown.map((f) => <FillUpRow key={f.id} fillUp={f} consumption={consumption.get(f.id) ?? null} onDelete={deleteFillUp} onEdit={setEditing} />)
          )}
          {filtered.length > shown.length ? (
            <Button variant="outline" className="w-full" onClick={() => setVisible((v) => v + PAGE)}>
              Zobraziť ďalších {Math.min(PAGE, filtered.length - shown.length)} z {filtered.length}
            </Button>
          ) : null}
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
