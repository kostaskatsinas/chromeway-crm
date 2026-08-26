import { prisma } from "@/lib/db";
import { handler, ok, ApiError } from "@/lib/api";
import { can } from "@/lib/rbac";

/** GET /api/projects/{id}/finance — role-gated profitability snapshot */
export const GET = handler(async (_req, c) => {
  if (!can(c.user.role, "projects.financials")) throw new ApiError(403, "FORBIDDEN");
  const projectId = c.params.id;

  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) throw new ApiError(404, "NOT_FOUND");

  const [expenses, changeOrders, worklogs, invoices] = await Promise.all([
    prisma.expense.findMany({ where: { projectId, deletedAt: null }, select: { amount: true, category: true } }),
    prisma.changeOrder.aggregate({ _sum: { amount: true }, where: { projectId, approved: true } }),
    prisma.workLog.aggregate({ _sum: { hours: true }, where: { projectId } }),
    prisma.invoice.findMany({ where: { projectId, deletedAt: null }, select: { id: true, number: true, status: true, total: true, kind: true, paidTotal: true }, orderBy: { issueDate: "asc" } }),
  ]);

  const expensesByCat = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount.toNumber();
    return acc;
  }, {});
  const expensesTotal = expenses.reduce((s, e) => s + e.amount.toNumber(), 0);

  // Labour cost: hours × team members' hourly rates
  const worklogRows = await prisma.workLog.findMany({ where: { projectId }, select: { hours: true, userId: true } });
  const users = await prisma.user.findMany({ where: { id: { in: Array.from(new Set(worklogRows.map((w) => w.userId))) } }, select: { id: true, hourlyRate: true } });
  const labourCost = worklogRows.reduce((s, w) => {
    const rate = Number(users.find((u) => u.id === w.userId)?.hourlyRate ?? 15);
    return s + w.hours * rate;
  }, 0);

  const invoiced = invoices.filter((i) => i.kind === "FINAL").reduce((s, i) => s + i.total.toNumber(), 0);
  const paid = invoices.reduce((s, i) => s + i.paidTotal.toNumber(), 0);

  return ok({
    expensesTotal,
    expensesByCat,
    changeOrdersApproved: Number(changeOrders._sum.amount ?? 0),
    worklogHours: worklogs._sum.hours ?? 0,
    labourCost: Math.round(labourCost),
    invoiced,
    paid,
    invoices: invoices.map((i) => ({ id: i.id, number: i.number, status: i.status, kind: i.kind, total: i.total })),
  });
});
