import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requirePageCapability } from "@/lib/page-auth";
import { can } from "@/lib/rbac";
import { QuoteBuilder, type QuoteItem, type QuoteHeader } from "@/components/modules/QuoteBuilder";

export const dynamic = "force-dynamic";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageCapability("quotes.view");
  const quote = await prisma.quotation.findFirst({ where: { id, deletedAt: null }, include: { items: { orderBy: { position: "asc" } }, contact: true } });
  if (!quote) notFound();

  const canSeeCosts = can(user.role, "quotes.costs");

  const header: Partial<QuoteHeader> = {
    contactId: quote.contactId,
    opportunityId: quote.opportunityId,
    projectName: quote.projectName,
    projectAddress: quote.projectAddress,
    city: quote.city,
    region: quote.region,
    language: quote.language,
    validUntil: quote.validUntil?.toISOString().slice(0, 10) ?? null,
    durationDays: quote.durationDays,
    warrantyMonths: quote.warrantyMonths,
    wastePct: quote.wastePct,
    markupPct: quote.markupPct,
    discountPct: quote.discountPct,
    vatRate: quote.vatRate,
    paymentSchedule: (quote.paymentSchedule as unknown as QuoteHeader["paymentSchedule"]) ?? [],
    termsEl: quote.termsEl,
    exclusionsEl: quote.exclusionsEl,
    notesEl: quote.notesEl,
  };

  const items: QuoteItem[] = quote.items.map((it) => ({
    id: it.id,
    type: it.type,
    description: it.description,
    finishId: it.finishId,
    unit: it.unit,
    quantity: Number(it.quantity),
    unitPrice: Number(it.unitPrice),
    unitCost: canSeeCosts ? Number(it.unitCost) : 0,
    hoursPerUnit: it.hoursPerUnit,
    notes: it.notes,
  }));

  return (
    <div className="max-w-[1400px] mx-auto">
      <QuoteBuilder
        quoteId={quote.id}
        initialHeader={header}
        initialItems={items}
        meta={{ number: quote.number, status: quote.status, version: quote.version, publicToken: quote.publicToken, contactName: `${quote.contact.firstName} ${quote.contact.lastName}` }}
      />
    </div>
  );
}
