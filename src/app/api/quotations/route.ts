import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, audit, clientMeta } from "@/lib/api";
import { totalsFor, nextQuotationNumber, sanitizeQuotationForRole } from "@/lib/quotation-helpers";
import { secureToken } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

const lineSchema = z.object({
  type: z.enum(["FINISH_APPLICATION", "SURFACE_PREPARATION", "MATERIAL", "LABOUR", "TRAVEL_TRANSPORT", "ACCOMMODATION", "EQUIPMENT", "SUBCONTRACTOR", "CUSTOM_ITEM"]).default("FINISH_APPLICATION"),
  description: z.string().trim().min(1),
  finishId: z.string().nullish(),
  unit: z.enum(["SQM", "LINEAR_M", "PIECE", "KG", "LITER", "HOUR", "DAY", "LOT"]).default("SQM"),
  quantity: z.number().nonnegative(),
  unitPrice: z.number().nonnegative(),
  unitCost: z.number().nonnegative().default(0),
  hoursPerUnit: z.number().nonnegative().default(0),
  notes: z.string().nullish(),
});

const createSchema = z.object({
  contactId: z.string().min(1),
  companyId: z.string().nullish(),
  opportunityId: z.string().nullish(),
  projectName: z.string().trim().min(1),
  projectAddress: z.string().nullish(),
  city: z.string().nullish(),
  region: z.string().default("ATTICA"),
  language: z.enum(["el", "en"]).default("el"),
  validUntil: z.date().nullish(),
  durationDays: z.number().int().nullish(),
  warrantyMonths: z.number().int().default(24),
  wastePct: z.number().min(0).max(500).default(5),
  markupPct: z.number().min(0).max(500).default(35),
  discountPct: z.number().min(0).max(100).default(0),
  vatRate: z.number().min(0).max(100).default(24),
  paymentSchedule: z.array(z.object({ label: z.string(), pct: z.number().min(0).max(100), dueDays: z.number().int().min(0).default(0) }))
    .refine((schedule) => schedule.length === 0 || Math.abs(schedule.reduce((sum, row) => sum + row.pct, 0) - 100) < 0.001, "Payment schedule must total 100%")
    .default([]),
  termsEl: z.string().nullish(),
  exclusionsEl: z.string().nullish(),
  notesEl: z.string().nullish(),
  items: z.array(lineSchema).default([]),
});

function clean<T extends Record<string, unknown>>(o: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) out[k] = v === "" ? null : v;
  return out as T;
}

// ─── GET list ─────────────────────────────────────────
export const GET = handler(async (req, c) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const where: Record<string, unknown> = { deletedAt: null };
  if (status) where.status = status;
  if (url.searchParams.get("contactId")) where.contactId = url.searchParams.get("contactId");
  const q = url.searchParams.get("q");
  if (q) {
    where.OR = [
      { number: { contains: q, mode: "insensitive" as const } },
      { projectName: { contains: q, mode: "insensitive" as const } },
      { contact: { OR: [{ firstName: { contains: q, mode: "insensitive" as const } }, { lastName: { contains: q, mode: "insensitive" as const } }] } },
    ];
  }
  const [items, total] = await Promise.all([
    prisma.quotation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: { select: { items: true } },
      },
      take: Math.min(200, parseInt(url.searchParams.get("pageSize") ?? "100")),
    }),
    prisma.quotation.count({ where }),
  ]);
  return ok({ items: items.map((quote) => sanitizeQuotationForRole(quote, c.user.role)), total });
}, { capability: "quotes.view" });

// ─── POST create ──────────────────────────────────────
export async function POST(req: NextRequest) {
  return handler(async (rq, c) => {
    const body = await parseBody(rq, createSchema);
    const rawItems = body.items ?? [];
    const items = rawItems.map((it) => ({ quantity: Number(it.quantity), unitPrice: Number(it.unitPrice), unitCost: Number(it.unitCost ?? 0) }));
    const header = body;
    const totals = totalsFor(header as never, items);

    const quote = await prisma.quotation.create({
      data: {
        ...(clean(header as Record<string, unknown>) as any),
        number: await nextQuotationNumber(),
        groupId: secureToken(8),
        version: 1,
        status: "DRAFT",
        publicToken: secureToken(20),
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        totalNet: totals.totalNet,
        vatAmount: totals.vatAmount,
        totalGross: totals.totalGross,
        internalCost: totals.internalCost,
        internalMarginPct: totals.marginPct,
        createdById: c.user.id,
        items: {
          create: rawItems.map((it, i) => ({
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
      include: { items: true, contact: true },
    });
    await audit(c.user.id, "CREATE", "quotation", quote.id, null, quote, clientMeta(rq));
    return ok(sanitizeQuotationForRole(quote, c.user.role), 201);
  }, { capability: "quotes.edit" })(req);
}
