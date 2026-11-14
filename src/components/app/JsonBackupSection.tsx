import { useRef, useState } from "react";
import { DatabaseBackup, Download, FileSpreadsheet, Upload } from "lucide-react";
import { BackupSummaryCard } from "@/components/app/BackupSummaryCard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCarData } from "@/context/CarDataContext";
import { downloadFile } from "@/lib/downloadFile";
import { LAST_BACKUP_KEY } from "@/lib/backupReminder";
import { parseJsonBackup, serializeJsonBackup } from "@/lib/jsonBackup";
import { serializeJournalCsv } from "@/lib/journalCsv";
import type { AppState } from "@/types/fuel";

export function JsonBackupSection() {
  const { vehicles, fillUps, costs, reminders, selectedVehicleId, isReady, restoreData } = useCarData();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<AppState | null>(null);
  const [lastImported, setLastImported] = useState<AppState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [csvVehicleId, setCsvVehicleId] = useState("all");
  const [csvDateFrom, setCsvDateFrom] = useState("");
  const [csvDateTo, setCsvDateTo] = useState("");

  const exportData = () => {
    setError(null); setMessage(null); setLastImported(null);
    try {
      const json = serializeJsonBackup({ vehicles, fillUps, costs, reminders: reminders ?? [], selectedVehicleId });
      downloadFile(new Blob([json], { type: "application/json;charset=utf-8" }), "spotreba_zaloha.json");
      try { localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString()); } catch { /* ignore */ }
    } catch {
      setError("Zálohu sa nepodarilo vytvoriť. Údaje zostali nezmenené.");
    }
  };
  const exportCsv = () => {
    setError(null); setMessage(null); setLastImported(null);
    if (csvDateFrom && csvDateTo && csvDateFrom > csvDateTo) {
      setError("Dátum Od nesmie byť neskôr ako dátum Do.");
      return;
    }
    const filter = {
      vehicleId: csvVehicleId === "all" ? undefined : csvVehicleId,
      dateFrom: csvDateFrom || undefined,
      dateTo: csvDateTo || undefined,
    };
    const recordCount = [...fillUps, ...costs].filter((record) =>
      (!filter.vehicleId || record.vehicleId === filter.vehicleId) &&
      (!filter.dateFrom || record.date >= filter.dateFrom) &&
      (!filter.dateTo || record.date <= filter.dateTo),
    ).length;
    if (recordCount === 0) {
      setError("Pre zvolené vozidlo a obdobie nie sú žiadne záznamy.");
      return;
    }
    try {
      const csv = serializeJournalCsv(fillUps, costs, vehicles, filter);
      downloadFile(new Blob([csv], { type: "text/csv;charset=utf-8" }), "spotreba_export.csv");
      setMessage(`Počet exportovaných záznamov: ${recordCount}.`);
    } catch {
      setError("Export do CSV sa nepodaril. Údaje zostali nezmenené.");
    }
  };
  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setError(null); setMessage(null); setPending(null); setLastImported(null);
    try {
      const parsed = parseJsonBackup(await file.text());
      setPending(parsed);
      setLastImported(parsed);
    } catch {
      setError("Súbor nie je platná JSON záloha aplikácie Spotreba. Údaje zostali nezmenené.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  const restore = () => {
    if (!pending) return;
    try {
      restoreData(pending);
      setMessage(`Obnovené: ${pending.vehicles.length} vozidiel, ${pending.fillUps.length} tankovaní a ${pending.costs.length} nákladov.`);
      setPending(null);
    } catch {
      setError("Údaje sa nepodarilo uložiť. Skontrolujte voľné miesto a povolenia prehliadača.");
      setPending(null);
    }
  };

  return (
    <section aria-labelledby="backup-heading" className="mb-6 rounded-2xl border border-border/60 bg-card p-5 text-card-foreground shadow-lg shadow-black/20">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"><DatabaseBackup className="size-5" aria-hidden="true" /></span>
        <div>
          <h2 id="backup-heading" className="font-semibold">Záloha a obnova dát</h2>
          <p className="text-sm text-muted-foreground">Kompletná záloha v JSON a export vybraných záznamov do Excelu.</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" className="min-w-0 sm:flex-1" onClick={exportData} disabled={!isReady || busy}><Download /> Exportovať dáta (JSON)</Button>
        <Button variant="outline" className="min-w-0 sm:flex-1" onClick={() => input.current?.click()} disabled={!isReady || busy}><Upload /> {busy ? "Čítam zálohu…" : "Importovať dáta (JSON)"}</Button>
      </div>
      <div className="mt-5 border-t border-border/60 pt-5">
        <h3 className="font-semibold">Export do Excelu (CSV)</h3>
        <p className="mt-1 text-sm text-muted-foreground">Vyberte vozidlo a obdobie. Prázdne dátumy znamenajú celú históriu.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="csv-vehicle">Vozidlo</Label>
            <select id="csv-vehicle" value={csvVehicleId} onChange={(e) => setCsvVehicleId(e.target.value)} disabled={!isReady || busy} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
              <option value="all">Všetky vozidlá</option>
              {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.brand} {vehicle.model}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="csv-date-from">Dátum od</Label>
            <Input id="csv-date-from" type="date" value={csvDateFrom} max={csvDateTo || undefined} onChange={(e) => setCsvDateFrom(e.target.value)} disabled={!isReady || busy} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="csv-date-to">Dátum do</Label>
            <Input id="csv-date-to" type="date" value={csvDateTo} min={csvDateFrom || undefined} onChange={(e) => setCsvDateTo(e.target.value)} disabled={!isReady || busy} />
          </div>
        </div>
        <Button variant="outline" className="mt-4 w-full sm:w-auto" onClick={exportCsv} disabled={!isReady || busy}><FileSpreadsheet /> Exportovať do Excelu (CSV)</Button>
      </div>
      <input ref={input} type="file" accept=".json,application/json" className="sr-only" aria-label="JSON záloha" onChange={(e) => void readFile(e.target.files?.[0])} />
      {isReady ? <BackupSummaryCard data={lastImported ?? { vehicles, fillUps, costs }} source={lastImported ? "imported" : "current"} /> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-destructive">{error}</p> : null}
      {message ? <p role="status" className="mt-3 text-sm font-semibold text-success">{message}</p> : null}
      <Dialog open={pending !== null} onOpenChange={(open) => { if (!open) setPending(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Obnoviť dáta zo zálohy?</DialogTitle>
            <DialogDescription>Obnova nahradí všetky aktuálne vozidlá, tankovania aj náklady v tomto prehliadači. Pred pokračovaním si môžete aktuálne dáta exportovať.</DialogDescription>
          </DialogHeader>
          {pending ? <p className="text-sm">Záloha obsahuje: <b>{pending.vehicles.length}</b> vozidiel · <b>{pending.fillUps.length}</b> tankovaní · <b>{pending.costs.length}</b> nákladov</p> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setPending(null)}>Zrušiť</Button>
            <Button onClick={restore}>Obnoviť dáta</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
