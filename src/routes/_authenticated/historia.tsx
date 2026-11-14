import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, Fuel, MapPin, Pencil, Trash2 } from "lucide-react";
import { ReceiptImport } from "@/components/app/ReceiptImport";
import { formatCurrency, formatDate, formatNumber } from "@/lib/fuelCalculations";
import { Button } from "@/components/ui/button";
import { serializeFillUpsCsv } from "@/lib/fillUpsCsv";
import { downloadFile } from "@/lib/downloadFile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FillUpForm } from "@/components/app/FillUpForm";
import { JsonBackupSection } from "@/components/app/JsonBackupSection";
import type { FillUp } from "@/types/fuel";
import { EmptyVehicleState, HistoryCostsNav, ImportSpotrebaCard, ScreenHeader, VehicleSwitcher } from "@/components/app/ui";
import { useCarData } from "@/context/CarDataContext";
import { buildConsumptionSegments } from "@/lib/fuelCalculations";
import { vehicleFuelType } from "@/lib/fuelTypes";
import { estimateTankLevel, previousFillUp } from "@/lib/tankEstimate";
import { summarizeVehicle as summarize } from "@/lib/fuelCalculations";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/historia")({
  head: () => ({
    meta: [
      { title: "História tankovaní – Spotreba auta" },
      { name: "description", content: "Chronologický denník tankovaní zoradený podľa kilometrov, s úpravou a exportom." },
      { property: "og:title", content: "História tankovaní – Spotreba auta" },
      { property: "og:description", content: "Chronologický denník tankovaní zoradený podľa kilometrov, s úpravou a exportom." },
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

/** Highest odometer first; equal km fall back to the newest date. */
function sortFillUpsByOdometer(fillUps: FillUp[]): FillUp[] {
  return [...fillUps].sort((a, b) => (b.odometer - a.odometer) || b.date.localeCompare(a.date));
}

function History() {
  const { vehicles, selectedVehicle, selectedFillUps, selectVehicle, deleteFillUp, addFillUps, updateFillUp } = useCarData();
  const [editing, setEditing] = useState<FillUp | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE);
  const [query, setQuery] = useState("");
  const consumption = new Map(buildConsumptionSegments(selectedFillUps).map((s) => [s.fillUpId, s.consumption]));
  const newest = sortFillUpsByOdometer(selectedFillUps);
  const years = [...new Set(newest.map((f) => f.date.slice(0, 4)))].sort().reverse();
  const q = query.trim().toLowerCase();
  const filtered = newest.filter((f) => (!year || f.date.startsWith(year))
    && (!q || `${f.station ?? ""} ${f.fuelType} ${f.fuelGrade ?? ""}`.toLowerCase().includes(q)));
  const shown = filtered.slice(0, visible);
  const pickYear = (y: string | null) => { setYear(y); setVisible(PAGE); };
  return (
    <>
      <ScreenHeader title="História tankovaní" subtitle={selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model} · ${selectedFillUps.length} tankovaní` : "Všetky zapísané tankovania"} />
      <HistoryCostsNav />
      <JsonBackupSection />
      <ReceiptImport />
      {selectedVehicle ? (
        <>
          <VehicleSwitcher vehicles={vehicles} selectedId={selectedVehicle.id} onSelect={selectVehicle} />
          <ImportSpotrebaCard existingFillUps={selectedFillUps}
            onImport={(r) => addFillUps(r.map((x) => ({ ...x, vehicleId: selectedVehicle.id })))} />
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">Denník tankovaní ({filtered.length})</h2>
            <Button variant="outline" size="sm" disabled={selectedFillUps.length === 0} onClick={() => downloadFile(
              new Blob([serializeFillUpsCsv(selectedFillUps, vehicles)], { type: "text/csv;charset=utf-8" }), "tankovania.csv",
            )}><Download className="size-4" />Tankovania CSV</Button>
          </div>
          <input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setVisible(PAGE); }} placeholder="Hľadať stanicu, palivo alebo variant…"
            aria-label="Hľadať v denníku tankovaní" className="mb-4 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          {years.length > 1 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              <FilterChip label="Všetky roky" active={year === null} onClick={() => pickYear(null)} />
              {years.map((y) => <FilterChip key={y} label={y} active={year === y} onClick={() => pickYear(y)} />)}
            </div>
          ) : null}
          {filtered.length === 0 ? (
            <div className="panel text-muted-foreground">Tomuto filtru nezodpovedá žiadne tankovanie.</div>
          ) : (
            shown.map((f) => <FillUpHistoryRow key={f.id} fillUp={f} consumption={consumption.get(f.id) ?? null}
              confirming={confirmId === f.id} onConfirm={setConfirmId}
              onEdit={() => setEditing(f)}
              onDelete={() => { deleteFillUp(f.id); setConfirmId(null); }} />)
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
          {editing && selectedVehicle ? <FillUpForm key={editing.id} latestOdometer={0} vehicleFuelType={vehicleFuelType(selectedVehicle, selectedFillUps)} estimate={(o, l) => estimateTankLevel({ capacity: selectedVehicle.tankCapacity, previous: previousFillUp(selectedFillUps, o, editing.id), averageConsumption: summarize(selectedVehicle, selectedFillUps).averageConsumption, odometer: o, liters: l })} initialFillUp={editing} onSubmit={(changes) => {
            updateFillUp(editing.id, changes);
            setEditing(null);
          }} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function FillUpHistoryRow({ fillUp, consumption, confirming, onConfirm, onEdit, onDelete }: {
  fillUp: FillUp; consumption: number | null; confirming: boolean;
  onConfirm: (id: string | null) => void; onEdit: () => void; onDelete: () => void;
}) {
  return (
    <article className="panel mb-2 flex gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Fuel className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">{fillUp.fuelType}</span>
          {fillUp.fuelGrade ? <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold">{fillUp.fuelGrade === "premium" ? "Plus / Premium" : "Normal"}</span> : null}
          <span className="text-sm text-muted-foreground">{formatDate(fillUp.date)}</span>
        </div>
        <p className="tabular mt-1.5 text-lg font-bold">{formatNumber(fillUp.odometer)} km</p>
        {fillUp.station ? <p className="mt-1 flex items-start gap-1.5 text-sm font-medium"><MapPin className="mt-0.5 size-4 shrink-0 text-primary" /><span>{fillUp.station}</span></p> : null}
        <p className="text-sm text-muted-foreground">
          {`${formatNumber(fillUp.liters, 2)} l · ${formatNumber(fillUp.pricePerLiter, 3)} €/l${fillUp.tankLevelPercent !== undefined ? ` · nádrž ${formatNumber(fillUp.tankLevelPercent, 0)} %` : ""}${consumption !== null ? ` · ${formatNumber(consumption, 1)} l/100 km` : ""}`}
        </p>
      </div>
      <div className="text-right">
        <p className="tabular font-bold">{formatCurrency(fillUp.totalCost)}</p>
        {confirming ? (
          <div className="mt-1 flex gap-1">
            <Button size="sm" variant="outline" onClick={() => onConfirm(null)}>Zrušiť</Button>
            <Button size="sm" variant="destructive" onClick={onDelete}>Vymazať</Button>
          </div>
        ) : (
          <div className="mt-2 flex justify-end gap-1">
            <Button size="icon" variant="ghost" aria-label="Upraviť tankovanie" onClick={onEdit}><Pencil /></Button>
            <Button size="icon" variant="ghost" aria-label="Vymazať tankovanie" className="text-destructive hover:text-destructive" onClick={() => onConfirm(fillUp.id)}><Trash2 /></Button>
          </div>
        )}
      </div>
    </article>
  );
}
