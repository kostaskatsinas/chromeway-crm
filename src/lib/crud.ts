import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { RESOURCES } from "@/lib/resources";
import { can } from "@/lib/rbac";
import type { Capability } from "@/lib/rbac";
import { stripSensitiveFields } from "@/lib/security";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Config = (typeof RESOURCES)[string];

export function cfg(name: string): Config {
  const c = RESOURCES[name];
  if (!c) throw new ApiError(404, "UNKNOWN_RESOURCE");
  return c;
}

export function requireCap(user: { role: string }, cap?: Capability) {
  if (!cap) return;
  if (!can(user.role as never, cap)) throw new ApiError(403, "FORBIDDEN");
}

/** Removes fields that the current role may not receive over the API. */
export function sanitizeResourceRow(resource: string, row: Record<string, any>, role: string) {
  const config = cfg(resource);
  return stripSensitiveFields(
    row,
    config.sensitiveFields ?? [],
    !config.sensitiveCapability || can(role as never, config.sensitiveCapability),
    resource
  );
}

const SOFT_DELETE_MODELS = new Set([
  "contact", "company", "opportunity", "siteVisit", "finish", "sample",
  "project", "projectTask", "calendarEvent", "supplier", "material", "expense", "payment",
]);

/** Shared list query builder — also used by export & report endpoints. */
export async function listResource(req: NextRequest, resource: string, role: string): Promise<NextResponse> {
  const config = cfg(resource);
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const pageSize = Math.min(500, Math.max(1, parseInt(url.searchParams.get("pageSize") ?? "50")));
  const where: Record<string, unknown> = {};

  if (SOFT_DELETE_MODELS.has(config.model)) where.deletedAt = null;

  if (q) {
    where.OR = config.searchFields.map((f) => ({ [f]: { contains: q, mode: "insensitive" as const } }));
  }
  // Reserved keys must never reach the where-clause: `deletedAt` would
  // overwrite the soft-delete filter and expose removed records.
  const RESERVED_KEYS = new Set(["q", "page", "pageSize", "orderBy", "orderDir", "from", "to", "dateField", "deletedAt", "AND", "OR", "NOT"]);
  for (const [key, value] of url.searchParams.entries()) {
    if (RESERVED_KEYS.has(key)) continue;
    if (value === "") continue;
    const filterType = config.filterFields?.[key];
    if (!filterType) continue;
    if (filterType === "boolean") {
      if (value !== "true" && value !== "false") throw new ApiError(400, `INVALID_FILTER_${key.toUpperCase()}`);
      where[key] = value === "true";
    } else if (filterType === "number") {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) throw new ApiError(400, `INVALID_FILTER_${key.toUpperCase()}`);
      where[key] = parsed;
    } else {
      where[key] = value;
    }
  }
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const dateField = url.searchParams.get("dateField") ?? (config.model === "calendarEvent" ? "start" : null);
  if ((from || to) && dateField) {
    where[dateField] = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
    };
  }

  const orderByRaw = url.searchParams.get("orderBy");
  const orderBy = orderByRaw
    ? ({ [orderByRaw]: (url.searchParams.get("orderDir") as "asc" | "desc") ?? "asc" } as any)
    : ((config.orderBy as any) ?? { createdAt: "desc" });

  const delegate = (prisma as any)[config.model];
  const [items, total] = await Promise.all([
    delegate.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      ...(config.includeDetail ? { include: config.includeDetail } : {}),
    }),
    delegate.count({ where }),
  ]);

  return NextResponse.json({ ok: true, data: { items: items.map((row: Record<string, any>) => sanitizeResourceRow(resource, row, role)), total, page, pageSize } });
}
