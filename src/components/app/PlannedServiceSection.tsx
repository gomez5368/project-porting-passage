import { useState } from "react";
import { Check, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/app/ui";
import { statusCard, statusText } from "@/components/app/reminderTone";
import { plannedServiceState, todayIso } from "@/lib/reminders";
import { formatDate, formatNumber } from "@/lib/fuelCalculations";
import { parseDecimal } from "@/lib/parseDecimal";
import { cn } from "@/lib/utils";
import type { PlannedService, VehicleReminders } from "@/types/fuel";

export function PlannedServiceSection({ reminders, odometer, onSave }: { reminders: VehicleReminders; odometer: number; onSave: (r: VehicleReminders) => void }) {
  const [editing, setEditing] = useState<PlannedService | null>(null);
  const [confirm, setConfirm] = useState<{ service: PlannedService; complete: boolean } | null>(null);
  const services = reminders.plannedServices ?? [];
  return (
    <section className="mt-6" aria-labelledby="planned-service-title">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="planned-service-title" className="flex items-center gap-2 font-semibold"><Wrench className="size-5 text-secondary" />Plánovaný servis</h2>
        <Button variant="outline" onClick={() => setEditing({ id: crypto.randomUUID(), title: "" })}><Plus className="size-4" />Pridať servis</Button>
      </div>
      {services.length === 0 ? <p className="text-sm text-muted-foreground">Žiadny naplánovaný servis.</p> : null}
      <div className="space-y-2">
        {services.map((service) => {
          const state = plannedServiceState(service, odometer, todayIso());
          return <article key={service.id} className={cn("panel flex items-start justify-between gap-3", statusCard[state.status])}>
            <div className="min-w-0">
              <h3 className="break-words font-semibold">{service.title}</h3>
              <p className="text-sm text-muted-foreground">{[service.date ? formatDate(service.date) : "", service.odometer !== undefined ? `${formatNumber(service.odometer)} km` : ""].filter(Boolean).join(" · ")}</p>
              <p className={cn("text-sm font-semibold", statusText[state.status])}>{state.text}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1">
              <Button size="icon" variant="ghost" aria-label={`Dokončiť servis ${service.title}`} title="Dokončiť servis" onClick={() => setConfirm({ service, complete: true })}><Check /></Button>
              <Button size="icon" variant="ghost" aria-label={`Upraviť servis ${service.title}`} title="Upraviť servis" onClick={() => setEditing(service)}><Pencil /></Button>
              <Button size="icon" variant="ghost" aria-label={`Vymazať servis ${service.title}`} title="Vymazať servis" onClick={() => setConfirm({ service, complete: false })}><Trash2 /></Button>
            </div>
          </article>;
        })}
      </div>
      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent><DialogHeader><DialogTitle>{services.some((s) => s.id === editing?.id) ? "Upraviť plánovaný servis" : "Nový plánovaný servis"}</DialogTitle></DialogHeader>
          {editing ? <ServiceForm key={editing.id} initial={editing} onSave={(service) => { onSave({ ...reminders, plannedServices: [...services.filter((s) => s.id !== service.id), service] }); setEditing(null); }} /> : null}
        </DialogContent>
      </Dialog>
      <Dialog open={confirm !== null} onOpenChange={(open) => { if (!open) setConfirm(null); }}>
        <DialogContent><DialogHeader><DialogTitle>{confirm?.complete ? "Dokončiť servis?" : "Vymazať servis?"}</DialogTitle></DialogHeader>
          <p>{confirm?.service.title}</p><p className="text-sm text-muted-foreground">Pripomienka sa odstráni. História výdavkov zostane nezmenená.</p>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setConfirm(null)}>Zrušiť</Button><Button variant={confirm?.complete ? "default" : "destructive"} onClick={() => { if (!confirm) return; onSave({ ...reminders, plannedServices: services.filter((s) => s.id !== confirm.service.id) }); setConfirm(null); }}>{confirm?.complete ? "Dokončiť" : "Vymazať"}</Button></div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ServiceForm({ initial, onSave }: { initial: PlannedService; onSave: (service: PlannedService) => void }) {
  const [title, setTitle] = useState(initial.title);
  const [date, setDate] = useState(initial.date ?? "");
  const [km, setKm] = useState(initial.odometer !== undefined ? String(initial.odometer) : "");
  const [error, setError] = useState<string | null>(null);
  return <form className="space-y-4" onSubmit={(e) => {
    e.preventDefault();
    const odometer = km.trim() ? parseDecimal(km.replace(/\s/g, "")) : undefined;
    if (!title.trim() || title.trim().length > 100) return setError("Zadajte názov servisu (najviac 100 znakov).");
    if (!date && odometer === undefined) return setError("Zadajte dátum alebo stav tachometra.");
    if (odometer !== undefined && (!Number.isFinite(odometer) || odometer < 0 || !Number.isInteger(odometer))) return setError("Zadajte platný stav tachometra v celých kilometroch.");
    if (date && (!Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) return setError("Zadajte platný dátum.");
    onSave({ id: initial.id, title: title.trim(), ...(date ? { date } : {}), ...(odometer !== undefined ? { odometer } : {}) });
  }}>
    <FormField label="Názov servisu" value={title} onChange={setTitle} placeholder="napr. Výmena rozvodov" />
    <FormField label="Dátum servisu (nepovinné)" type="date" value={date} onChange={setDate} />
    <FormField label="Servis pri stave tachometra (nepovinné)" value={km} onChange={setKm} inputMode="numeric" suffix="km" />
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    <Button type="submit" className="w-full">Uložiť servis</Button>
  </form>;
}