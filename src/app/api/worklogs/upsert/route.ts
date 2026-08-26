import { prisma } from "@/lib/db";
import { handler, ok, parseBody, ApiError } from "@/lib/api";
import { worklogUpsert } from "@/lib/schemas";
import { can } from "@/lib/rbac";

/** PUT /api/worklogs/upsert — one log per user/project/day (daily work log) */
export const PUT = handler(async (req) => {
  return handler(async (rq, c) => {
    const body = await parseBody(rq, worklogUpsert);
    if (!can(c.user.role, "projects.edit") && body.userId !== c.user.id) throw new ApiError(403, "FORBIDDEN");
    const date = new Date(body.date);
    date.setHours(12, 0, 0, 0);

    const log = await prisma.workLog.upsert({
      where: { projectId_userId_date: { projectId: body.projectId, userId: body.userId, date } },
      update: {
        hours: body.hours,
        note: body.note ?? null,
        hasIssue: body.hasIssue,
        issueNote: body.issueNote ?? null,
      },
      create: {
        projectId: body.projectId,
        userId: body.userId,
        date,
        hours: body.hours,
        note: body.note ?? null,
        hasIssue: body.hasIssue,
        issueNote: body.issueNote ?? null,
      },
      include: { user: { select: { firstName: true, lastName: true, color: true } } },
    });
    void c;
    return ok(log);
  })(req);
}, { capability: "tasks.edit" });
