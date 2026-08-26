import { prisma } from "@/lib/db";
import type { PipelineStage } from "@prisma/client";
import { weightedValue } from "./calc";

const OPEN_STAGES: PipelineStage[] = ["NEW_LEAD", "CONTACTED", "QUALIFIED", "SITE_VISIT_PLANNED", "SAMPLE_REQUESTED", "QUOTATION_PREPARATION", "QUOTATION_SENT", "NEGOTIATION"];
export async function dashboardStats() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [
    newLeads,
    activeOpps,
    pendingQuotes,
    upcomingVisits,
    activeProjects,
    delayedProjectsRaw,
    openTasks,
    outstandingAgg,
    monthPayments,
    monthExpenses,
    wonThisYear,
    lostThisYear,
    allTimeClosed,
    allTimeWon,
    pipelineOpps,
    projectsForCharts,
  ] = await Promise.all([
    prisma.opportunity.count({ where: { deletedAt: null, stage: "NEW_LEAD" } }),
    prisma.opportunity.count({ where: { deletedAt: null, stage: { in: OPEN_STAGES } } }),
    prisma.quotation.findMany({ where: { deletedAt: null, status: { in: ["SENT", "VIEWED"] } }, select: { totalGross: true, sentAt: true }, orderBy: { sentAt: "asc" } }),
    prisma.siteVisit.count({ where: { deletedAt: null, status: "SCHEDULED", scheduledAt: { gte: now } } }),
    prisma.project.count({ where: { deletedAt: null, status: { in: ["PLANNING", "SCHEDULED", "IN_PROGRESS", "QUALITY_CONTROL"] } } }),
    prisma.project.findMany({
      where: { deletedAt: null, plannedEndDate: { lt: now }, status: { in: ["PLANNING", "SCHEDULED", "IN_PROGRESS"] } },
      select: { id: true, code: true, name: true, plannedEndDate: true },
    }),
    prisma.projectTask.count({ where: { deletedAt: null, status: { in: ["TODO", "IN_PROGRESS_TASK"] } } }),
    prisma.invoice.aggregate({ _sum: { total: true, paidTotal: true }, where: { deletedAt: null, kind: "FINAL", status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { deletedAt: null, paidAt: { gte: monthStart, lt: nextMonth } } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { deletedAt: null, date: { gte: monthStart, lt: nextMonth } } }),
    prisma.opportunity.count({ where: { deletedAt: null, stage: "WON", closedAt: { gte: new Date(now.getFullYear(), 0, 1) } } }),
    prisma.opportunity.count({ where: { deletedAt: null, stage: "LOST", closedAt: { gte: new Date(now.getFullYear(), 0, 1) } } }),
    prisma.opportunity.count({ where: { deletedAt: null, stage: { in: ["WON", "LOST"] } } }),
    prisma.opportunity.count({ where: { deletedAt: null, stage: "WON" } }),
    prisma.opportunity.findMany({ where: { deletedAt: null, stage: { in: OPEN_STAGES } }, select: { estimatedValue: true, probability: true } }),
    prisma.project.findMany({ where: { deletedAt: null }, select: { region: true, status: true, serviceType: { select: { nameEl: true, nameEn: true } }, contractValue: true } }),
  ]);

  const payments = await prisma.payment.findMany({
    where: { deletedAt: null, paidAt: { gte: yearAgo } },
    select: { paidAt: true, amount: true },
  });
  // Revenue by month (last 12)
  const revenueByMonth: { label: string; value: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const value = payments
      .filter((p) => p.paidAt >= d && p.paidAt < dEnd)
      .reduce((s, p) => s + p.amount.toNumber(), 0);
    revenueByMonth.push({ label: `${d.getMonth() + 1}/${String(d.getFullYear()).slice(2)}`, value });
  }

  const byRegion = countBy(projectsForCharts.map((p) => p.region));
  const byStatus = countBy(projectsForCharts.map((p) => p.status));
  const byService = countBy(projectsForCharts.map((p) => p.serviceType?.nameEl ?? p.serviceType?.nameEn ?? "Άλλο"));

  const outstanding = Number(outstandingAgg._sum.total ?? 0) - Number(outstandingAgg._sum.paidTotal ?? 0);
  const monthRevenue = Number(monthPayments._sum.amount ?? 0);
  const monthExpensesVal = Number(monthExpenses._sum.amount ?? 0);

  return {
    kpis: {
      newLeads,
      activeOpps,
      pendingQuotes: pendingQuotes.length,
      oldestPendingQuoteDays: pendingQuotes[0]?.sentAt ? Math.floor((now.getTime() - pendingQuotes[0].sentAt.getTime()) / 86400000) : 0,
      upcomingVisits,
      activeProjects,
      delayedProjects: delayedProjectsRaw.length,
      delayedProjectsList: delayedProjectsRaw,
      openTasks,
      outstandingInvoices: outstanding,
      monthRevenue,
      monthExpenses: monthExpensesVal,
      monthProfit: monthRevenue - monthExpensesVal,
      conversionRate: allTimeClosed > 0 ? Math.round((allTimeWon / allTimeClosed) * 100) : 0,
      yearConversion:
        wonThisYear + lostThisYear > 0 ? Math.round((wonThisYear / (wonThisYear + lostThisYear)) * 100) : 0,
      pipelineValue: pipelineOpps.reduce((s, o) => s + o.estimatedValue.toNumber(), 0),
      weightedPipeline: weightedValue(pipelineOpps.map((o) => ({ estimatedValue: o.estimatedValue.toNumber(), probability: o.probability }))),
    },
    charts: {
      revenueByMonth,
      byRegion,
      byStatus,
      byService,
    },
  };
}

function countBy(arr: string[]): Record<string, number> {
  return arr.reduce<Record<string, number>>((acc, v) => {
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {});
}
