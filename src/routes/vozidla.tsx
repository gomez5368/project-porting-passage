import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Vehicles,
});

type Errors = Partial<Record<"brand" | "model" | "year" | "initialOdometer" | "tankCapacity", string>>;

function Vehicles() {
  const { vehicles, fillUps, costs, selectedVehicle, addVehicle, updateVehicle, deleteVehicle, selectVehicle } = useCarData();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleting = vehicles.find((v) => v.id === deletingId) ?? null;
  const deletingFillUps = deleting ? fillUps.filter((f) => f.vehicleId === deleting.id).length : 0;
  const deletingCosts = deleting ? costs.filter((c) => c.vehicleId === deleting.id).length : 0;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tank, setTank] = useState("");
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [odo, setOdo] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const cy = new Date().getFullYear();

  const reset = () => { setBrand(""); setModel(""); setYear(""); setOdo(""); setTank(""); setEditingId(null); setErrors({}); };
  const startEdit = (v: (typeof vehicles)[number]) => {
    setBrand(v.brand); setModel(v.model); setYear(String(v.year)); setOdo(String(v.initialOdometer));
    setTank(v.tankCapacity !== undefined ? String(v.tankCapacity) : ""); setErrors({}); setEditingId(v.id); setOpen(true);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const y = parseDecimal(year), o = parseDecimal(odo);
    const t = tank.trim() === "" ? undefined : parseDecimal(tank);
    const next: Errors = {};
    if (!brand.trim()) next.brand = "Zadajte značku vozidla.";
    if (!model.trim()) next.model = "Zadajte model vozidla.";
    if (!Number.isInteger(y) || y < 1900 || y > cy + 1) next.year = `Zadajte platný rok (1900 - ${cy + 1}).`;
    if (!Number.isFinite(o) || o < 0) next.initialOdometer = "Zadajte platný stav tachometra v km.";
    if (t !== undefined && (!Number.isFinite(t) || t < 0 || t > 1000)) next.tankCapacity = "Zadajte objem nádrže od 0 do 1000 l.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const data = { brand: brand.trim(), model: model.trim(), year: y, initialOdometer: Math.round(o), ...(t === undefined ? {} : { tankCapacity: t }) };
    if (editingId) updateVehicle(editingId, data); else addVehicle(data);
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
              <div key={v.id} className="relative">
              <button type="button" onClick={() => selectVehicle(v.id)}
                className={cn("panel block w-full pr-24 text-left transition-colors", active ? "border-primary" : "hover:bg-muted")}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-lg font-semibold">{v.brand} {v.model}</span>
                  {active ? <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">Aktívne</span> : null}
                </div>
                <div className="mt-3 flex gap-8">
                  <div><p className="text-xs text-muted-foreground">Rok výroby</p><p className="font-semibold">{v.year}</p></div>
                  <div><p className="text-xs text-muted-foreground">Počiatočný stav</p><p className="tabular font-semibold">{formatNumber(v.initialOdometer)} km</p></div>
                  <div><p className="text-xs text-muted-foreground">Objem nádrže</p><p className="tabular font-semibold">{v.tankCapacity !== undefined ? `${formatNumber(v.tankCapacity)} l` : "—"}</p></div>
                </div>
              </button>
              <Button type="button" variant="ghost" size="icon" aria-label={`Upraviť vozidlo ${v.brand} ${v.model}`} className="absolute right-14 top-3" onClick={() => startEdit(v)}><Pencil /></Button>
              <Button type="button" variant="ghost" size="icon" aria-label={`Zmazať vozidlo ${v.brand} ${v.model}`} className="absolute right-3 top-3 text-destructive hover:text-destructive" onClick={() => setDeletingId(v.id)}><Trash2 /></Button>
              </div>
            );
          })}
        </div>
      )}
      <AlertDialog open={deleting !== null} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zmazať vozidlo {deleting?.brand} {deleting?.model}?</AlertDialogTitle>
            <AlertDialogDescription>
              Spolu s vozidlom sa natrvalo zmaže aj {deletingFillUps} tankovaní a {deletingCosts} nákladov. Ak si ich chcete ponechať, najprv si v Histórii exportujte zálohu (JSON).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleting) deleteVehicle(deleting.id); setDeletingId(null); }}>Zmazať</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); setOpen(o); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Upraviť vozidlo" : "Nové vozidlo"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <FormField label="Značka" value={brand} onChange={setBrand} placeholder="napr. Škoda" error={errors.brand} />
            <FormField label="Model" value={model} onChange={setModel} placeholder="napr. Octavia" error={errors.model} />
            <FormField label="Rok výroby" value={year} onChange={setYear} inputMode="numeric" placeholder={String(cy)} error={errors.year} />
            <FormField label="Počiatočný stav tachometra" value={odo} onChange={setOdo} inputMode="numeric" placeholder="napr. 125000" suffix="km" error={errors.initialOdometer} />
            <FormField label="Objem nádrže" value={tank} onChange={setTank} inputMode="decimal" placeholder="napr. 45" suffix="l" error={errors.tankCapacity} />
            <Button type="submit" size="lg" className="w-full">{editingId ? "Uložiť zmeny" : "Uložiť vozidlo"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
