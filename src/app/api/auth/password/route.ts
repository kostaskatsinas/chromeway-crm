import { NextRequest } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { getSession, hashPassword, verifyPassword } from "@/lib/auth";
import { handler, ok, parseBody, ApiError } from "@/lib/api";
import { secureToken } from "@/lib/utils";

/** POST — request password reset (stores hashed token; dev returns link) */
export const POST = handler(async (req: NextRequest) => {
  const body = await parseBody(req, z.object({ email: z.string().email() }));
  const user = await prisma.user.findFirst({ where: { email: body.email.toLowerCase(), deletedAt: null } });
  // Do not reveal whether the account exists
  if (!user) {
    return ok({ sent: true, devLink: null });
  }
  const raw = secureToken(32);
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(raw).digest("hex"),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60),
    },
  });
  const base = process.env.APP_URL ?? req.nextUrl.origin;
  const link = `${base}/reset-password?token=${raw}`;
  // Production hook: send `link` via SMTP provider here.
  console.log(`[password-reset] link for ${user.email}: ${link}`);
  return ok({ sent: true, devLink: process.env.NODE_ENV === "production" ? null : link });
}, { public: true });

/** PUT — perform reset with token */
export const PUT = handler(async (req: NextRequest) => {
  const body = await parseBody(req, z.object({ token: z.string().min(10), password: z.string().min(8) }));
  const hash = createHash("sha256").update(body.token).digest("hex");
  const rec = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hash } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) throw new ApiError(400, "TOKEN_INVALID");
  await prisma.user.update({ where: { id: rec.userId }, data: { passwordHash: await hashPassword(body.password) } });
  await prisma.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
  return ok({ changed: true });
}, { public: true });

/** PATCH — change own password (authenticated) */
export const PATCH = handler(async (req) => {
  const session = await getSession();
  if (!session) throw new ApiError(401, "UNAUTHENTICATED");
  const body = await parseBody(req, z.object({ current: z.string(), next: z.string().min(8) }));
  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id } });
  if (!(await verifyPassword(body.current, user.passwordHash))) throw new ApiError(400, "WRONG_PASSWORD");
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(body.next) } });
  return ok({ changed: true });
});
