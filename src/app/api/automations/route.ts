import { prisma } from "@/lib/db";
import { handler, ok, parseBody } from "@/lib/api";
import { z } from "zod";

/** GET /api/automations — list automation settings with defaults */
export const GET = handler(async () => {
  const rows = await prisma.automationSetting.findMany();
  const keys = ["followUpOnLead", "unansweredLeads", "visitReminders", "staleQuotes", "createProjectOnAccept", "paymentReminders", "projectOverrunAlerts", "feedbackAfterCompletion"];
  const items = keys.map((key) => {
    const row = rows.find((r) => r.key === key);
    return { key, enabled: row?.enabled ?? true, lastRunAt: row?.lastRunAt ?? null };
  });
  return ok(items);
}, { capability: "settings.system" });

const schema = z.object({ key: z.string().min(1), enabled: z.boolean(), config: z.record(z.unknown()).optional() });

/** PATCH /api/automations — toggle or configure */
export const PATCH = handler(async (req) => {
  const body = await parseBody(req, schema);
  const existing = await prisma.automationSetting.findUnique({ where: { key: body.key } });
  if (existing) {
    await prisma.automationSetting.update({
      where: { key: body.key },
      data: { enabled: body.enabled, ...(body.config ? { config: body.config as never } : {}) },
    });
  } else {
    await prisma.automationSetting.create({
      data: { key: body.key, enabled: body.enabled, config: (body.config ?? {}) as never },
    });
  }
  return ok({ saved: true });
}, { capability: "settings.system" });
