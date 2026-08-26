import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, ApiError, audit, clientMeta } from "@/lib/api";
import { totalsFor, sanitizeQuotationForRole } from "@/lib/quotation-helpers";
import { secureToken } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const updateSchema = z.object({
  contactId: z.string().nullish(),
  companyId: z.string().nullish(),
  opportunityId: z.string().nullish(),
  projectName: z.string().trim().min(1).nullish(),
  projectAddress: z.string().nullish(),
  city: z.string().nullish(),
  region: z.string().nullish(),
  language: z.enum(["el", "en"]).nullish(),
  validUntil: z.date().nullish(),
  durationDays: z.number().int().nullish(),
  warrantyMonths: z.number().int().nullish(),
  wastePct: z.number().min(0).max(500).nullish(),
  markupPct: z.number().min(0).max(500).nullish(),
  discountPct: z.number().min(0).max(100).nullish(),
  vatRate: z.number().min(0).max(100).nullish(),
  paymentSchedule: z.array(z.object({ label: z.string(), pct: z.number().min(0).max(100), dueDays: z.number().int().min(0).default(0) }))
    .refine((schedule) => Math.abs(schedule.reduce((sum, row) => sum + row.pct, 0) - 100) < 0.001, "Payment schedule must total 100%")
    .nullish(),
  termsEl: z.string().nullish(),
  exclusionsEl: z.string().nullish(),
  notesEl: z.string().nullish(),
  status: z.enum(["DRAFT", "SENT", "VIEWED", "ACCEPTED", "REJECTED", "EXPIRED"]).nullish(),
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        type: z.enum(["FINISH_APPLICATION", "SURFACE_PREPARATION", "MATERIAL", "LABOUR", "TRAVEL_TRANSPORT", "ACCOMMODATION", "EQUIPMENT", "SUBCONTRACTOR", "CUSTOM_ITEM"]),
        description: z.string(),
        finishId: z.string().nullish(),
        unit: z.enum(["SQM", "LINEAR_M", "PIECE", "KG", "LITER", "HOUR", "DAY", "LOT"]),
        quantity: z.number().nonnegative(),
        unitPrice: z.number().nonnegative(),
        unitCost: z.number().default(0),
        hoursPerUnit: z.number().default(0),
        notes: z.string().nullish(),
      })
    )
    .nullish(),
});

async function load(id: string) {
  const quote = await prisma.quotation.findFirst({ where: { id, deletedAt: null }, include: { items: true } });
  if (!quote) throw new ApiError(404, "NOT_FOUND");
  return quote;
}

function clean<T extends Record<string, unknown>>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) out[k] = v === "" ? null : v;
  return out as T;
}

// ─── GET ──────────────────────────────────────────────
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handler(async (_rq, c) => {
    const quote = await load(id);
    return ok(sanitizeQuotationForRole(quote, c.user.role));
  }, { capability: "quotes.view" })(req);
}

// ─── PATCH full update (header + items replace) ───────
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handler(async (rq, c) => {
    const existing = await load(id);
    const body = await parseBody(rq, updateSchema);
    const { items, ...header } = body;

    const mergedHeader = { ...existing, ...clean(header as Record<string, unknown>) };
    const mergedItems = (items ?? existing.items).map((it: any) => ({
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
      unitCost: Number(it.unitCost ?? 0),
    }));
    const totals = totalsFor(mergedHeader as never, mergedItems);

    // Replace line items atomically so a failed update cannot erase the quote.
    const updated = await prisma.$transaction(async (tx) => {
      await tx.quotationItem.deleteMany({ where: { quotationId: id } });
      return tx.quotation.update({
        where: { id },
        data: {
        ...(clean(header as Record<string, unknown>) as any),
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        totalNet: totals.totalNet,
        vatAmount: totals.vatAmount,
        totalGross: totals.totalGross,
        internalCost: totals.internalCost,
        internalMarginPct: totals.marginPct,
        items: {
          create: ((items && items.length ? items : existing.items) as any[]).map((it: any, i: number) => ({
            position: i,
            type: (it.type ?? "FINISH_APPLICATION") as never,
            description: it.description,
            finishId: it.finishId ?? null,
            unit: (it.unit ?? "SQM") as never,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            unitCost: it.unitCost ?? 0,
            hoursPerUnit: it.hoursPerUnit ?? 0,
            notes: it.notes ?? null,
          })),
        },
        },
        include: { items: true },
      });
    });
    await audit(c.user.id, "UPDATE", "quotation", id, existing, updated, clientMeta(rq));
    return ok(sanitizeQuotationForRole(updated, c.user.role));
  }, { capability: "quotes.edit" })(req);
}

// ─── POST action: send | new-version | mark-viewed ────
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handler(async (rq, c) => {
    const body = await parseBody(rq, z.object({ action: z.enum(["send", "newVersion", "regenerateLink"]), language: z.enum(["el", "en"]).optional() }));
    const quote = await load(id);

    if (body.action === "send") {
      if (!["DRAFT", "VIEWED", "REJECTED", "EXPIRED"].includes(quote.status)) throw new ApiError(400, "INVALID_STATE");
      const updated = await prisma.quotation.update({
        where: { id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          publicToken: secureToken(20),
          publicTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          ...(quote.opportunityId ? { opportunity: { update: { stage: "QUOTATION_SENT" } } } : {}),
        },
        include: { items: true },
      });
      await prisma.activity.create({
        data: { kind: "SYSTEM", subject: `Quotation ${quote.number} sent`, quotationId: id, contactId: quote.contactId, userId: c.user.id },
      });
      await audit(c.user.id, "SEND", "quotation", id, quote.status, "SENT", clientMeta(rq));
      return ok(sanitizeQuotationForRole(updated, c.user.role));
    }

    if (body.action === "regenerateLink") {
      const updated = await prisma.quotation.update({
        where: { id },
        data: { publicToken: secureToken(20), publicTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) },
      });
      return ok(sanitizeQuotationForRole(updated, c.user.role));
    }

    // newVersion: duplicate with version+1 within group; original becomes superseded draft history
    const maxVersion = await prisma.quotation.aggregate({ where: { groupId: quote.groupId }, _max: { version: true } });
    const nextV = (maxVersion._max.version ?? quote.version) + 1;
    const dup = await prisma.$transaction(async (tx) => {
      await tx.quotationItem.updateMany({ where: { quotationId: id }, data: {} }); // keep original intact
      const year = new Date().getFullYear();
      const count = await tx.quotation.count({ where: { createdAt: { gte: new Date(`${year}-01-01`) } } });
      return tx.quotation.create({
        data: {
          groupId: quote.groupId,
          version: nextV,
          number: `${quote.number.split("-").slice(0, 4).join("-")}-${nextV}`,
          status: "DRAFT",
          contactId: quote.contactId,
          companyId: quote.companyId,
          opportunityId: quote.opportunityId,
          projectName: quote.projectName,
          projectAddress: quote.projectAddress,
          city: quote.city,
          region: quote.region,
          language: body.language ?? quote.language,
          issueDate: new Date(),
          validUntil: quote.validUntil,
          durationDays: quote.durationDays,
          warrantyMonths: quote.warrantyMonths,
          wastePct: quote.wastePct,
          markupPct: quote.markupPct,
          discountPct: quote.discountPct,
          vatRate: quote.vatRate,
          subtotal: quote.subtotal,
          discountAmount: quote.discountAmount,
          totalNet: quote.totalNet,
          vatAmount: quote.vatAmount,
          totalGross: quote.totalGross,
          internalCost: quote.internalCost,
          internalMarginPct: quote.internalMarginPct,
          paymentSchedule: quote.paymentSchedule as never,
          termsEl: quote.termsEl,
          exclusionsEl: quote.exclusionsEl,
          notesEl: quote.notesEl,
          publicToken: secureToken(20),
          createdById: c.user.id,
          items: {
            create: quote.items.map((it) => ({
              position: it.position,
              type: it.type,
              description: it.description,
              finishId: it.finishId,
              unit: it.unit,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              unitCost: it.unitCost,
              hoursPerUnit: it.hoursPerUnit,
              notes: it.notes,
            })),
          },
        },
        include: { items: true },
      });
      void count;
    });
    await audit(c.user.id, "NEW_VERSION", "quotation", dup.id, null, dup, clientMeta(rq));
    return ok(sanitizeQuotationForRole(dup, c.user.role), 201);
  }, { capability: "quotes.edit" })(req);
}

// ─── DELETE soft ──────────────────────────────────────
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handler(async (rq, c) => {
    const quote = await load(id);
    await prisma.quotation.update({ where: { id }, data: { deletedAt: new Date() } });
    await audit(c.user.id, "SOFT_DELETE", "quotation", id, quote, null, clientMeta(rq));
    return ok({ deleted: true });
  }, { capability: "quotes.delete" })(req);
}
