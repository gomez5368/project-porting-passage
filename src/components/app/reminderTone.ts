import type { ReminderStatus } from "@/lib/reminders";

export const statusText: Record<ReminderStatus, string> = {
  ok: "text-success",
  soon: "text-caution",
  overdue: "text-destructive",
};
export const statusCard: Record<ReminderStatus, string> = {
  ok: "border-border",
  soon: "border-caution/60 bg-caution/10",
  overdue: "border-destructive/60 bg-destructive/10",
};
export const statusBar: Record<ReminderStatus, string> = {
  ok: "bg-success",
  soon: "bg-caution",
  overdue: "bg-destructive",
};
