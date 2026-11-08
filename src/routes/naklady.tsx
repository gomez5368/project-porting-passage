import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EmptyVehicleState, FormField, ScreenHeader, VehicleSwitcher } from "@/components/app/ui";
import { useCarData } from "@/context/CarDataContext";
import { formatCurrency, formatDate, formatNumber } from "@/lib/fuelCalculations";
import { parseDecimal } from "@/lib/parseDecimal";
import { cn } from "@/lib/utils";
import { COST_CATEGORIES, type Cost } from "@/types/fuel";

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

function todayIso() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

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
        <CostForm onSubmit={(v) => addCost({ ...v, vehicleId: selectedVehicle.id, odometer: null })} />
      </section>

      <h2 className="mb-3 mt-6 font-semibold">{filter ? `${filter} (${list.length})` : `Všetky náklady (${list.length})`}</h2>
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

type CostValues = Pick<Cost, "date" | "amount" | "category" | "note">;

function CostForm({ initial, onSubmit }: { initial?: Cost; onSubmit: (v: CostValues) => void }) {
  const [date, setDate] = useState(() => initial?.date ?? todayIso());
  const [amount, setAmount] = useState(() => initial ? String(initial.amount).replace(".", ",") : "");
  const [category, setCategory] = useState<string>(initial?.category ?? "Údržba");
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const categories: string[] = [...COST_CATEGORIES];
  if (!categories.includes(category)) categories.push(category);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const a = parseDecimal(amount);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Zadajte platný dátum.");
    if (!Number.isFinite(a) || a <= 0) return setError("Zadajte sumu väčšiu ako 0.");
    setError(null);
    onSubmit({ date, amount: Math.round(a * 100) / 100, category, note: note.trim() });
    if (!initial) { setAmount(""); setNote(""); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Dátum" type="date" value={date} onChange={setDate} />
        <FormField label="Suma" value={amount} onChange={setAmount} inputMode="decimal" placeholder="napr. 120,50" suffix="€" />
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-muted-foreground">Kategória</span>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="h-11 w-full rounded-lg border border-border bg-muted px-3 outline-none focus:ring-2 focus:ring-ring">
          {categories.map((c) => <option key={c}>{c}</option>)}
        </select>
      </label>
      <FormField label="Poznámka" value={note} onChange={setNote} placeholder="napr. výmena brzdových platničiek" />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" size="lg">{initial ? "Uložiť zmeny" : "Uložiť náklad"}</Button>
    </form>
  );
}
