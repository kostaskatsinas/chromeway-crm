import { prisma } from "@/lib/db";

export async function nextInvoiceNumber(kind: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix =
    kind === "CREDIT_NOTE" ? `CW-CN-${year}` : kind === "PROFORMA" ? `CW-PF-${year}` : `CW-INV-${year}`;
  const count = await prisma.invoice.count({
    where: { kind: kind as never, createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
  });
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}
