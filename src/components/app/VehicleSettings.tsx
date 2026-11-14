import { useState } from "react";
import { Pencil, Plus, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FormField, SegmentedControl } from "@/components/app/ui";
import { BackupImportCard } from "@/components/app/BackupImportCard";
import { useCarData } from "@/context/CarDataContext";
import { formatNumber } from "@/lib/fuelCalculations";
import { vehicleFuelType } from "@/lib/fuelTypes";
import { parseDecimal } from "@/lib/parseDecimal";
import { cn } from "@/lib/utils";
import { VEHICLE_FUEL_TYPES, type Vehicle, type VehicleFuelType } from "@/types/fuel";

type Errors = Partial<Record<"brand" | "model" | "year" | "initialOdometer" | "tankCapacity" | "enginePowerKw", string>>;

export function VehicleSettings() {
  const { vehicles, fillUps, costs, selectedVehicle, addVehicle, updateVehicle, deleteVehicle, selectVehicle } = useCarData();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const deleting = vehicles.find((v) => v.id === deletingId) ?? null;
  const deletingFillUps = deleting ? fillUps.filter((f) => f.vehicleId === deleting.id).length : 0;
  const deletingCosts = deleting ? costs.filter((c) => c.vehicleId === deleting.id).length : 0;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tank, setTank] = useState("");
  const [power, setPower] = useState("");
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [odo, setOdo] = useState("");
  const [fuelType, setFuelType] = useState<VehicleFuelType>("Benzín");
  const [errors, setErrors] = useState<Errors>({});
  const cy = new Date().getFullYear();

  const reset = () => {
    setBrand(""); setModel(""); setYear(""); setOdo(""); setTank(""); setPower(""); setFuelType("Benzín");
    setEditingId(null); setErrors({});
  };
  const startEdit = (vehicle: Vehicle) => {
    setBrand(vehicle.brand); setModel(vehicle.model); setYear(String(vehicle.year)); setOdo(String(vehicle.initialOdometer));
    setTank(vehicle.tankCapacity !== undefined ? String(vehicle.tankCapacity) : "");
    setPower(vehicle.enginePowerKw !== undefined ? String(vehicle.enginePowerKw) : "");
    setFuelType(vehicleFuelType(vehicle, fillUps)); setErrors({}); setEditingId(vehicle.id); setOpen(true);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const y = parseDecimal(year), o = parseDecimal(odo);
    const t = tank.trim() === "" ? undefined : parseDecimal(tank);
    const p = power.trim() === "" ? undefined : parseDecimal(power);
    const next: Errors = {};
    if (!brand.trim()) next.brand = "Zadajte značku vozidla.";
    if (!model.trim()) next.model = "Zadajte model vozidla.";
    if (!Number.isInteger(y) || y < 1900 || y > cy + 1) next.year = `Zadajte platný rok (1900 - ${cy + 1}).`;
    if (!Number.isFinite(o) || o < 0) next.initialOdometer = "Zadajte platný stav tachometra v km.";
    if (t !== undefined && (!Number.isFinite(t) || t < 0 || t > 1000)) next.tankCapacity = "Zadajte objem nádrže od 0 do 1000 l.";
    if (p !== undefined && (!Number.isFinite(p) || p <= 0 || p > 2000)) next.enginePowerKw = "Zadajte výkon od 1 do 2000 kW.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const data = {
      brand: brand.trim(), model: model.trim(), year: y, initialOdometer: Math.round(o), fuelType,
      ...(t === undefined ? {} : { tankCapacity: t }),
      ...(p === undefined ? {} : { enginePowerKw: p }),
    };
    if (editingId) updateVehicle(editingId, data); else addVehicle(data);
    reset();
    setOpen(false);
  };

  return (
    <section aria-labelledby="vehicle-settings-title">
      <h2 id="vehicle-settings-title" className="mb-3 flex items-center gap-2 font-semibold"><Settings className="size-5 text-primary" /> Technické údaje</h2>
      <Button size="lg" className="mb-5 w-full" onClick={() => { reset(); setOpen(true); }}><Plus /> Pridať vozidlo</Button>
      <BackupImportCard />
      {vehicles.length === 0 ? (
        <div className="panel text-muted-foreground">Zatiaľ žiadne vozidlo. Pridajte prvé tlačidlom vyššie.</div>
      ) : (
        <div className="space-y-3">
          {vehicles.map((vehicle) => {
            const active = vehicle.id === selectedVehicle?.id;
            return (
              <div key={vehicle.id} className="relative">
                <button type="button" onClick={() => selectVehicle(vehicle.id)}
                  className={cn("panel block w-full pr-24 text-left transition-colors", active ? "border-primary" : "hover:bg-muted")}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-lg font-semibold">{vehicle.brand} {vehicle.model}</span>
                    {active ? <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">Aktívne</span> : null}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                    <div><p className="text-xs text-muted-foreground">Rok výroby</p><p className="font-semibold">{vehicle.year}</p></div>
                    <div><p className="text-xs text-muted-foreground">Palivo</p><p className="font-semibold">{vehicleFuelType(vehicle, fillUps)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Výkon</p><p className="tabular font-semibold">{vehicle.enginePowerKw !== undefined ? `${formatNumber(vehicle.enginePowerKw)} kW` : "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Počiatočný stav</p><p className="tabular font-semibold">{formatNumber(vehicle.initialOdometer)} km</p></div>
                    <div><p className="text-xs text-muted-foreground">Objem nádrže</p><p className="tabular font-semibold">{vehicle.tankCapacity !== undefined ? `${formatNumber(vehicle.tankCapacity)} l` : "—"}</p></div>
                  </div>
                </button>
                <Button type="button" variant="ghost" size="icon" aria-label={`Upraviť vozidlo ${vehicle.brand} ${vehicle.model}`} className="absolute right-14 top-3" onClick={() => startEdit(vehicle)}><Pencil /></Button>
                <Button type="button" variant="ghost" size="icon" aria-label={`Zmazať vozidlo ${vehicle.brand} ${vehicle.model}`} className="absolute right-3 top-3 text-destructive hover:text-destructive" onClick={() => setDeletingId(vehicle.id)}><Trash2 /></Button>
              </div>
            );
          })}
        </div>
      )}
      <AlertDialog open={deleting !== null} onOpenChange={(openState) => { if (!openState) setDeletingId(null); }}>
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
      <Dialog open={open} onOpenChange={(openState) => { if (!openState) reset(); setOpen(openState); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Upraviť vozidlo" : "Nové vozidlo"}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Značka" value={brand} onChange={setBrand} placeholder="napr. Škoda" error={errors.brand} />
              <FormField label="Model" value={model} onChange={setModel} placeholder="napr. Octavia" error={errors.model} />
              <FormField label="Výkon motora" value={power} onChange={setPower} inputMode="decimal" placeholder="napr. 81" suffix="kW" error={errors.enginePowerKw} />
            </div>
            <FormField label="Rok výroby" value={year} onChange={setYear} inputMode="numeric" placeholder={String(cy)} error={errors.year} />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Typ paliva</p>
              <SegmentedControl options={VEHICLE_FUEL_TYPES} value={fuelType} onChange={setFuelType} />
            </div>
            <FormField label="Počiatočný stav tachometra" value={odo} onChange={setOdo} inputMode="numeric" placeholder="napr. 125000" suffix="km" error={errors.initialOdometer} />
            <FormField label="Objem nádrže" value={tank} onChange={setTank} inputMode="decimal" placeholder="napr. 45" suffix="l" error={errors.tankCapacity} hint="Voliteľné, od 0 do 1000 litrov." />
            <Button type="submit" size="lg" className="w-full">{editingId ? "Uložiť zmeny" : "Uložiť vozidlo"}</Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
