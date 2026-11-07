import { useState } from "react";
import { Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCarData } from "@/context/CarDataContext";
import { formatCurrency, formatDate, formatNumber } from "@/lib/fuelCalculations";
import { readSpotrebaBackup, type BackupResult } from "@/lib/spotrebaBackup";
import { fillUpKey } from "@/lib/importSpotreba";

export function BackupImportCard() {
  const { vehicles, fillUps, importVehicles } = useCarData();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BackupResult | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const close = () => { setOpen(false); setResult(null); setError(null); };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setError(null); setResult(null);
    try {
      setResult(await readSpotrebaBackup(file));
    } catch {
      setError("Tento súbor sa nepodarilo prečítať. Nahrajte zálohu z aplikácie Spotreba (súbor .db3).");
    } finally {
      setBusy(false);
    }
  };

  // Count what is genuinely new against what is already saved in this browser.
  const preview = result?.vehicles.map((v) => {
    const existing = vehicles.find((e) => e.brand === v.brand && e.model === v.model && e.year === v.year);
    const keys = new Set(existing ? fillUps.filter((f) => f.vehicleId === existing.id).map(fillUpKey) : []);
    const fresh = v.fillUps.filter((f) => !keys.has(fillUpKey(f)));
    return { v, existing: !!existing, fresh, dupes: v.fillUps.length - fresh.length };
  }) ?? [];
  const totalNew = preview.reduce((s, p) => s + p.fresh.length, 0);
  const newCars = preview.filter((p) => !p.existing).length;

  const save = () => {
    importVehicles(preview.map(({ v }) => ({
      vehicle: { brand: v.brand, model: v.model, year: v.year, initialOdometer: v.initialOdometer },
      fillUps: v.fillUps,
    })));
    setDone(`Importované: ${newCars} vozidiel a ${totalNew} tankovaní.`);
    close();
  };

  return (
    <section className="panel mb-5">
      <div className="flex gap-3">
        <div className="h-fit rounded-lg bg-muted p-2 text-secondary"><Database className="size-5" /></div>
        <div>
          <h2 className="font-semibold">Import zálohy z aplikácie Spotreba</h2>
          <p className="text-sm text-muted-foreground">Nahrajte súbor zálohy (.db3). Prečíta sa len vo vašom prehliadači, nikam sa neodosiela.</p>
        </div>
      </div>
      {done ? <p className="mt-3 text-sm font-semibold text-success">{done}</p> : null}
      <Button variant="outline" className="mt-3 w-full" onClick={() => { setDone(null); setOpen(true); }}>Nahrať zálohu</Button>

      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Import zálohy zo Spotreby</DialogTitle></DialogHeader>
          <label className="block cursor-pointer rounded-lg border border-dashed border-border bg-muted p-4 text-center text-sm hover:border-primary">
            <span className="font-semibold">{busy ? "Čítam súbor…" : "Vybrať súbor zálohy"}</span>
            <span className="block text-muted-foreground">napr. SpotrebaDB.db3</span>
            <input type="file" accept=".db3,.db,.sqlite,.sqlite3" className="sr-only" aria-label="Súbor zálohy"
              onChange={(e) => void onFile(e.target.files?.[0])} />
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {result ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-accent p-3 text-sm">
                <p className="font-semibold text-accent-foreground">Nové: {newCars} vozidiel · {totalNew} tankovaní</p>
                {result.orphanFillUps > 0 ? <p>Tankovania bez priradeného auta (preskočíme): {result.orphanFillUps}</p> : null}
              </div>
              {preview.map(({ v, existing, fresh, dupes }) => (
                <div key={`${v.brand}-${v.model}-${v.year}`} className="rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{v.brand} {v.model}</p>
                    {existing ? <span className="rounded-full bg-muted px-2 py-0.5 text-xs">už uložené</span> : null}
                  </div>
                  <p className="text-muted-foreground">
                    {v.year} · {v.fillUps[0]?.fuelType ?? "—"} · počiatočný stav {formatNumber(v.initialOdometer)} km
                  </p>
                  <p className="mt-1">Nových tankovaní: <b>{fresh.length}</b>
                    {dupes > 0 ? ` · duplicitných (preskočíme): ${dupes}` : ""}
                    {v.skipped > 0 ? ` · chybných (preskočíme): ${v.skipped}` : ""}</p>
                  {fresh.length > 0 ? (
                    <ul className="mt-2 divide-y divide-border rounded-md border border-border">
                      {fresh.slice(-5).reverse().map((f, i) => (
                        <li key={i} className="flex justify-between gap-2 px-2 py-1.5">
                          <span>{formatDate(f.date)}</span>
                          <span className="tabular text-muted-foreground">{formatNumber(f.odometer)} km · {formatNumber(f.liters, 2)} l · {formatCurrency(f.totalCost)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {fresh.length > 5 ? <p className="mt-1 text-xs text-muted-foreground">Zobrazených posledných 5 z {fresh.length}.</p> : null}
                </div>
              ))}
              <Button className="w-full" size="lg" onClick={save} disabled={totalNew === 0 && newCars === 0}>
                {totalNew > 0 || newCars > 0 ? `Importovať ${totalNew} tankovaní` : "Všetko je už uložené"}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
