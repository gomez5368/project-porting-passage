import { describe, expect, it } from "vitest";
import { buildJournal } from "@/lib/journal";
import type { Cost, FillUp } from "@/types/fuel";

const f = (id: string, odometer: number, date: string): FillUp => ({ id, vehicleId: "v", date, odometer, liters: 40, totalCost: 60, pricePerLiter: 1.5, fuelType: "Benzín", isFullTank: true });
const c = (id: string, odometer: number | null, date: string): Cost => ({ id, vehicleId: "v", date, amount: 100, category: "Údržba", note: "", odometer });

describe("buildJournal", () => {
  it("sorts fuel and costs together by highest odometer first", () => {
    const ids = buildJournal([f("a", 145000, "2025-01-01"), f("b", 145400, "2025-02-01")], [c("x", 145200, "2025-01-15")]).map((e) => e.id);
    expect(ids).toEqual(["b", "x", "a"]);
  });
  it("uses date when km are equal or missing", () => {
    const ids = buildJournal([f("a", 1000, "2025-01-01")], [c("x", 1000, "2025-03-01"), c("y", null, "2025-02-01")]).map((e) => e.id);
    expect(ids).toEqual(["x", "y", "a"]);
  });
});
