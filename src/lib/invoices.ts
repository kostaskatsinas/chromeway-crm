import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { invoicePaymentState } from "./invoice-state";

type DbClient = Prisma.TransactionClient | typeof prisma;

/** Keeps the denormalized invoice balance and status in sync with active payments. */
export async function recalcInvoiceStatus(invoiceId?: string | null, db: DbClient = prisma) {
  if (!invoiceId) return;
  const inv = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: { where: { deletedAt: null } } },
  });
  if (!inv || ["DRAFT", "CANCELLED", "WRITTEN_OFF"].includes(inv.status)) return;
  const paid = inv.payments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0);
  await db.invoice.update({
    where: { id: invoiceId },
    data: { paidTotal: paid, status: invoicePaymentState(Number(inv.total), paid, inv.dueDate) },
  });
}
