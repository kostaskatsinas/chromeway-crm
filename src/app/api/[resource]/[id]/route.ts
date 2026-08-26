import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, ApiError, audit, clientMeta } from "@/lib/api";
import { cfg, requireCap, sanitizeResourceRow } from "@/lib/crud";
import { recalcInvoiceStatus } from "@/lib/invoices";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Ctx = { user: { id: string; role: string }; params: Record<string, string> };

// ─── GET one ──────────────────────────────────────────
export async function GET(req: NextRequest, ctx: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await ctx.params;
  return handler(async (_rq: NextRequest, c: Ctx) => {
    const config = cfg(resource);
    requireCap(c.user, config.capView);
    const delegate = (prisma as any)[config.model];
    const row = await delegate.findFirst({
      where: { id, ...(config.softDelete ? { deletedAt: null } : {}) },
      ...(config.includeDetail ? { include: config.includeDetail } : {}),
    });
    if (!row) throw new ApiError(404, "NOT_FOUND");
    return ok(sanitizeResourceRow(resource, row, c.user.role));
  })(req);
}

// ─── PATCH one ────────────────────────────────────────
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await ctx.params;
  return handler(async (rq: NextRequest, c: Ctx) => {
    const config = cfg(resource);
    requireCap(c.user, config.capEdit);
    const body = (await parseBody(rq, config.updateSchema as never)) as Record<string, unknown>;

    if (resource === "contacts" && body.gdprConsent) body.gdprConsentAt = new Date();
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) data[k] = v === "" ? null : v;

    const delegate = (prisma as any)[config.model];
    const before = await delegate.findUnique({ where: { id } });
    if (!before || before.deletedAt) throw new ApiError(404, "NOT_FOUND");
    const updated = await delegate.update({
      where: { id },
      data,
      ...(config.includeDetail ? { include: config.includeDetail } : {}),
    });

    // Opportunity stage transitions → closedAt bookkeeping + activity log
    const stage = data.stage as string | undefined;
    if (resource === "opportunities" && stage && stage !== before.stage) {
      if (["WON", "LOST"].includes(stage) && !before.closedAt) {
        await prisma.opportunity.update({ where: { id }, data: { closedAt: new Date() } });
      }
      if (!["WON", "LOST"].includes(stage) && before.closedAt) {
        await prisma.opportunity.update({ where: { id }, data: { closedAt: null } });
      }
      await prisma.activity.create({
        data: { kind: "SYSTEM", subject: `Στάδιο: ${before.stage} → ${stage}`, opportunityId: id, userId: c.user.id },
      });
    }

    // Task completion timestamp
    if (resource === "tasks") {
      const tstatus = data.status as string | undefined;
      if (tstatus === "DONE" && !before.completedAt)
        await prisma.projectTask.update({ where: { id }, data: { completedAt: new Date() } });
      if (tstatus !== "DONE" && before.completedAt)
        await prisma.projectTask.update({ where: { id }, data: { completedAt: null } });
    }

    // Invoice status recompute after payment edits
    if (resource === "payments") {
      await recalcInvoiceStatus(before.invoiceId);
      if (data.invoiceId && data.invoiceId !== before.invoiceId) await recalcInvoiceStatus(data.invoiceId as string);
    }

    await audit(c.user.id, "UPDATE", resource, id, before, updated, clientMeta(rq));
    return ok(updated);
  })(req);
}

// ─── DELETE (soft unless disabled) ────────────────────
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ resource: string; id: string }> }) {
  const { resource, id } = await ctx.params;
  return handler(async (rq: NextRequest, c: Ctx) => {
    const config = cfg(resource);
    requireCap(c.user, config.capDelete ?? config.capEdit);
    const delegate = (prisma as any)[config.model];

    const before = await delegate.findUnique({ where: { id } });
    if (!before) throw new ApiError(404, "NOT_FOUND");

    if (config.softDelete) {
      await delegate.update({ where: { id }, data: { deletedAt: new Date() } });
    } else {
      await delegate.delete({ where: { id } });
    }
    if (resource === "payments") await recalcInvoiceStatus(before.invoiceId);

    await audit(c.user.id, config.softDelete ? "SOFT_DELETE" : "DELETE", resource, id, before, null, clientMeta(rq));
    return ok({ deleted: true });
  })(req);
}
