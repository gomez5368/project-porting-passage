import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField, SegmentedControl } from "@/components/app/ui";
import { formatCurrency, formatNumber, isFullTankFillUp } from "@/lib/fuelCalculations";
import { parseDecimal } from "@/lib/parseDecimal";
import { FUEL_TYPES, type FillUp, type FuelType } from "@/types/fuel";

type PriceMode = "total" | "perLiter";
type FullTank = "yes" | "no";
type Errors = Partial<Record<"date" | "odometer" | "liters" | "price" | "tankLevel", string>>;

function todayIso() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}
function isValidIsoDate(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y = 0, m = 0, d = 0] = v.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

export function FillUpForm({ latestOdometer, initialFillUp, onSubmit }: { latestOdometer: number; initialFillUp?: FillUp; onSubmit: (i: Omit<FillUp, "id" | "vehicleId">) => void }) {
  const [date, setDate] = useState(() => initialFillUp?.date ?? todayIso());
  const [odometer, setOdometer] = useState(() => initialFillUp ? String(initialFillUp.odometer) : "");
  const [liters, setLiters] = useState(() => initialFillUp ? String(initialFillUp.liters) : "");
  const [priceMode, setPriceMode] = useState<PriceMode>("total");
  const [priceValue, setPriceValue] = useState(() => initialFillUp ? String(initialFillUp.totalCost) : "");
  const [fuelType, setFuelType] = useState<FuelType>(initialFillUp?.fuelType ?? "Benzín");
  const [full, setFull] = useState<FullTank>(initialFillUp && isFullTankFillUp(initialFillUp) ? "yes" : "no");
  const [tankLevel, setTankLevel] = useState(() => initialFillUp?.tankLevelPercent !== undefined ? String(initialFillUp.tankLevelPercent) : "");
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
    else if (!initialFillUp && o < latestOdometer) next.odometer = `Stav tachometra nesmie byť nižší ako ${formatNumber(latestOdometer)} km.`;
    if (!okL) next.liters = "Zadajte množstvo litrov väčšie ako 0.";
    if (!okP) next.price = priceMode === "total" ? "Zadajte celkovú cenu väčšiu ako 0." : "Zadajte cenu za liter väčšiu ako 0.";
    const percent = tankLevel.trim() === "" ? undefined : parseDecimal(tankLevel);
    if (percent !== undefined && (!Number.isFinite(percent) || percent < 0 || percent > 100)) next.tankLevel = "Zadajte hodnotu od 0 do 100 %.";
    setErrors(next);
    setSaved(null);
    if (Object.keys(next).length > 0 || total === null || perL === null) return;
    onSubmit({
      date, odometer: o, liters: l,
      totalCost: Math.round(total * 100) / 100,
      pricePerLiter: Math.round(perL * 1000) / 1000,
      fuelType, isFullTank: percent === undefined ? full === "yes" : percent === 100,
      ...(percent === undefined ? {} : { tankLevelPercent: percent }),
    });
    if (initialFillUp) return;
    setOdometer(""); setLiters(""); setPriceValue("");
    setTankLevel(""); setFull("no");
    setSaved("Tankovanie bolo uložené.");
  };

  return (
    <form onSubmit={submit} className={initialFillUp ? "space-y-5" : "panel space-y-5"}>
      <FormField label="Dátum tankovania" type="date" value={date} onChange={setDate} placeholder="RRRR-MM-DD" error={errors.date} />
      <FormField label="Aktuálny stav tachometra" value={odometer} onChange={setOdometer} inputMode="numeric"
        placeholder={`napr. ${formatNumber(latestOdometer + 1)}`} suffix="km" error={errors.odometer}
        hint={initialFillUp ? undefined : `Posledný zapísaný stav: ${formatNumber(latestOdometer)} km`} />
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
        <SegmentedControl options={["yes", "no"] as const} value={full} onChange={(value) => {
          setFull(value);
          if (value === "yes") setTankLevel("100");
          else if (parseDecimal(tankLevel) === 100) setTankLevel("");
        }} labels={{ yes: "Áno", no: "Nie" }} />
        <FormField label="Obsah nádrže po natankovaní" value={tankLevel} onChange={(value) => {
          setTankLevel(value);
          setFull(parseDecimal(value) === 100 ? "yes" : "no");
        }} inputMode="decimal" placeholder="napr. 75" suffix="%" error={errors.tankLevel} />
        <p className="text-sm text-muted-foreground">Spotreba sa počíta len medzi dvoma tankovaniami do plnej nádrže.</p>
      </div>
      {saved ? <p className="font-semibold text-success">{saved}</p> : null}
      <Button type="submit" size="lg" className="w-full">{initialFillUp ? "Uložiť zmeny" : "Uložiť tankovanie"}</Button>
    </form>
  );
}
