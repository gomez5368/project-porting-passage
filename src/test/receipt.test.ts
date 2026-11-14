import { describe, expect, it } from "vitest";
import { receiptSchema, receiptValues } from "@/lib/receipt";

const empty = { kind: "fuel" as const, date: null, station: null, liters: null, amount: null, odometer: null, fuelType: null, fuelGrade: null, category: null, note: null, warning: null };
describe("receipt review", () => {
  it("leaves missing receipt fields empty rather than inventing values", () => {
    expect(receiptValues(empty)).toMatchObject({ date: "", odometer: "", amount: "", liters: "" });
  });
  it("preserves extracted fuel values for review", () => {
    expect(receiptValues({ ...empty, date: "2026-11-14", liters: 35.5, amount: 55.74, station: "Slovnaft" })).toMatchObject({ liters: "35.5", amount: "55.74", station: "Slovnaft" });
  });
  it("rejects invalid record types", () => expect(receiptSchema.safeParse({ ...empty, kind: "instructions" }).success).toBe(false));
  it("does not prefill invalid monetary or odometer values", () => {
    expect(receiptValues({ ...empty, amount: -5, liters: -10, odometer: 3.5 })).toMatchObject({ amount: "", liters: "", odometer: "" });
  });
});