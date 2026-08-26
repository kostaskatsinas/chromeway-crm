import { prisma } from "@/lib/db";
import { handler, ok, parseBody, ApiError, audit } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { userCreate, userUpdate } from "@/lib/schemas";

/** GET — lightweight directory (id/name/color) for pickers; ?full=1 for admin management */
export const GET = handler(async (req, c) => {
  const full = new URL(req.url).searchParams.get("full");
  if (!full || c.user.role !== "ADMIN") {
    const users = await prisma.user.findMany({
      where: { deletedAt: null, active: true },
      select: { id: true, firstName: true, lastName: true, color: true, role: true },
      orderBy: { firstName: "asc" },
    });
    return ok({ items: users });
  }
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true, email: true, firstName: true, lastName: true, phone: true,
      role: true, hourlyRate: true, color: true, active: true, lastLoginAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  return ok({ items: users });
});

/** POST — admin creates team member */
export const POST = handler(async (req, c) => {
  if (c.user.role !== "ADMIN") throw new ApiError(403, "FORBIDDEN");
  const data = (await parseBody(req, userCreate as never)) as { email: string; password: string; firstName: string; lastName: string; phone?: string | null; role: never; hourlyRate?: number; color?: string; active?: boolean };
  const { password, ...rest } = data;
  const user = await prisma.user.create({
    data: { ...rest, role: rest.role as never, email: data.email.toLowerCase(), passwordHash: await hashPassword(password) } as never,
  });
  await audit(c.user.id, "CREATE", "user", user.id, null, { email: user.email, role: user.role });
  return ok({ id: user.id }, 201);
});

/** PATCH /api/users?id= — admin updates member */
export const PATCH = handler(async (req, c) => {
  if (c.user.role !== "ADMIN") throw new ApiError(403, "FORBIDDEN");
  const id = new URL(req.url).searchParams.get("id");
  if (!id) throw new ApiError(400, "MISSING_ID");
  const raw = await parseBody(req, userUpdate as never);
  const data = JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;
  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) throw new ApiError(404, "NOT_FOUND");
  const password = data.password as string | undefined;
  delete data.password;
  delete data.currentPassword;
  if ("hourlyRate" in data && (data.hourlyRate === null || data.hourlyRate === undefined)) delete data.hourlyRate;
  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...data,
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
      ...(data.email ? { email: String(data.email).toLowerCase() } : {}),
    } as never,
  });
  await audit(c.user.id, "UPDATE", "user", id, before, { role: updated.role, active: updated.active });
  return ok({ id: updated.id });
});

/** DELETE /api/users?id= — soft delete */
export const DELETE = handler(async (req, c) => {
  if (c.user.role !== "ADMIN") throw new ApiError(403, "FORBIDDEN");
  const id = new URL(req.url).searchParams.get("id")!;
  if (id === c.user.id) throw new ApiError(400, "CANNOT_DELETE_SELF");
  await prisma.user.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
  await audit(c.user.id, "SOFT_DELETE", "user", id);
  return ok({ deleted: true });
});
