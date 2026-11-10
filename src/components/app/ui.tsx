import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Car, Pencil, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, formatNumber, isFullTankFillUp } from "@/lib/fuelCalculations";
import { fillUpKey, parseSpotrebaImport, type ImportedFillUp, type ImportResult } from "@/lib/importSpotreba";
import type { FillUp, Vehicle } from "@/types/fuel";

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-1 text-muted-foreground">{subtitle}</p> : null}
    </header>
  );
}

export function FormField({
  label, value, onChange, placeholder, error, hint, suffix, inputMode, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string | undefined;
  error?: string | null | undefined; hint?: string | undefined; suffix?: string | undefined;
  inputMode?: "numeric" | "decimal" | "text"; type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-muted-foreground">{label}</span>
      <span className={cn("flex items-center rounded-lg border bg-muted px-3 focus-within:ring-2 focus-within:ring-ring", error ? "border-destructive" : "border-border")}>
        <input
          type={type} value={value} inputMode={inputMode} placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
        />
        {suffix ? <span className="ml-2 text-sm text-muted-foreground">{suffix}</span> : null}
      </span>
      {error ? <span className="mt-1 block text-sm text-destructive">{error}</span>
        : hint ? <span className="mt-1 block text-sm text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function SegmentedControl<T extends string>({ options, value, onChange, labels }: {
  options: readonly T[]; value: T; onChange: (v: T) => void; labels?: Partial<Record<T, string>>;
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={cn("flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
            o === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-card")}>
          {labels?.[o] ?? o}
        </button>
      ))}
    </div>
  );
}

export function VehicleSwitcher({ vehicles, selectedId, onSelect }: { vehicles: Vehicle[]; selectedId: string | null; onSelect: (id: string) => void }) {
  if (vehicles.length < 2) return null;
  return (
    <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
      {vehicles.map((v) => (
        <button key={v.id} type="button" onClick={() => onSelect(v.id)}
          className={cn("whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors",
            v.id === selectedId ? "border-primary bg-accent text-accent-foreground" : "border-border text-muted-foreground hover:bg-card")}>
          {v.brand} {v.model}
        </button>
      ))}
    </div>
  );
}

export function EmptyVehicleState() {
  return (
    <div className="panel flex flex-col items-center py-10 text-center">
      <div className="mb-4 rounded-full bg-accent p-4 text-accent-foreground"><Car className="size-8" /></div>
      <h2 className="text-lg font-semibold">Zatiaľ nemáte žiadne vozidlo</h2>
      <p className="mt-1 max-w-xs text-muted-foreground">Pridajte svoje auto a začnite sledovať spotrebu a výdavky.</p>
      <Button asChild size="lg" className="mt-5"><Link to="/vozidla">Pridať vozidlo</Link></Button>
    </div>
  );
}

const statTone = { primary: "bg-primary", secondary: "bg-secondary", warning: "bg-warning", success: "bg-success" } as const;

export function StatCard({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone: keyof typeof statTone }) {
  return (
    <div className="panel">
      <div className={cn("mb-3 h-1 w-8 rounded-full", statTone[tone])} />
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="tabular text-2xl font-bold">{value}</span>
        {unit ? <span className="text-sm text-muted-foreground">{unit}</span> : null}
      </p>
    </div>
  );
}

export type TrendPoint = { label: string; value: number };

export function TrendChart({ title, points, tone, formatValue, emptyText }: {
  title: string; points: TrendPoint[]; tone: "primary" | "secondary"; formatValue: (v: number) => string; emptyText: string;
}) {
  const W = 600, H = 200, L = 80, R = 16, T = 16, B = 32;
  const latest = points.at(-1);
  const color = tone === "primary" ? "text-primary" : "text-secondary";
  let chart: ReactNode = <p className="text-sm text-muted-foreground">{emptyText}</p>;
  if (points.length > 0) {
    const iw = W - L - R, ih = H - T - B, base = T + ih;
    const vals = points.map((p) => p.value);
    const mn = Math.min(...vals), mx = Math.max(...vals);
    const spread = mx - mn || Math.max(Math.abs(mx) * 0.2, 1);
    const yMin = mn - spread * 0.15, yMax = mx + spread * 0.15;
    const x = (i: number) => (points.length === 1 ? L + iw / 2 : L + (i / (points.length - 1)) * iw);
    const y = (v: number) => T + (1 - (v - yMin) / (yMax - yMin)) * ih;
    const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
    const area = `${line} L${x(points.length - 1).toFixed(1)},${base} L${x(0).toFixed(1)},${base} Z`;
    const step = Math.max(1, Math.ceil(points.length / 5));
    const idx = points.map((_, i) => i).filter((i) => i % step === 0 || i === points.length - 1);
    chart = (
      <svg viewBox={`0 0 ${W} ${H}`} className={cn("w-full", color)} role="img" aria-label={title}>
        <line x1={L} x2={W - R} y1={T} y2={T} className="stroke-border" />
        <line x1={L} x2={W - R} y1={base} y2={base} className="stroke-border" />
        <text x={L - 8} y={T + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">{formatValue(yMax)}</text>
        <text x={L - 8} y={base} textAnchor="end" className="fill-muted-foreground text-[11px]">{formatValue(yMin)}</text>
        <path d={area} fill="currentColor" fillOpacity={0.12} />
        <path d={line} stroke="currentColor" strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.value)} r={4} fill="currentColor" className="stroke-card" strokeWidth={2} />)}
        {idx.map((i) => (
          <text key={`l${i}`} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} className="fill-muted-foreground text-[11px]">{points[i]?.label}</text>
        ))}
      </svg>
    );
  }
  return (
    <section className="panel mt-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {latest ? <span className={cn("tabular text-sm font-semibold", color)}>{formatValue(latest.value)}</span> : null}
      </div>
      {chart}
    </section>
  );
}

export function FillUpRow({ fillUp, consumption, onDelete, onEdit }: { fillUp: FillUp; consumption: number | null; onDelete: (id: string) => void; onEdit?: (fillUp: FillUp) => void }) {
  const [confirming, setConfirming] = useState(false);
  const meta: [string, string, boolean?][] = [
    ["Litre", `${formatNumber(fillUp.liters, 2)} l`],
    ["Cena", formatCurrency(fillUp.totalCost)],
    ["Cena za liter", formatCurrency(fillUp.pricePerLiter, 3)],
    ["Spotreba", consumption !== null ? `${formatNumber(consumption, 1)} l/100 km` : "—", consumption !== null],
  ];
  return (
    <article className="panel mb-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{formatDate(fillUp.date)}</p>
          <p className="tabular text-sm text-muted-foreground">{formatNumber(fillUp.odometer)} km</p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold">{fillUp.fuelType}</span>
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">{fillUp.tankLevelPercent !== undefined ? `Nádrž ${formatNumber(fillUp.tankLevelPercent, 0)} %` : isFullTankFillUp(fillUp) ? "Plná nádrž" : "Neúplná nádrž"}</span>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {meta.map(([l, v, hi]) => (
          <div key={l}><dt className="text-xs text-muted-foreground">{l}</dt><dd className={cn("tabular font-semibold", hi && "text-primary")}>{v}</dd></div>
        ))}
      </dl>
      {confirming ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <span className="text-sm">Naozaj chcete tento záznam vymazať?</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirming(false)}>Zrušiť</Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete(fillUp.id)}>Vymazať</Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {onEdit ? <Button type="button" variant="outline" size="sm" onClick={() => onEdit(fillUp)}><Pencil className="size-4" /> Upraviť</Button> : null}
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)} className="text-destructive">
            <Trash2 className="size-4" /> Vymazať záznam
          </Button>
        </div>
      )}
    </article>
  );
}

export function ImportSpotrebaCard({ existingFillUps, onImport }: { existingFillUps: FillUp[]; onImport: (r: ImportedFillUp[]) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const existing = new Set(existingFillUps.map(fillUpKey));
  const fresh = result?.records.filter((r) => !existing.has(fillUpKey(r))) ?? [];
  const dupes = (result?.records.length ?? 0) - fresh.length;
  const close = () => { setText(""); setResult(null); setError(null); setOpen(false); };
  const analyze = () => {
    const parsed = parseSpotrebaImport(text);
    setResult(parsed);
    setError(parsed.records.length === 0 && parsed.issues.length === 0
      ? "V texte sme nenašli žiadne údaje o tankovaní. Skontrolujte, či ste skopírovali celú tabuľku." : null);
  };
  return (
    <section className="panel mb-5">
      <div className="flex gap-3">
        <div className="h-fit rounded-lg bg-muted p-2 text-secondary"><Upload className="size-5" /></div>
        <div>
          <h2 className="font-semibold">Import starých dát zo spotreba.sk</h2>
          <p className="text-sm text-muted-foreground">Skopírujte tabuľku tankovaní z webu a pridajte ju do histórie jedným krokom.</p>
        </div>
      </div>
      <Button variant="outline" className="mt-3 w-full" onClick={() => setOpen(true)}>Importovať dáta</Button>
      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Import starých dát zo spotreba.sk</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Na webe spotreba.sk označte tabuľku s tankovaniami, skopírujte ju (Ctrl+C) a vložte sem (Ctrl+V).</p>
          <textarea value={text} onChange={(e) => { setText(e.target.value); setResult(null); setError(null); }}
            placeholder={"Dátum\tStav tachometra\tLitre\tCena\n01.10.2025\t125 340\t45,20\t72,90"}
            className="min-h-40 w-full rounded-lg border border-border bg-muted p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring" />
          <Button onClick={analyze} disabled={text.trim() === ""}>Analyzovať dáta</Button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {result && result.records.length > 0 ? (
            <div className="rounded-lg bg-accent p-3 text-sm">
              <p className="font-semibold text-accent-foreground">Rozpoznaných tankovaní: {result.records.length}</p>
              <p>Nových na import: {fresh.length}{dupes > 0 ? ` · duplicitných (preskočíme): ${dupes}` : ""}</p>
            </div>
          ) : null}
          {result && result.issues.length > 0 ? (
            <div className="rounded-lg border border-destructive/40 p-3 text-sm">
              <p className="font-semibold text-destructive">Riadky, ktoré sa nepodarilo načítať:</p>
              {result.issues.map((i) => <p key={i.line}>Riadok {i.line}: {i.message}</p>)}
            </div>
          ) : null}
          {fresh.length > 0 ? (
            <ul className="divide-y divide-border rounded-lg border border-border text-sm">
              {fresh.map((r, i) => (
                <li key={`${fillUpKey(r)}-${i}`} className="flex justify-between gap-2 px-3 py-2">
                  <span className="font-semibold">{formatDate(r.date)}</span>
                  <span className="tabular text-muted-foreground">{formatNumber(r.odometer)} km · {formatNumber(r.liters, 2)} l · {formatCurrency(r.totalCost)}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <Button onClick={() => { onImport(fresh); close(); }} disabled={fresh.length === 0}>
            {fresh.length > 0 ? `Uložiť ${fresh.length} tankovaní` : "Uložiť do histórie"}
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
