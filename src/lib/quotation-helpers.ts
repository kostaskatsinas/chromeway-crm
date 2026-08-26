import { prisma } from "@/lib/db";
import { computeQuoteTotals } from "./calc";
import { can } from "./rbac";
import type { Role } from "@prisma/client";
import { stripQuotationCosts } from "./security";

export async function nextQuotationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.quotation.count({
    where: { createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
  });
  return `CW-Q-${year}-${String(count + 1).padStart(4, "0")}`;
}

/** Server-side quotation totals (header + numeric items). */
export function totalsFor(header: Record<string, unknown>, items: { quantity: number; unitPrice: number; unitCost?: number }[]) {
  return computeQuoteTotals({
    items,
    wastePct: Number(header.wastePct ?? 0),
    markupPct: Number(header.markupPct ?? 0),
    discountPct: Number(header.discountPct ?? 0),
    vatRate: Number(header.vatRate ?? 24),
  });
}

export function sanitizeQuotationForRole<T extends Record<string, unknown>>(quote: T, role: Role): T {
  return stripQuotationCosts(quote, can(role, "quotes.costs"));
}
