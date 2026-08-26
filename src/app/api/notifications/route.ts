import { prisma } from "@/lib/db";
import { handler, ok } from "@/lib/api";

/** GET — list my notifications (latest 50) */
export const GET = handler(async (_rq, c) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: c.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return ok({ notifications });
});

/** PATCH — mark all my notifications as read */
export const PATCH = handler(async (_rq, c) => {
  await prisma.notification.updateMany({
    where: { userId: c.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return ok({ done: true });
});
