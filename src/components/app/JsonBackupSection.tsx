import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCarData } from "@/context/CarDataContext";
import { downloadFile } from "@/lib/downloadFile";
import { parseJsonBackup, serializeJsonBackup } from "@/lib/jsonBackup";
import type { AppState } from "@/types/fuel";

export function JsonBackupSection() {
  const { vehicles, fillUps, costs, selectedVehicleId, isReady, restoreData } = useCarData();
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<AppState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const exportData = () => {
    setError(null); setMessage(null);
    try {
      const json = serializeJsonBackup({ vehicles, fillUps, costs, selectedVehicleId });
      downloadFile(new Blob([json], { type: "application/json;charset=utf-8" }), "spotreba_zaloha.json");
    } catch {
      setError("Zálohu sa nepodarilo vytvoriť. Údaje zostali nezmenené.");
    }
  };
  const readFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setError(null); setMessage(null); setPending(null);
    try {
      setPending(parseJsonBackup(await file.text()));
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
    <section className="mb-6 border-y border-border py-5">
      <h2 className="mb-3 font-semibold">Záloha a obnova dát</h2>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" className="min-w-0 sm:flex-1" onClick={exportData} disabled={!isReady || busy}><Download /> Exportovať dáta (JSON)</Button>
        <Button variant="outline" className="min-w-0 sm:flex-1" onClick={() => input.current?.click()} disabled={!isReady || busy}><Upload /> {busy ? "Čítam zálohu…" : "Importovať dáta (JSON)"}</Button>
      </div>
      <input ref={input} type="file" accept=".json,application/json" className="sr-only" aria-label="JSON záloha" onChange={(e) => void readFile(e.target.files?.[0])} />
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