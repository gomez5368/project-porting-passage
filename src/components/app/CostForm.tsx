import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormField } from "@/components/app/ui";
import { parseDecimal } from "@/lib/parseDecimal";
import { COST_CATEGORIES, type Cost } from "@/types/fuel";

function todayIso() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

type CostValues = Pick<Cost, "date" | "amount" | "category" | "note" | "odometer">;

export function CostForm({ initial, onSubmit }: { initial?: Cost; onSubmit: (v: CostValues) => void }) {
  const [date, setDate] = useState(() => initial?.date ?? todayIso());
  const [amount, setAmount] = useState(() => initial ? String(initial.amount).replace(".", ",") : "");
  const [category, setCategory] = useState<string>(initial?.category ?? "Údržba");
  const [odo, setOdo] = useState(() => initial?.odometer != null ? String(initial.odometer) : "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const categories: string[] = [...COST_CATEGORIES];
  if (!categories.includes(category)) categories.push(category);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const a = parseDecimal(amount);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Zadajte platný dátum.");
    if (!Number.isFinite(a) || a <= 0) return setError("Zadajte sumu väčšiu ako 0.");
    const o = odo.trim() === "" ? null : parseDecimal(odo);
    if (o !== null && (!Number.isFinite(o) || o < 0)) return setError("Zadajte platný stav tachometra.");
    setError(null);
    onSubmit({ date, amount: Math.round(a * 100) / 100, category, note: note.trim(), odometer: o === null ? null : Math.round(o) });
    if (!initial) { setAmount(""); setNote(""); setOdo(""); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Dátum" type="date" value={date} onChange={setDate} />
        <FormField label="Suma" value={amount} onChange={setAmount} inputMode="decimal" placeholder="napr. 120,50" suffix="€" />
      </div>
      <div>
        <label htmlFor="cost-category" className="mb-1.5 block text-sm font-semibold text-muted-foreground">Kategória</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger id="cost-category" className="h-11 bg-popover text-popover-foreground"><SelectValue /></SelectTrigger>
          <SelectContent>{categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <FormField label="Stav tachometra" value={odo} onChange={setOdo} inputMode="numeric" placeholder="napr. 145200" suffix="km" hint="Voliteľné – podľa neho sa radí denník." />
      <FormField label="Poznámka" value={note} onChange={setNote} placeholder="napr. výmena brzdových platničiek" />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" size="lg">{initial ? "Uložiť zmeny" : "Uložiť náklad"}</Button>
    </form>
  );
}
