import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import type { NotificationType, Prisma } from "@prisma/client";
import { handler, ok, parseBody, ApiError, audit, clientMeta } from "@/lib/api";
import { createProjectFromQuotation } from "@/lib/project-creation";

/* eslint-disable @typescript-eslint/no-explicit-any */

async function getCompanyProfile() {
  const s = await prisma.setting.findFirst();
  const data = (s?.data as Record<string, unknown>) ?? {};
  return { companyName: typeof data.companyName === "string" ? data.companyName : "Chromeway" };
}

/** Public (token) view of a quotation — sanitized of all internal data. */
export const GET = handler(async (_req, c) => {
    const token = c.params.token;
    const quote = await prisma.quotation.findFirst({
      where: { publicToken: token, deletedAt: null },
      include: { items: { orderBy: { position: "asc" } }, contact: true },
    });
    if (!quote) throw new ApiError(404, "NOT_FOUND");

    if (!quote.viewedAt && ["SENT", "VIEWED"].includes(quote.status)) {
      await prisma.quotation.update({ where: { id: quote.id }, data: { viewedAt: new Date(), status: "VIEWED" } });
    }

    const expired = quote.publicTokenExpiresAt ? quote.publicTokenExpiresAt < new Date() : false;
    return ok({
      number: quote.number,
      version: quote.version,
      status: quote.status,
      projectName: quote.projectName,
      projectAddress: quote.projectAddress,
      language: quote.language,
      validUntil: quote.validUntil,
      durationDays: quote.durationDays,
      warrantyMonths: quote.warrantyMonths,
      wastePct: quote.wastePct,
      markupPct: quote.markupPct,
      discountPct: quote.discountPct,
      vatRate: quote.vatRate,
      totalGross: quote.totalGross,
      paymentSchedule: quote.paymentSchedule,
      termsEl: quote.termsEl,
      exclusionsEl: quote.exclusionsEl,
      notesEl: quote.notesEl,
      expired,
      items: quote.items.map((it: any) => ({
        id: it.id,
        type: it.type,
        description: it.description,
        unit: it.unit,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        notes: it.notes,
      })),
      contact: { firstName: quote.contact.firstName, lastName: quote.contact.lastName },
      companyProfile: await getCompanyProfile(),
    });
}, { public: true });

const decisionSchema = z.object({
  decision: z.enum(["accept", "reject"]),
  reason: z.string().max(5000).nullish(),
  name: z.string().max(200).nullish(),
});

/** Customer accept/reject through secure link — no authentication. */
export async function POST(req: NextRequest) {
  return handler(async (rq) => {
    const token = new URL(rq.url).pathname.split("/").filter(Boolean).pop() as string;
    const body = await parseBody(rq, decisionSchema);
    const result = await prisma.$transaction(async (tx) => {
      const quote = await tx.quotation.findFirst({ where: { publicToken: token, deletedAt: null } });
      if (!quote) throw new ApiError(404, "NOT_FOUND");
      if (quote.publicTokenExpiresAt && quote.publicTokenExpiresAt < new Date()) throw new ApiError(410, "LINK_EXPIRED");

      const now = new Date();
      const status = body.decision === "accept" ? "ACCEPTED" : "REJECTED";
      const claimed = await tx.quotation.updateMany({
        where: { id: quote.id, status: { notIn: ["ACCEPTED", "REJECTED"] } },
        data: body.decision === "accept"
          ? { status, acceptedAt: now }
          : { status, rejectedAt: now, rejectionReason: body.reason ?? null },
      });
      if (claimed.count !== 1) throw new ApiError(400, "ALREADY_DECIDED");

      if (body.decision === "accept") {
        if (quote.opportunityId) {
          await tx.opportunity.updateMany({
            where: { id: quote.opportunityId, stage: { not: "WON" } },
            data: { stage: "WON", closedAt: now, probability: 100 },
          });
        }
        await createProjectFromQuotation(quote.id, undefined, tx);
        await notifyUser(tx, quote.createdById, `Προσφορά ${quote.number} ΑΠΟΔΕΚΤΗΚΕ`, `Δημιουργήθηκε αυτόματα έργο από την προσφορά ${quote.number}.`, `/quotes/${quote.id}`, "QUOTE_ACCEPTED");
        await tx.activity.create({
          data: {
            kind: "SYSTEM",
            subject: `Προσφορά ${quote.number} αποδέχθηκε μέσω ασφαλούς συνδέσμου (${body.name ?? "πελάτης"})`,
            quotationId: quote.id,
            contactId: quote.contactId,
          },
        });
      } else {
        if (quote.opportunityId) {
          await tx.opportunity.updateMany({
            where: { id: quote.opportunityId, stage: { notIn: ["WON", "LOST"] } },
            data: { stage: "NEGOTIATION" },
          });
        }
        await notifyUser(tx, quote.createdById, `Προσφορά ${quote.number} απορρίφθηκε`, body.reason || undefined, `/quotes/${quote.id}`, "QUOTE_REJECTED");
        await tx.activity.create({
          data: { kind: "SYSTEM", subject: `Προσφορά ${quote.number} απορρίφθηκε μέσω ασφαλούς συνδέσμου`, quotationId: quote.id, contactId: quote.contactId },
        });
      }
      return { quote, status };
    });

    await audit(null, body.decision === "accept" ? "ACCEPT" : "REJECT", "quotation", result.quote.id, result.quote.status, result.status, clientMeta(rq));
    return ok({ decided: true, status: result.status });
  }, { public: true })(req);
}

async function notifyUser(db: Prisma.TransactionClient, userId: string | null | undefined, title: string, body?: string, link?: string, type?: string): Promise<void> {
  if (!userId) return;
  await db.notification.create({
    data: { userId, title, body, link, type: (type ?? "GENERIC") as NotificationType },
  });
}
