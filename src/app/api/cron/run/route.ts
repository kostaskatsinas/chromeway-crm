import { NextRequest } from "next/server";
import { runAutomations } from "@/lib/automations";
import { ok, fail } from "@/lib/api";
import { getSession } from "@/lib/auth";

/**
 * GET/POST /api/cron/run?secret=CRON_SECRET
 * Secure automation runner for external schedulers (systemd timer, cron, Vercel cron).
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (session?.role !== "ADMIN") {
    const configured = process.env.CRON_SECRET;
    if (!configured) return fail("CRON_NOT_CONFIGURED", 503);
    const authorization = req.headers.get("authorization");
    const supplied = authorization?.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length)
      : new URL(req.url).searchParams.get("secret");
    if (supplied !== configured) return fail("FORBIDDEN", 403);
  }
  const results = await runAutomations();
  return ok({ ranAt: new Date().toISOString(), results });
}

export const POST = GET;
