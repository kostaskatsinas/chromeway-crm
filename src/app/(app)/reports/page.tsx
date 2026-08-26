import { prisma } from "@/lib/db";
import { requirePageCapability } from "@/lib/page-auth";
import { can } from "@/lib/rbac";
import { ReportsClient } from "./client";

export const dynamic = "force-dynamic";

const OPEN_STAGES = ["NEW_LEAD", "CONTACTED", "QUALIFIED", "SITE_VISIT_PLANNED", "SAMPLE_REQUESTED", "QUOTATION_PREPARATION", "QUOTATION_SENT", "NEGOTIATION"];

export default async function ReportsPage() {
  const user = await requirePageCapability("reports.view");
  const canSeeFinancial = can(user.role, "reports.financial");
  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  const [bySource, wonLost, byStage, quotesAgg, projectsAgg, payments, expensesByMonth, teamHours, materialConsumption, outstanding, repeatContacts, revenueByRegionRaw] = await Promise.all([
    prisma.opportunity.groupBy({ by: ["source"], _count: true, where: { deletedAt: null } }),
    prisma.opportunity.groupBy({ by: ["stage"], _count: true, where: { deletedAt: null, stage: { in: ["WON", "LOST"] }, closedAt: { gte: yearStart } } }),
    prisma.opportunity.findMany({ where: { deletedAt: null, stage: { in: OPEN_STAGES as never[] } }, select: { stage: true, estimatedValue: true } }),
    prisma.quotation.aggregate({ _avg: { totalGross: true }, _count: true, where: { deletedAt: null } }),
    prisma.project.aggregate({ _avg: { contractValue: true }, _count: true, where: { deletedAt: null } }),
    prisma.payment.findMany({ where: { deletedAt: null, paidAt: { gte: new Date(Date.now() - 365 * 86400000) } }, select: { paidAt: true, amount: true } }),
    prisma.expense.findMany({ where: { deletedAt: null, date: { gte: new Date(Date.now() - 365 * 86400000) } }, select: { date: true, amount: true, category: true, project: { select: { region: true } } } }),
    prisma.workLog.groupBy({ by: ["userId"], _sum: { hours: true } }),
    prisma.stockMovement.findMany({ where: { type: "CONSUMPTION_OUT" }, select: { quantity: true, material: { select: { code: true, nameEl: true, unit: true } } }, take: 500, orderBy: { createdAt: "desc" } }),
    prisma.invoice.findMany({ where: { deletedAt: null, kind: "FINAL", status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] } }, include: { contact: true }, orderBy: [{ dueDate: "asc" }] }),
    prisma.contact.findMany({
      where: { deletedAt: null },
      select: {
        id: true, firstName: true, lastName: true, leadSource: true,
        _count: { select: { projects: { where: { status: "COMPLETED" } }, opportunities: { where: { source: "REFERRAL" } } } },
      },
      orderBy: { projects: { _count: "desc" as never } },
      take: 8,
    }),
    prisma.project.findMany({ where: { deletedAt: null }, select: { region: true, contractValue: true, contact: { select: { businessType: true } } } }),
  ]);

  // Revenue per month (last 12)
  const now = new Date();
  const revenueByMonth: { label: string; value: number; expenses?: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const rev = payments.filter((p) => p.paidAt >= start && p.paidAt < end).reduce((s, p) => s + p.amount.toNumber(), 0);
    const exp = expensesByMonth.filter((e) => e.date >= start && e.date < end).reduce((s, e) => s + e.amount.toNumber(), 0);
    revenueByMonth.push({ label: `${start.getMonth() + 1}/${String(start.getFullYear()).slice(2)}`, value: rev, expenses: exp });
  }

  const pipelineByStage = OPEN_STAGES.map((stage) => ({
    label: stage,
    value: byStage.filter((o) => o.stage === stage).reduce((s, o) => s + o.estimatedValue.toNumber(), 0),
  })).filter((x) => x.value > 0);

  const wonCount = wonLost.find((w) => w.stage === "WON")?._count ?? 0;
  const lostCount = wonLost.find((w) => w.stage === "LOST")?._count ?? 0;

  const users = await prisma.user.findMany({ where: { id: { in: teamHours.map((t) => t.userId) } }, select: { id: true, firstName: true, lastName: true, color: true } });
  const teamUtil = teamHours.map((th) => ({
    name: `${users.find((u) => u.id === th.userId)?.firstName ?? "?"} ${users.find((u) => u.id === th.userId)?.lastName ?? ""}`,
    hours: Math.round(th._sum.hours ?? 0),
    color: users.find((u) => u.id === th.userId)?.color ?? "#9a5b36",
  }));

  const matConsumption = Object.entries(
    materialConsumption.reduce<Record<string, number>>((acc, m) => {
      const key = `${m.material.code} · ${m.material.nameEl}`;
      acc[key] = (acc[key] ?? 0) + m.quantity;
      return acc;
    }, {})
  )
    .map(([name, qty]) => ({ name, qty: Math.round(qty * 100) / 100 }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 12);

  const outstandingRows = outstanding.map((inv) => ({
    number: inv.number,
    customer: `${inv.contact.firstName} ${inv.contact.lastName}`,
    dueDate: inv.dueDate?.toLocaleDateString("el-GR") ?? "—",
    balance: Number(inv.total) - Number(inv.paidTotal),
    overdue: inv.dueDate ? inv.dueDate < new Date() : false,
  }));

  const revenueByRegion = revenueByRegionRaw.reduce<Record<string, number>>((acc, p) => {
    acc[p.region] = (acc[p.region] ?? 0) + p.contractValue.toNumber();
    return acc;
  }, {});
  const revenueByBizType = revenueByRegionRaw.reduce<Record<string, number>>((acc, p) => {
    acc[p.contact.businessType] = (acc[p.contact.businessType] ?? 0) + p.contractValue.toNumber();
    return acc;
  }, {});

  return (
    <ReportsClient
      canSeeFinancial={canSeeFinancial}
      data={{
        leadsBySource: Object.fromEntries(bySource.map((b) => [b.source, b._count])),
        wonLost: { WON: wonCount, LOST: lostCount },
        avgQuote: Math.round(Number(quotesAgg._avg.totalGross ?? 0)),
        quoteCount: quotesAgg._count,
        avgProject: Math.round(Number(projectsAgg._avg.contractValue ?? 0)),
        projectCount: projectsAgg._count,
        revenueByMonth: canSeeFinancial ? revenueByMonth : [],
        pipelineByStage,
        teamUtil,
        materialConsumption: matConsumption,
        outstandingRows: canSeeFinancial ? outstandingRows : [],
        repeatCustomers: repeatContacts.map((c) => ({ name: `${c.firstName} ${c.lastName}`, projects: c._count.projects })),
        revenueByRegion: canSeeFinancial ? revenueByRegion : {},
        revenueByBizType: canSeeFinancial ? revenueByBizType : {},
        grossProfit: canSeeFinancial ? revenueByMonth.reduce((s, m) => s + m.value, 0) : 0,
        grossExpenses: canSeeFinancial ? revenueByMonth.reduce((s, m) => s + (m.expenses ?? 0), 0) : 0,
      }}
    />
  );
}
