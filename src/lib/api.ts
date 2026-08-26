import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { getSession, type SessionUser } from "./auth";
import { can, type Capability } from "./rbac";
import { prisma } from "./db";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function ok(data: unknown, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

type WrappedHandler = {
  (req: NextRequest): Promise<Response>;
  (req: NextRequest, ctx: { params: Promise<Record<string, string>> }): Promise<Response>;
};

/** Wraps a route handler with auth + capability check + error handling. */
export function handler(
  fn: (req: NextRequest, ctx: { user: SessionUser; params: Record<string, string> }) => Promise<Response>,
  opts?: { capability?: Capability; public?: boolean }
): WrappedHandler {
  const wrapped = async (req: NextRequest, routeCtx?: { params: Promise<Record<string, string>> }) => {
    try {
      const user = await getSession();
      if (!user && !opts?.public) return fail("UNAUTHENTICATED", 401);
      if (opts?.capability && (!user || !can(user.role, opts.capability))) return fail("FORBIDDEN", 403);
      const params = routeCtx?.params ? await routeCtx.params : {};
      return await fn(req, { user: user as SessionUser, params });
    } catch (err) {
      if (err instanceof ApiError) return fail(err.message, err.status);
      if (err instanceof ZodError) {
        const first = err.errors[0];
        return fail(`${first.path.join(".")}: ${first.message}`, 422);
      }
      console.error("[api]", err);
      return fail("SERVER_ERROR", 500);
    }
  };
  return wrapped as WrappedHandler;
}

export async function parseBody<T>(req: NextRequest, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON");
  }
  return schema.parse(raw);
}

export function clientMeta(req: NextRequest) {
  return {
    ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: req.headers.get("user-agent"),
  };
}

/** Audit log writer — never throws. */
export async function audit(
  userId: string | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  before?: unknown,
  after?: unknown,
  meta?: { ip?: string | null; userAgent?: string | null }
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId ?? undefined,
        action,
        entityType,
        entityId: entityId ?? null,
        summary: `${action} ${entityType}${entityId ? `:${entityId}` : ""}`,
        beforeData: before === undefined ? undefined : (JSON.parse(JSON.stringify(before)) as object),
        afterData: after === undefined ? undefined : (JSON.parse(JSON.stringify(after)) as object),
        ip: meta?.ip ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });
  } catch (e) {
    console.error("[audit]", e);
  }
}
