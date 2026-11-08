import { Car, Fuel, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatNumber } from "@/lib/fuelCalculations";
import type { AppState } from "@/types/fuel";

type BackupSummaryCardProps = {
  data: Pick<AppState, "vehicles" | "fillUps" | "costs">;
  source: "current" | "imported";
};

export function getBackupTotals(data: BackupSummaryCardProps["data"]) {
  const fuelTotal = data.fillUps.reduce((sum, f) => sum + f.totalCost, 0);
  const otherTotal = data.costs.reduce((sum, c) => sum + c.amount, 0);
  return { fuelTotal, otherTotal, total: fuelTotal + otherTotal };
}

export function BackupSummaryCard({ data, source }: BackupSummaryCardProps) {
  const { fuelTotal, otherTotal, total } = getBackupTotals(data);
  const stats = [
    { label: "Autá", value: formatNumber(data.vehicles.length), icon: Car },
    { label: "Tankovania", value: formatNumber(data.fillUps.length), icon: Fuel },
    { label: "Výdavky spolu", value: formatCurrency(total), icon: Wallet },
  ];

  return (
    <Card className="mt-4 gap-4 border-border/60 bg-background/60 py-4 shadow-none">
      <CardHeader className="px-4">
        <CardTitle className="text-sm">{source === "imported" ? "Obsah nahratej zálohy" : "Čo sa uloží do zálohy"}</CardTitle>
        <CardDescription className="text-xs">
          {source === "imported" ? "Skontrolujte údaje pred obnovením." : "Aktuálne dáta v tomto prehliadači."}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4">
        <dl className="grid grid-cols-3 gap-2">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex min-w-0 flex-col gap-1 rounded-lg border border-border/60 bg-card p-3">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span className="truncate">{label}</span>
              </dt>
              <dd className="truncate text-lg font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Palivo {formatCurrency(fuelTotal)} · Ostatné náklady {formatCurrency(otherTotal)}
        </p>
      </CardContent>
    </Card>
  );
}
