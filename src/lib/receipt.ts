import { z } from "zod";
import { VEHICLE_FUEL_TYPES } from "@/types/fuel";

export const receiptSchema = z.object({
  kind: z.enum(["fuel", "cost", "unknown"]),
  date: z.string().nullable(),
  station: z.string().nullable(),
  liters: z.number().nullable(),
  amount: z.number().nullable(),
  odometer: z.number().nullable(),
  fuelType: z.enum(VEHICLE_FUEL_TYPES).nullable(),
  fuelGrade: z.enum(["normal", "premium"]).nullable(),
  category: z.string().nullable(),
  note: z.string().nullable(),
  warning: z.string().nullable(),
});
export type ReceiptData = z.infer<typeof receiptSchema>;

export function receiptValues(data: ReceiptData) {
  return {
    date: data.date && /^\d{4}-\d{2}-\d{2}$/.test(data.date) && Number.isFinite(Date.parse(data.date)) ? data.date : "",
    station: (data.station ?? "").slice(0, 200),
    liters: data.liters !== null && Number.isFinite(data.liters) && data.liters > 0 ? String(data.liters) : "",
    amount: data.amount !== null && Number.isFinite(data.amount) && data.amount > 0 ? String(data.amount) : "",
    odometer: data.odometer !== null && Number.isInteger(data.odometer) && data.odometer >= 0 ? String(data.odometer) : "",
    category: (data.category ?? "Údržba").slice(0, 100),
    note: (data.note ?? "").slice(0, 1000),
  };
}

export async function prepareReceiptPhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Vyberte fotku JPG, PNG alebo WebP.");
  if (file.size > 20_000_000) throw new Error("Fotka je príliš veľká (maximum 20 MB).");
  const bitmap = await createImageBitmap(file);
  try {
    const ratio = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Fotku sa nepodarilo pripraviť.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL("image/jpeg", 0.8);
    if (result.length > 2_000_000) throw new Error("Fotka je príliš veľká. Skúste odfotiť iba bloček.");
    return result;
  } finally { bitmap.close(); }
}