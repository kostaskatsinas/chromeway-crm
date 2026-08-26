import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSessionToken, setSessionCookie, verifyPassword, clearSessionCookie, getSession } from "@/lib/auth";
import { handler, ok, parseBody } from "@/lib/api";

export const POST = handler(async (req) => {
  const body = await parseBody(req, z.object({ email: z.string().email(), password: z.string().min(1) }));
  const user = await prisma.user.findFirst({ where: { email: body.email.toLowerCase(), deletedAt: null, active: true } });
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    return ok({ authenticated: false });
  }
  const token = await createSessionToken({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  });
  await setSessionCookie(token);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return ok({ authenticated: true });
}, { public: true });

export const DELETE = handler(async () => {
  await clearSessionCookie();
  return ok({ signedOut: true });
}, { public: true });

export const GET = handler(async () => {
  const session = await getSession();
  if (!session) return ok({ user: null });
  return ok({ user: session });
}, { public: true });
