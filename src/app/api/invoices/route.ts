import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, audit } from "@/lib/api";
import { secureToken } from "@/lib/utils";
import { nextInvoiceNumber } from "@/lib/numbering";

 

const itemSchema = z.object({
  description: z.string().trim().min(1),
  unit: z.string().default("PIECE"),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
});

const createSchema = z.object({
  kind: z.enum(["PROFORMA", "FINAL", "CREDIT_NOTE"]).default("FINAL"),
  contactId: z.string().min(1),
  companyId: z.string().nullish(),
  projectId: z.string().nullish(),
  quotationId: z.string().nullish(),
  issueDate: z.date().nullish(),
  dueDate: z.date().nullish(),
  discountAmount: z.number().nonnegative().default(0),
  vatRate: z.number().min(0).max(100).default(24),
  notes: z.string().nullish(),
  items: z.array(itemSchema).min(1),
});

/** GET list */
export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const where: Record<string, unknown> = { deletedAt: null };
  const status = url.searchParams.get("status") ?? "";
  const kind = url.searchParams.get("kind") ?? "";
  const q = url.searchParams.get("q");
  if (status) where.status = status;
  if (kind) where.kind = kind as never;
  if (url.searchParams.get("projectId")) where.projectId = url.searchParams.get("projectId");
  if (q) {
    where.OR = [{ number: { contains: q, mode: "insensitive" as const } }, { notes: { contains: q, mode: "insensitive" as const } }];
  }
  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        contact: { select: { firstName: true, lastName: true } },
        project: { select: { id: true, code: true, name: true } },
        _count: { select: { items: true } },
      },
      take: Math.min(200, parseInt(url.searchParams.get("pageSize") ?? "150")),
    }),
    prisma.invoice.count({ where }),
  ]);
  return ok({ items, total });
}, { capability: "finance.view" });

/** POST — creates invoice with computed totals */
export const POST = handler(async (req) => {
  return handler(async (rq, c) => {
    const body = await parseBody(rq, createSchema);
    const discount = body.discountAmount ?? 0;
    const vatRate = body.vatRate ?? 24;
    const subtotal = body.items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
    const afterDiscount = Math.max(0, subtotal - discount);
    const vatAmount = Math.round(afterDiscount * (vatRate / 100) * 100) / 100;
    const number = await nextInvoiceNumber(body.kind ?? "FINAL");

    const invoice = await prisma.invoice.create({
      data: {
        number,
        kind: body.kind,
        status: "ISSUED",
        contactId: body.contactId,
        companyId: body.companyId ?? null,
        projectId: body.projectId ?? null,
        quotationId: body.quotationId ?? null,
        issueDate: body.issueDate ? new Date(body.issueDate as unknown as string) : new Date(),
        dueDate: body.dueDate ?? new Date(Date.now() + 15 * 86400000),
        subtotal,
        discountAmount: discount,
        vatRate,
        vatAmount,
        total: Math.round((afterDiscount + vatAmount) * 100) / 100,
        notes: body.notes ?? null,
        publicToken: secureToken(16),
        items: {
          create: body.items.map((it, i) => ({
            position: i,
            description: it.description,
            unit: it.unit as never,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
          })),
        },
      },
      include: { items: true },
    });

    // Optional: pre-fill from quotation → mark opportunity
    void c;
    await audit(c.user.id, "CREATE", "invoice", invoice.id, null, invoice);
    return ok(invoice, 201);
  })(req);
}, { capability: "finance.edit" });
