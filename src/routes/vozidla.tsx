import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField, ScreenHeader } from "@/components/app/ui";
import { BackupImportCard } from "@/components/app/BackupImportCard";
import { useCarData } from "@/context/CarDataContext";
import { formatNumber } from "@/lib/fuelCalculations";
import { parseDecimal } from "@/lib/parseDecimal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vozidla")({
  head: () => ({
    meta: [
      { title: "Vozidlá – Spotreba auta" },
      { name: "description", content: "Spravujte autá, ktorých spotrebu chcete sledovať." },
      { property: "og:title", content: "Vozidlá – Spotreba auta" },
      { property: "og:description", content: "Spravujte autá, ktorých spotrebu chcete sledovať." },
    ],
  }),
  component: Vehicles,
});

type Errors = Partial<Record<"brand" | "model" | "year" | "initialOdometer", string>>;

function Vehicles() {
  const { vehicles, selectedVehicle, addVehicle, selectVehicle } = useCarData();
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [odo, setOdo] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const cy = new Date().getFullYear();

  const reset = () => { setBrand(""); setModel(""); setYear(""); setOdo(""); setErrors({}); };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const y = parseDecimal(year), o = parseDecimal(odo);
    const next: Errors = {};
    if (!brand.trim()) next.brand = "Zadajte značku vozidla.";
    if (!model.trim()) next.model = "Zadajte model vozidla.";
    if (!Number.isInteger(y) || y < 1900 || y > cy + 1) next.year = `Zadajte platný rok (1900 - ${cy + 1}).`;
    if (!Number.isFinite(o) || o < 0) next.initialOdometer = "Zadajte platný stav tachometra v km.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    addVehicle({ brand: brand.trim(), model: model.trim(), year: y, initialOdometer: Math.round(o) });
    reset();
    setOpen(false);
  };

  return (
    <>
      <ScreenHeader title="Vozidlá" subtitle="Spravujte autá, ktorých spotrebu chcete sledovať." />
      <Button size="lg" className="mb-5 w-full" onClick={() => setOpen(true)}><Plus /> Pridať vozidlo</Button>
      <BackupImportCard />
      {vehicles.length === 0 ? (
        <div className="panel text-muted-foreground">Zatiaľ žiadne vozidlo. Pridajte prvé tlačidlom vyššie.</div>
      ) : (
        <div className="space-y-3">
          {vehicles.map((v) => {
            const active = v.id === selectedVehicle?.id;
            return (
              <button key={v.id} type="button" onClick={() => selectVehicle(v.id)}
                className={cn("panel block w-full text-left transition-colors", active ? "border-primary" : "hover:bg-muted")}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg font-semibold">{v.brand} {v.model}</span>
                  {active ? <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">Aktívne</span> : null}
                </div>
                <div className="mt-3 flex gap-8">
                  <div><p className="text-xs text-muted-foreground">Rok výroby</p><p className="font-semibold">{v.year}</p></div>
                  <div><p className="text-xs text-muted-foreground">Počiatočný stav</p><p className="tabular font-semibold">{formatNumber(v.initialOdometer)} km</p></div>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); setOpen(o); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nové vozidlo</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <FormField label="Značka" value={brand} onChange={setBrand} placeholder="napr. Škoda" error={errors.brand} />
            <FormField label="Model" value={model} onChange={setModel} placeholder="napr. Octavia" error={errors.model} />
            <FormField label="Rok výroby" value={year} onChange={setYear} inputMode="numeric" placeholder={String(cy)} error={errors.year} />
            <FormField label="Počiatočný stav tachometra" value={odo} onChange={setOdo} inputMode="numeric" placeholder="napr. 125000" suffix="km" error={errors.initialOdometer} />
            <Button type="submit" size="lg" className="w-full">Uložiť vozidlo</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
