import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Fuel, Pencil, Trash2, Wrench } from "lucide-react";
import { CostForm } from "@/components/app/CostForm";
import { buildJournal, type JournalEntry } from "@/lib/journal";
import { formatCurrency, formatDate, formatNumber } from "@/lib/fuelCalculations";
import { Button } from "@/components/ui/button";
import { serializeFillUpsCsv } from "@/lib/fillUpsCsv";
import { downloadFile } from "@/lib/downloadFile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FillUpForm } from "@/components/app/FillUpForm";
import { JsonBackupSection } from "@/components/app/JsonBackupSection";
import type { Cost, FillUp } from "@/types/fuel";
import { EmptyVehicleState, HistoryCostsNav, ImportSpotrebaCard, ScreenHeader, VehicleSwitcher } from "@/components/app/ui";
import { useCarData } from "@/context/CarDataContext";
import { buildConsumptionSegments } from "@/lib/fuelCalculations";
import { vehicleFuelType } from "@/lib/fuelTypes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/historia")({
  head: () => ({
    meta: [
      { title: "História tankovaní – Spotreba auta" },
      { name: "description", content: "Spoločný denník tankovaní a nákladov zoradený podľa kilometrov." },
      { property: "og:title", content: "História tankovaní – Spotreba auta" },
      { property: "og:description", content: "Spoločný denník tankovaní a nákladov zoradený podľa kilometrov." },
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
  const { vehicles, selectedVehicle, selectedFillUps, selectedCosts, selectVehicle, deleteFillUp, deleteCost, addFillUps, updateFillUp, updateCost } = useCarData();
  const [editing, setEditing] = useState<FillUp | null>(null);
  const [editingCost, setEditingCost] = useState<Cost | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE);
  const consumption = new Map(buildConsumptionSegments(selectedFillUps).map((s) => [s.fillUpId, s.consumption]));
  const newest = buildJournal(selectedFillUps, selectedCosts);
  const years = [...new Set(newest.map((f) => f.date.slice(0, 4)))].sort().reverse();
  const filtered = year ? newest.filter((f) => f.date.startsWith(year)) : newest;
  const shown = filtered.slice(0, visible);
  const pickYear = (y: string | null) => { setYear(y); setVisible(PAGE); };
  return (
    <>
      <ScreenHeader title="História a náklady" subtitle={selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model} · ${selectedFillUps.length} tankovaní · ${selectedCosts.length} nákladov` : "Všetky zapísané tankovania"} />
      <HistoryCostsNav />
      <JsonBackupSection />
      {selectedVehicle ? (
        <>
          <VehicleSwitcher vehicles={vehicles} selectedId={selectedVehicle.id} onSelect={selectVehicle} />
          <ImportSpotrebaCard existingFillUps={selectedFillUps}
            onImport={(r) => addFillUps(r.map((x) => ({ ...x, vehicleId: selectedVehicle.id })))} />
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Denník výdavkov ({filtered.length})</h2>
            <Button variant="outline" size="sm" disabled={selectedFillUps.length === 0} onClick={() => downloadFile(
              new Blob([serializeFillUpsCsv(selectedFillUps, vehicles)], { type: "text/csv;charset=utf-8" }), "tankovania.csv",
            )}><Download className="size-4" />Tankovania CSV</Button>
          </div>
          {years.length > 1 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              <FilterChip label="Všetky roky" active={year === null} onClick={() => pickYear(null)} />
              {years.map((y) => <FilterChip key={y} label={y} active={year === y} onClick={() => pickYear(y)} />)}
            </div>
          ) : null}
          {filtered.length === 0 ? (
            <div className="panel text-muted-foreground">V tomto roku zatiaľ nie je žiadny záznam.</div>
          ) : (
            shown.map((e) => <JournalRow key={e.kind + e.id} entry={e} consumption={e.kind === "fuel" ? consumption.get(e.id) ?? null : null}
              confirming={confirmId === e.id} onConfirm={setConfirmId}
              onEdit={() => e.kind === "fuel" ? setEditing(e.fillUp) : setEditingCost(e.cost)}
              onDelete={() => { if (e.kind === "fuel") deleteFillUp(e.id); else deleteCost(e.id); setConfirmId(null); }} />)
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
          {editing && selectedVehicle ? <FillUpForm key={editing.id} latestOdometer={0} vehicleFuelType={vehicleFuelType(selectedVehicle, selectedFillUps)} initialFillUp={editing} onSubmit={(changes) => {
            updateFillUp(editing.id, changes);
            setEditing(null);
          }} /> : null}
        </DialogContent>
      </Dialog>
      <Dialog open={editingCost !== null} onOpenChange={(open) => { if (!open) setEditingCost(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Upraviť náklad</DialogTitle></DialogHeader>
          {editingCost ? <CostForm key={editingCost.id} initial={editingCost} onSubmit={(v) => { updateCost(editingCost.id, v); setEditingCost(null); }} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function JournalRow({ entry, consumption, confirming, onConfirm, onEdit, onDelete }: {
  entry: JournalEntry; consumption: number | null; confirming: boolean;
  onConfirm: (id: string | null) => void; onEdit: () => void; onDelete: () => void;
}) {
  const fuel = entry.kind === "fuel";
  const amount = fuel ? entry.fillUp.totalCost : entry.cost.amount;
  return (
    <article className="panel mb-2 flex gap-3">
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", fuel ? "bg-accent text-accent-foreground" : "bg-secondary/15 text-secondary")}>
        {fuel ? <Fuel className="size-5" /> : <Wrench className="size-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", fuel ? "bg-accent text-accent-foreground" : "bg-secondary/15 text-secondary")}>
            {fuel ? "Palivo" : entry.cost.category}
          </span>
          {fuel && entry.fillUp.fuelGrade ? <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold">{entry.fillUp.fuelGrade === "premium" ? "Plus / Premium" : "Normal"}</span> : null}
          <span className="text-sm text-muted-foreground">{formatDate(entry.date)}</span>
        </div>
        <p className="tabular mt-1.5 text-lg font-bold">{entry.odometer !== null ? `${formatNumber(entry.odometer)} km` : "bez km"}</p>
        <p className="text-sm text-muted-foreground">
          {fuel
            ? `${formatNumber(entry.fillUp.liters, 2)} l · ${formatNumber(entry.fillUp.pricePerLiter, 3)} €/l${entry.fillUp.tankLevelPercent !== undefined ? ` · nádrž ${formatNumber(entry.fillUp.tankLevelPercent, 0)} %` : ""}${consumption !== null ? ` · ${formatNumber(consumption, 1)} l/100 km` : ""}`
            : entry.cost.note || "Bez popisu"}
        </p>
      </div>
      <div className="text-right">
        <p className="tabular font-bold">{formatCurrency(amount)}</p>
        {confirming ? (
          <div className="mt-1 flex gap-1">
            <Button size="sm" variant="outline" onClick={() => onConfirm(null)}>Zrušiť</Button>
            <Button size="sm" variant="destructive" onClick={onDelete}>Vymazať</Button>
          </div>
        ) : (
          <div className="mt-2 flex justify-end gap-1">
            <Button size="icon" variant="ghost" aria-label={fuel ? "Upraviť tankovanie" : "Upraviť náklad"} onClick={onEdit}><Pencil /></Button>
            <Button size="icon" variant="ghost" aria-label="Vymazať záznam" className="text-destructive hover:text-destructive" onClick={() => onConfirm(entry.id)}><Trash2 /></Button>
          </div>
        )}
      </div>
    </article>
  );
}
