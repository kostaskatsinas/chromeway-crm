import { handler } from "@/lib/api";
import { dashboardStats } from "@/lib/stats";

export const GET = handler(async () => {
  const stats = await dashboardStats();
  return new Response(JSON.stringify({ ok: true, data: stats }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
}, { capability: "dashboard.view" });
