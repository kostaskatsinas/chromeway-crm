import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/api";

/** GET /api/settings — company profile JSON */
export const GET = handler(async () => {
  const s = await prisma.setting.findFirst();
  return ok(s?.data ?? {});
}, { capability: "settings.view" });

/** PUT /api/settings — admin-only save */
export const PUT = handler(async (req: NextRequest, c) => {
  void c;
  const body = await req.json();
  const existing = await prisma.setting.findFirst();
  if (existing) await prisma.setting.update({ where: { id: existing.id }, data: { data: body as never } });
  else await prisma.setting.create({ data: { data: body as never } });
  return ok({ saved: true });
}, { capability: "settings.system" });
