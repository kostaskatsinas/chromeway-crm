import type { InvoiceStatus } from "@prisma/client";

export function invoicePaymentState(total: number, paid: number, dueDate?: Date | null, now = new Date()): InvoiceStatus {
  if (paid >= total) return "PAID";
  if (paid > 0) return "PARTIALLY_PAID";
  if (dueDate && dueDate < now) return "OVERDUE";
  return "ISSUED";
}
