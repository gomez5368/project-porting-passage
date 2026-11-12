import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Droplet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyVehicleState, FormField, ScreenHeader, VehicleSwitcher } from "@/components/app/ui";
import { statusBar, statusCard, statusText } from "@/components/app/reminderTone";
import { useCarData } from "@/context/CarDataContext";
import { formatDate, formatNumber } from "@/lib/fuelCalculations";
import { parseDecimal } from "@/lib/parseDecimal";
import {
  DEADLINE_LABELS, DEFAULT_OIL_INTERVAL_KM, currentOdometer, daysUntil, deadlineStatus, formatDaysLeft,
  formatKmLeft, oilState, remindersFor, todayIso,
} from "@/lib/reminders";
import { cn } from "@/lib/utils";
import { DEADLINE_TYPES, type VehicleReminders } from "@/types/fuel";

export const Route = createFileRoute("/terminy")({
  head: () => ({
    meta: [
      { title: "Termíny a servis – Spotreba auta" },
      { name: "description", content: "STK, emisná kontrola, PZP, havarijné poistenie, diaľničná známka a výmena oleja pre každé auto." },
      { property: "og:title", content: "Termíny a servis – Spotreba auta" },
      { property: "og:description", content: "STK, emisná kontrola, PZP, havarijné poistenie, diaľničná známka a výmena oleja pre každé auto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Deadlines,
});

function Deadlines() {
  const { vehicles, fillUps, reminders, selectedVehicle, selectVehicle, saveReminders } = useCarData();
  if (!selectedVehicle) return (<><ScreenHeader title="Termíny a servis" subtitle="STK, poistenie a výmena oleja" /><EmptyVehicleState /></>);

  const current = remindersFor({ reminders }, selectedVehicle.id);
  const today = todayIso();
  const odometer = currentOdometer(selectedVehicle, fillUps);
  const setDeadline = (type: (typeof DEADLINE_TYPES)[number], value: string | undefined) => {
    const deadlines = { ...current.deadlines };
    if (value) deadlines[type] = value; else delete deadlines[type];
    saveReminders({ ...current, deadlines });
  };

  return (
    <>
      <ScreenHeader title="Termíny a servis" subtitle={`${selectedVehicle.brand} ${selectedVehicle.model}`} />
      <VehicleSwitcher vehicles={vehicles} selectedId={selectedVehicle.id} onSelect={selectVehicle} />

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><CalendarClock className="size-5 text-primary" /> Termíny platnosti</h2>
        <div className="space-y-2">
          {DEADLINE_TYPES.map((type) => {
            const date = current.deadlines[type];
            const days = date ? daysUntil(date, today) : null;
            const status = days !== null ? deadlineStatus(days) : null;
            return (
              <article key={type} data-testid={`deadline-${type}`} className={cn("panel flex flex-wrap items-center justify-between gap-3", status && statusCard[status])}>
                <div className="min-w-0">
                  <p className="font-semibold">{DEADLINE_LABELS[type]}</p>
                  {days !== null && status ? (
                    <p className={cn("tabular text-sm font-semibold", statusText[status])}>
                      {formatDaysLeft(days)} · platí do {formatDate(date!)}
                    </p>
                  ) : <p className="text-sm text-muted-foreground">Zatiaľ nezadané</p>}
                </div>
                <div className="flex items-center gap-2">
                  <input type="date" aria-label={`Platnosť ${DEADLINE_LABELS[type]}`} value={date ?? ""}
                    onChange={(e) => setDeadline(type, e.target.value || undefined)}
                    className="h-10 rounded-lg border border-border bg-muted px-3 text-sm outline-none [color-scheme:dark] focus:ring-2 focus:ring-ring" />
                  {date ? (
                    <button type="button" aria-label={`Vymazať ${DEADLINE_LABELS[type]}`} onClick={() => setDeadline(type, undefined)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><X className="size-4" /></button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <OilSection key={selectedVehicle.id} reminders={current} odometer={odometer} onSave={saveReminders} />
    </>
  );
}

function OilSection({ reminders, odometer, onSave }: { reminders: VehicleReminders; odometer: number; onSave: (r: VehicleReminders) => void }) {
  const [last, setLast] = useState(reminders.oilLastOdometer !== undefined ? String(reminders.oilLastOdometer) : "");
  const [intervalKm, setIntervalKm] = useState(String(reminders.oilIntervalKm || DEFAULT_OIL_INTERVAL_KM));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const oil = oilState(reminders, odometer);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const l = parseDecimal(last.replace(/\s/g, ""));
    const i = parseDecimal(intervalKm.replace(/\s/g, ""));
    if (!Number.isFinite(l) || l < 0) return setError("Zadajte stav tachometra pri poslednej výmene.");
    if (!Number.isFinite(i) || i <= 0) return setError("Zadajte servisný interval väčší ako 0 km.");
    setError(null);
    onSave({ ...reminders, oilLastOdometer: Math.round(l), oilIntervalKm: Math.round(i) });
    setSaved(true);
  };

  return (
    <section className={cn("panel mt-6", oil && statusCard[oil.status])} data-testid="oil-section">
      <h2 className="mb-3 flex items-center gap-2 font-semibold"><Droplet className="size-5 text-primary" /> Výmena oleja a filtrov</h2>
      {oil ? (
        <div className="mb-4">
          <div className="flex items-baseline justify-between gap-2">
            <p className={cn("tabular text-xl font-bold", statusText[oil.status])}>{formatKmLeft(oil.remainingKm)}</p>
            <p className="tabular text-sm text-muted-foreground">ďalšia pri {formatNumber(oil.nextAt)} km</p>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(oil.progress * 100)} aria-label="Najazdené od výmeny oleja">
            <div className={cn("h-full rounded-full transition-all", statusBar[oil.status])} style={{ width: `${oil.progress * 100}%` }} />
          </div>
          <p className="tabular mt-1.5 text-xs text-muted-foreground">
            Najazdené {formatNumber(oil.driven)} z {formatNumber(reminders.oilIntervalKm)} km · aktuálne {formatNumber(odometer)} km (posledné tankovanie)
          </p>
        </div>
      ) : (
        <p className="mb-4 text-sm text-muted-foreground">Zadajte stav tachometra pri poslednej výmene a aplikácia porovná ho s posledným tankovaním ({formatNumber(odometer)} km).</p>
      )}
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Tachometer pri výmene" value={last} onChange={(v) => { setLast(v); setSaved(false); }} inputMode="numeric" placeholder="napr. 180 000" suffix="km" />
          <FormField label="Servisný interval" value={intervalKm} onChange={(v) => { setIntervalKm(v); setSaved(false); }} inputMode="numeric" suffix="km" />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full">{saved ? "Uložené" : "Uložiť výmenu oleja"}</Button>
      </form>
    </section>
  );
}
