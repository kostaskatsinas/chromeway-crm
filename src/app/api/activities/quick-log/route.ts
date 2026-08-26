import { z } from "zod";
import { prisma } from "@/lib/db";
import { handler, ok, parseBody, audit, clientMeta } from "@/lib/api";
import { activityCreate } from "@/lib/schemas";

const quickLogSchema = activityCreate.extend({
  followUp: z.object({
    title: z.string().trim().min(1),
    dueDate: z.string().min(1),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  }).nullish(),
});

export const POST = handler(async (req, ctx) => {
  const body = await parseBody(req, quickLogSchema);
  const { followUp, ...activityInput } = body;

  const result = await prisma.$transaction(async (tx) => {
    const activity = await tx.activity.create({
      data: {
        ...activityInput,
        occurredAt: activityInput.occurredAt ? new Date(activityInput.occurredAt) : new Date(),
        userId: ctx.user.id,
      },
    });
    const task = followUp ? await tx.projectTask.create({
      data: {
        title: followUp.title,
        dueDate: new Date(`${followUp.dueDate}T12:00:00`),
        priority: followUp.priority,
        status: "TODO",
        assigneeUserId: ctx.user.id,
      },
    }) : null;
    return { activity, task };
  });

  const meta = clientMeta(req);
  await audit(ctx.user.id, "CREATE", "activities", result.activity.id, null, result.activity, meta);
  if (result.task) await audit(ctx.user.id, "CREATE", "tasks", result.task.id, null, result.task, meta);
  return ok(result, 201);
}, { capability: "tasks.edit" });
