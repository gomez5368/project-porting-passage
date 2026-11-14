import { useEffect, useRef, useState } from "react";
import { Camera, LoaderCircle, Square, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FormField } from "@/components/app/ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useCarData } from "@/context/CarDataContext";
import { prepareReceiptPhoto, receiptSchema, receiptValues, type ReceiptData } from "@/lib/receipt";
import { parseDecimal } from "@/lib/parseDecimal";
import { COST_CATEGORIES, VEHICLE_FUEL_TYPES } from "@/types/fuel";
import "@lovable.dev/cloud-auth-js/styles.css";

export function ReceiptImport() {
  const { selectedVehicle, vehicles, addFillUps, addCost } = useCarData();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReceiptData | null>(null);
  const [saved, setSaved] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(!!session));
    return () => { listener.subscription.unsubscribe(); controller.current?.abort(); };
  }, []);
  const reset = () => { controller.current?.abort(); setImage(null); setData(null); setError(null); setBusy(false); };
  const analyze = async () => {
    if (!image || busy) return;
    setBusy(true); setError(null); setData(null); setProgress("Čítam bloček…");
    const abort = new AbortController(); controller.current = abort;
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Pre AI načítanie sa prihláste.");
      const response = await fetch("/api/receipt", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session.access_token}` }, body: JSON.stringify({ image }), signal: abort.signal });
      if (!response.ok) { const body = await response.json(); throw new Error(body.message ?? "AI načítanie je nedostupné."); }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("AI nevrátila údaje.");
      const decoder = new TextDecoder(); let buffer = ""; let received = false;
      const consume = (line: string) => {
        if (!line.trim()) return;
        const event = JSON.parse(line);
        if (event.type === "error") throw new Error(event.message);
        if (event.type === "progress") setProgress(event.message);
        if (event.type === "result") { setData(receiptSchema.parse(event.data)); received = true; }
      };
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        lines.forEach(consume);
      }
      consume(buffer + decoder.decode());
      if (!received) throw new Error("AI nevrátila čitateľné údaje.");
    } catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : "Bloček sa nepodarilo načítať."); }
    finally { if (controller.current === abort) { setBusy(false); controller.current = null; } }
  };
  return <section className="mb-5">
    <Button variant="outline" className="w-full" disabled={!selectedVehicle} onClick={() => { reset(); setSaved(false); setOpen(true); }}><Camera />Načítať bloček pomocou AI</Button>
    {saved ? <p role="status" className="mt-2 text-sm text-success">Záznam z bločku bol uložený.</p> : null}
    <Dialog open={open} onOpenChange={(value) => { if (!value) reset(); setOpen(value); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Načítať bloček</DialogTitle><DialogDescription>Fotka sa odošle Lovable AI iba po kliknutí na Načítať údaje. Čítanie čerpá AI kredity. Fotku neukladáme do histórie; pred uložením skontrolujte údaje.</DialogDescription></DialogHeader>
        {!signedIn ? <div className="space-y-3"><p className="text-sm text-muted-foreground">AI načítanie vyžaduje prihlásenie. Vaše existujúce údaje zostanú v tomto prehliadači.</p><Button className="lovable-auth-button w-full" onClick={async () => { const result = await lovable.auth.signInWithOAuth("lovable", { redirect_uri: window.location.origin + "/historia" }); if (result.error) setError(result.error.message); }}>Pokračovať s Lovable</Button></div> : <>
          <div className="flex justify-end"><Button variant="ghost" size="sm" onClick={() => { reset(); void supabase.auth.signOut(); }}><LogOut className="size-4" />Odhlásiť AI</Button></div>
          {!data ? <>
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Fotka bločku" className="sr-only" onChange={async (e) => { const file = e.target.files?.[0]; e.target.value = ""; if (!file) return; setError(null); setBusy(true); try { setImage(await prepareReceiptPhoto(file)); } catch (error) { setError(error instanceof Error ? error.message : "Fotku sa nepodarilo otvoriť."); } finally { setBusy(false); } }} />
            <Button variant="outline" className="w-full" disabled={busy} onClick={() => input.current?.click()}><Camera />{image ? "Zmeniť fotku" : "Nahrať fotku bločku"}</Button>
            {image ? <img src={image} alt="Vybraný bloček" className="max-h-64 w-full rounded-lg bg-muted object-contain" /> : null}
            {busy ? <div className="flex items-center justify-between gap-2"><p role="status" className="flex items-center gap-2 text-sm"><LoaderCircle className="size-4 animate-spin" />{progress || "Pripravujem fotku…"}</p><Button variant="outline" size="sm" onClick={() => { controller.current?.abort(); setBusy(false); }}><Square className="size-4" />Zastaviť</Button></div> : <Button className="w-full" disabled={!image} onClick={() => void analyze()}>Načítať údaje</Button>}
          </> : <ReceiptReview key={JSON.stringify(data)} data={data} vehicleId={selectedVehicle?.id ?? ""} vehicles={vehicles} onSave={(kind, vehicleId, values) => {
            if (kind === "fuel") {
              const liters = parseDecimal(values.liters); const amount = parseDecimal(values.amount);
              addFillUps([{ vehicleId, date: values.date, odometer: parseDecimal(values.odometer), liters, totalCost: amount, pricePerLiter: Math.round(amount / liters * 1000) / 1000, fuelType: values.fuelType, fuelGrade: values.fuelGrade, isFullTank: false, ...(values.station.trim() ? { station: values.station.trim() } : {}) }]);
            } else addCost({ vehicleId, date: values.date, amount: parseDecimal(values.amount), category: values.category, note: values.note, odometer: values.odometer.trim() ? Math.round(parseDecimal(values.odometer)) : null });
            setSaved(true); reset(); setOpen(false);
          }} />}
        </>}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      </DialogContent>
    </Dialog>
  </section>;
}

type ReviewValues = ReturnType<typeof receiptValues> & { fuelType: (typeof VEHICLE_FUEL_TYPES)[number]; fuelGrade: "normal" | "premium" };
function ReceiptReview({ data, vehicleId, vehicles, onSave }: { data: ReceiptData; vehicleId: string; vehicles: { id: string; brand: string; model: string }[]; onSave: (kind: "fuel" | "cost", vehicleId: string, values: ReviewValues) => void }) {
  const [kind, setKind] = useState<"fuel" | "cost">(data.kind === "fuel" ? "fuel" : "cost");
  const [car, setCar] = useState(vehicleId);
  const [values, setValues] = useState<ReviewValues>({ ...receiptValues(data), fuelType: data.fuelType ?? "Benzín", fuelGrade: data.fuelGrade ?? "normal" });
  const [error, setError] = useState<string | null>(null);
  const field = (key: keyof ReturnType<typeof receiptValues>, value: string) => setValues((old) => ({ ...old, [key]: value }));
  return <form className="space-y-4" onSubmit={(e) => {
    e.preventDefault();
    if (!vehicles.some((v) => v.id === car)) return setError("Vyberte vozidlo.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date) || !Number.isFinite(Date.parse(values.date)) || new Date(values.date).toISOString().slice(0, 10) !== values.date) return setError("Skontrolujte dátum.");
    if (!Number.isFinite(parseDecimal(values.amount)) || !(parseDecimal(values.amount) > 0)) return setError("Zadajte celkovú sumu väčšiu ako 0.");
    const km = parseDecimal(values.odometer);
    if ((kind === "fuel" || values.odometer.trim()) && (!Number.isInteger(km) || km < 0)) return setError("Doplňte stav tachometra v celých kilometroch.");
    if (kind === "fuel" && (!Number.isFinite(parseDecimal(values.liters)) || !(parseDecimal(values.liters) > 0))) return setError("Skontrolujte natankované litre.");
    if (kind === "cost" && !values.category.trim()) return setError("Vyberte kategóriu.");
    onSave(kind, car, values);
  }}>
    <h3 className="font-semibold">Kontrola pred uložením</h3>
    {data.kind === "unknown" || data.warning ? <p className="text-sm text-warning">{data.warning || "Doklad sa nepodarilo jednoznačne rozpoznať. Údaje doplňte ručne."}</p> : null}
    <label className="block text-sm font-semibold">Vozidlo<Select value={car} onValueChange={setCar}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model}</SelectItem>)}</SelectContent></Select></label>
    <label className="block text-sm font-semibold">Typ záznamu<Select value={kind} onValueChange={(v) => setKind(v === "fuel" ? "fuel" : "cost")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fuel">Tankovanie</SelectItem><SelectItem value="cost">Údržba a ostatné náklady</SelectItem></SelectContent></Select></label>
    <FormField label="Dátum" type="date" value={values.date} onChange={(v) => field("date", v)} />
    <FormField label="Celková suma" value={values.amount} onChange={(v) => field("amount", v)} inputMode="decimal" suffix="€" />
    <FormField label={kind === "fuel" ? "Stav tachometra (doplňte)" : "Stav tachometra (nepovinné)"} value={values.odometer} onChange={(v) => field("odometer", v)} inputMode="numeric" suffix="km" />
    {kind === "fuel" ? <>
      <FormField label="Čerpacia stanica" value={values.station} onChange={(v) => field("station", v.slice(0, 200))} />
      <FormField label="Natankované litre" value={values.liters} onChange={(v) => field("liters", v)} inputMode="decimal" suffix="l" />
      <label className="block text-sm font-semibold">Palivo<Select value={values.fuelType} onValueChange={(v) => { const fuel = VEHICLE_FUEL_TYPES.find((f) => f === v); if (fuel) setValues((old) => ({ ...old, fuelType: fuel })); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{VEHICLE_FUEL_TYPES.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></label>
      <label className="block text-sm font-semibold">Variant paliva<Select value={values.fuelGrade} onValueChange={(v) => setValues((old) => ({ ...old, fuelGrade: v === "premium" ? "premium" : "normal" }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="premium">Plus / Premium</SelectItem></SelectContent></Select></label>
      <p className="text-sm text-muted-foreground">Stav nádrže z bločku nevieme určiť. Uloží sa ako neúplná nádrž; percentá môžete doplniť ceruzkou v denníku.</p>
    </> : <><label className="block text-sm font-semibold">Kategória<Select value={values.category} onValueChange={(v) => field("category", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[...new Set([...COST_CATEGORIES, values.category])].filter(Boolean).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></label><FormField label="Poznámka" value={values.note} onChange={(v) => field("note", v)} /></>}
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    <Button type="submit" className="w-full">Potvrdiť a uložiť záznam</Button>
  </form>;
}