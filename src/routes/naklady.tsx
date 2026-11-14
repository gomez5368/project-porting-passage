import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EmptyVehicleState, HistoryCostsNav, ScreenHeader, VehicleSwitcher } from "@/components/app/ui";
import { useCarData } from "@/context/CarDataContext";
import { CostForm } from "@/components/app/CostForm";
import { costsCsvFilename, serializeCostsCsv } from "@/lib/costsCsv";
import { downloadFile } from "@/lib/downloadFile";
import { formatCurrency, formatDate, formatNumber } from "@/lib/fuelCalculations";
import { cn } from "@/lib/utils";
import type { Cost } from "@/types/fuel";

export const Route = createFileRoute("/naklady")({
  head: () => ({
    meta: [
      { title: "Náklady na auto – Spotreba auta" },
      { name: "description", content: "Servis, poistka, pneumatiky, STK a ďalšie výdavky na auto prehľadne na jednom mieste." },
      { property: "og:title", content: "Náklady na auto – Spotreba auta" },
      { property: "og:description", content: "Servis, poistka, pneumatiky, STK a ďalšie výdavky na auto prehľadne na jednom mieste." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Costs,
});


function Costs() {
  const { vehicles, selectedVehicle, selectedCosts, selectedFillUps, selectVehicle, addCost, deleteCost, updateCost } = useCarData();
  const [editing, setEditing] = useState<Cost | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  if (!selectedVehicle) return (<><ScreenHeader title="Náklady" subtitle="Servis, poistka a ďalšie výdavky" /><EmptyVehicleState /></>);

  const fuelTotal = selectedFillUps.reduce((s, f) => s + f.totalCost, 0);
  const otherTotal = selectedCosts.reduce((s, c) => s + c.amount, 0);
  const byCategory = [...selectedCosts.reduce((m, c) => m.set(c.category, (m.get(c.category) ?? 0) + c.amount), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1]);
  const list = [...selectedCosts].filter((c) => !filter || c.category === filter).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <ScreenHeader title="Náklady" subtitle={`${selectedVehicle.brand} ${selectedVehicle.model}`} />
      <HistoryCostsNav />
      <VehicleSwitcher vehicles={vehicles} selectedId={selectedVehicle.id} onSelect={selectVehicle} />

      <div className="grid grid-cols-3 gap-3">
        {[["Palivo", fuelTotal], ["Ostatné", otherTotal], ["Spolu", fuelTotal + otherTotal]].map(([l, v]) => (
          <div key={l as string} className="panel">
            <p className="text-sm text-muted-foreground">{l}</p>
            <p className="tabular mt-1 text-xl font-bold">{formatNumber(v as number, 2)} €</p>
          </div>
        ))}
      </div>

      {byCategory.length > 0 ? (
        <section className="panel mt-4">
          <h2 className="mb-3 font-semibold">Podľa kategórie</h2>
          <ul className="space-y-2">
            {byCategory.map(([cat, sum]) => (
              <li key={cat}>
                <button type="button" onClick={() => setFilter(filter === cat ? null : cat)} className="w-full text-left">
                  <div className="flex justify-between text-sm">
                    <span className={cn("font-semibold", filter === cat && "text-primary")}>{cat}</span>
                    <span className="tabular">{formatCurrency(sum)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-secondary" style={{ width: `${(sum / otherTotal) * 100}%` }} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel mt-4">
        <h2 className="mb-4 font-semibold">Pridať náklad</h2>
        <CostForm onSubmit={(v) => addCost({ ...v, vehicleId: selectedVehicle.id })} />
      </section>

      <div className="mb-3 mt-6 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{filter ? `${filter} (${list.length})` : `Všetky náklady (${list.length})`}</h2>
        <Button
          variant="outline"
          size="sm"
          disabled={list.length === 0}
          onClick={() => downloadFile(new Blob([serializeCostsCsv(list, vehicles)], { type: "text/csv;charset=utf-8" }), costsCsvFilename(selectedVehicle))}
        >
          <Download /> Exportovať CSV
        </Button>
      </div>
      {list.length === 0 ? <div className="panel text-muted-foreground">Zatiaľ žiadne náklady.</div> : list.map((c) => (
        <article key={c.id} className="panel mb-2 flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{c.category}</p>
            <p className="text-sm text-muted-foreground">{formatDate(c.date)}{c.odometer ? ` · ${formatNumber(c.odometer)} km` : ""}</p>
            {c.note ? <p className="mt-1 text-sm">{c.note}</p> : null}
          </div>
          <div className="text-right">
            <p className="tabular font-bold">{formatCurrency(c.amount)}</p>
            {confirmId === c.id ? (
              <div className="mt-1 flex gap-1">
                <Button size="sm" variant="outline" onClick={() => setConfirmId(null)}>Zrušiť</Button>
                <Button size="sm" variant="destructive" onClick={() => deleteCost(c.id)}>Vymazať</Button>
              </div>
            ) : (
              <div className="mt-1 flex justify-end gap-3">
              <button type="button" aria-label="Upraviť náklad" onClick={() => setEditing(c)} className="text-muted-foreground hover:text-foreground"><Pencil className="size-4" /></button>
              <button type="button" aria-label="Vymazať náklad" onClick={() => setConfirmId(c.id)} className="text-destructive"><Trash2 className="size-4" /></button>
              </div>
            )}
          </div>
        </article>
      ))}
      <Dialog open={editing !== null} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Upraviť náklad</DialogTitle></DialogHeader>
          {editing ? <CostForm key={editing.id} initial={editing} onSubmit={(v) => { updateCost(editing.id, v); setEditing(null); }} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

