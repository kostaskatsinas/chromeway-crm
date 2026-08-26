import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, audit, clientMeta } from "@/lib/api";
import { cfg, requireCap, listResource } from "@/lib/crud";
import { recalcInvoiceStatus } from "@/lib/invoices";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Ctx = { user: { id: string; role: string }; params: Record<string, string> };

function cleanBody<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = v === "" ? null : v;
  }
  return out as T;
}

// ─── GET /api/{resource} ──────────────────────────────
export async function GET(req: NextRequest, ctx: { params: Promise<{ resource: string }> }) {
  const { resource } = await ctx.params;
  return handler(async (rq: NextRequest, c: Ctx) => {
    const config = cfg(resource);
    requireCap(c.user, config.capView);
    return listResource(rq, resource, c.user.role);
  })(req);
}

// ─── POST /api/{resource} ─────────────────────────────
export async function POST(req: NextRequest, ctx: { params: Promise<{ resource: string }> }) {
  const { resource } = await ctx.params;
  return handler(async (rq: NextRequest, c: Ctx) => {
    const config = cfg(resource);
    requireCap(c.user, config.capEdit);
    const body = (await parseBody(rq, config.createSchema as never)) as Record<string, unknown>;

    if (resource === "contacts" && body.gdprConsent) body.gdprConsentAt = new Date();
    if (resource === "activities") body.userId = c.user.id;

    const create = async (db: any) => {
      const delegate = db[config.model];
      const createdRow = await delegate.create({
        data: cleanBody(body),
        ...(config.includeDetail ? { include: config.includeDetail } : {}),
      });
      if (resource === "payments") await recalcInvoiceStatus(body.invoiceId as string | null | undefined, db);
      return createdRow;
    };
    const created = resource === "payments" ? await prisma.$transaction((tx) => create(tx)) : await create(prisma);
    await audit(c.user.id, "CREATE", resource, created.id, null, created, clientMeta(rq));
    return ok(created, 201);
  })(req);
}
