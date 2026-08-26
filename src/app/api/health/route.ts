import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/health — liveness + database connectivity probe.
 * Unauthenticated and cheap (SELECT 1), safe for uptime monitors,
 * load-balancer checks and the Docker healthcheck.
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      data: {
        status: "healthy",
        db: "up",
        latencyMs: Date.now() - startedAt,
        time: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[health]", error);
    return NextResponse.json(
      {
        ok: false,
        data: {
          status: "degraded",
          db: "down",
          latencyMs: Date.now() - startedAt,
          time: new Date().toISOString(),
        },
      },
      { status: 503 }
    );
  }
}
