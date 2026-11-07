import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, SegmentedControl } from "@/components/app/ui";
import { formatCurrency, formatNumber } from "@/lib/fuelCalculations";
import { parseDecimal } from "@/lib/parseDecimal";
import { FUEL_TYPES, type FillUp, type FuelType } from "@/types/fuel";

type PriceMode = "total" | "perLiter";
type FullTank = "yes" | "no";
type Errors = Partial<Record<"date" | "odometer" | "liters" | "price", string>>;

function todayIso() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}
function isValidIsoDate(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function FillUpForm({ latestOdometer, onSubmit }: { latestOdometer: number; onSubmit: (i: Omit<FillUp, "id" | "vehicleId">) => void }) {
  const [date, setDate] = useState(todayIso);
  const [odometer, setOdometer] = useState("");
  const [liters, setLiters] = useState("");
  const [priceMode, setPriceMode] = useState<PriceMode>("total");
  const [priceValue, setPriceValue] = useState("");
  const [fuelType, setFuelType] = useState<FuelType>("Benzín");
  const [full, setFull] = useState<FullTank>("yes");
  const [errors, setErrors] = useState<Errors>({});
  const [saved, setSaved] = useState<string | null>(null);

  const l = parseDecimal(liters);
  const p = parseDecimal(priceValue);
  const okL = Number.isFinite(l) && l > 0;
  const okP = Number.isFinite(p) && p > 0;
  const total = okL && okP ? (priceMode === "total" ? p : p * l) : null;
  const perL = okL && okP ? (priceMode === "perLiter" ? p : p / l) : null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const o = parseDecimal(odometer);
    const next: Errors = {};
    if (!isValidIsoDate(date)) next.date = "Zadajte dátum vo formáte RRRR-MM-DD.";
    if (!Number.isInteger(o) || o < 0) next.odometer = "Zadajte celé číslo v km.";
    else if (o < latestOdometer) next.odometer = `Stav tachometra nesmie byť nižší ako ${formatNumber(latestOdometer)} km.`;
    if (!okL) next.liters = "Zadajte množstvo litrov väčšie ako 0.";
    if (!okP) next.price = priceMode === "total" ? "Zadajte celkovú cenu väčšiu ako 0." : "Zadajte cenu za liter väčšiu ako 0.";
    setErrors(next);
    setSaved(null);
    if (Object.keys(next).length > 0 || total === null || perL === null) return;
    onSubmit({
      date, odometer: o, liters: l,
      totalCost: Math.round(total * 100) / 100,
      pricePerLiter: Math.round(perL * 1000) / 1000,
      fuelType, isFullTank: full === "yes",
    });
    setOdometer(""); setLiters(""); setPriceValue("");
    setSaved("Tankovanie bolo uložené.");
  };

  return (
    <form onSubmit={submit} className="panel space-y-5">
      <FormField label="Dátum tankovania" type="date" value={date} onChange={setDate} placeholder="RRRR-MM-DD" error={errors.date} />
      <FormField label="Aktuálny stav tachometra" value={odometer} onChange={setOdometer} inputMode="numeric"
        placeholder={`napr. ${formatNumber(latestOdometer + 1)}`} suffix="km" error={errors.odometer}
        hint={`Posledný zapísaný stav: ${formatNumber(latestOdometer)} km`} />
      <FormField label="Natankované litre" value={liters} onChange={setLiters} inputMode="decimal" placeholder="napr. 45,5" suffix="l" error={errors.liters} />
      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted-foreground">Zadajte</p>
        <SegmentedControl options={["total", "perLiter"] as const} value={priceMode} onChange={setPriceMode} labels={{ total: "Celková cena", perLiter: "Cena za liter" }} />
        <FormField label={priceMode === "total" ? "Celková cena" : "Cena za liter"} value={priceValue} onChange={setPriceValue}
          inputMode="decimal" placeholder={priceMode === "total" ? "napr. 72,90" : "napr. 1,599"} suffix="€" error={errors.price}
          hint={total !== null && perL !== null ? (priceMode === "total" ? `Cena za liter: ${formatCurrency(perL, 3)}` : `Celková cena: ${formatCurrency(total)}`) : undefined} />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted-foreground">Typ paliva</p>
        <SegmentedControl options={FUEL_TYPES} value={fuelType} onChange={setFuelType} />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted-foreground">Natankované do plnej nádrže?</p>
        <SegmentedControl options={["yes", "no"] as const} value={full} onChange={setFull} labels={{ yes: "Áno", no: "Nie" }} />
        <p className="text-sm text-muted-foreground">Spotreba sa počíta len medzi dvoma tankovaniami do plnej nádrže.</p>
      </div>
      {saved ? <p className="font-semibold text-success">{saved}</p> : null}
      <Button type="submit" size="lg" className="w-full">Uložiť tankovanie</Button>
    </form>
  );
}
