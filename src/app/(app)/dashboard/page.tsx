import Link from "next/link";
import { requirePageCapability } from "@/lib/page-auth";
import { dashboardStats } from "@/lib/stats";
import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { StatCard, Badge, EmptyState } from "@/components/ui";
import { RevenueBar, CategoryDonut } from "@/components/charts";
import { DashboardStrings } from "./strings";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requirePageCapability("dashboard.view");
  const showMoney = can(user.role, "finance.viewAmounts");
  const canViewPipeline = can(user.role, "pipeline.view");
  const canEditPipeline = can(user.role, "pipeline.edit");
  const canViewQuotes = can(user.role, "quotes.view");
  const canEditQuotes = can(user.role, "quotes.edit");
  const canViewVisits = can(user.role, "visits.view");
  const canViewProjects = can(user.role, "projects.view");
  const canViewTasks = can(user.role, "tasks.view");
  const stats = await dashboardStats();

  const [upcomingTasks, recentActivities, todayVisits] = await Promise.all([
    canViewTasks ? prisma.projectTask.findMany({
      where: { deletedAt: null, status: { in: ["TODO", "IN_PROGRESS_TASK"] }, dueDate: { not: null } },
      orderBy: { dueDate: "asc" },
      take: 8,
      include: { assignee: { select: { firstName: true, lastName: true, color: true } }, project: { select: { id: true, code: true } } },
    }) : Promise.resolve([]),
    canViewPipeline ? prisma.activity.findMany({
      orderBy: { occurredAt: "desc" },
      take: 8,
      include: { contact: { select: { firstName: true, lastName: true } }, user: { select: { firstName: true, lastName: true } } },
    }) : Promise.resolve([]),
    canViewVisits ? prisma.siteVisit.findMany({
      where: { deletedAt: null, status: "SCHEDULED", scheduledAt: { gte: new Date(new Date().setHours(0, 0, 0)) , lt: new Date(Date.now() + 7 * 86400000) } },
      orderBy: { scheduledAt: "asc" },
      take: 6,
    }) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <DashboardStrings enabled={user.role === "ADMIN"} />

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Chromeway · Athens</p>
          <h1 className="display text-4xl mt-1">
            {user.firstName}, καλώς ήρθες
          </h1>
        </div>
        <div className="flex gap-2">
          <Link href="/workspace" className="btn btn-secondary">◎ Η εργασία μου</Link>
          {canEditPipeline && <Link href="/pipeline?new=1" className="btn btn-secondary">+ Lead</Link>}
          {canEditQuotes && <Link href="/quotes/new" className="btn btn-primary">+ Προσφορά</Link>}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        {canViewPipeline && <Link href="/pipeline?stage=NEW_LEAD" aria-label="Προβολή νέων leads"><StatCard label="Νέα leads" value={String(stats.kpis.newLeads)} tone="clay" interactive /></Link>}
        {canViewPipeline && <Link href="/pipeline" aria-label="Προβολή ενεργών ευκαιριών"><StatCard label="Ενεργές ευκαιρίες" value={String(stats.kpis.activeOpps)} interactive /></Link>}
        {canViewQuotes && <Link href="/quotes?status=SENT" aria-label="Προβολή εκκρεμών προσφορών"><StatCard label="Εκκρεμείς προσφορές" value={String(stats.kpis.pendingQuotes)} tone="amber" interactive /></Link>}
        {canViewVisits && <Link href="/visits?status=SCHEDULED" aria-label="Προβολή επισκέψεων"><StatCard label="Επισκέψεις 7ήμερο" value={String(stats.kpis.upcomingVisits)} interactive /></Link>}
        {canViewProjects && <Link href="/projects?status=IN_PROGRESS" aria-label="Προβολή ενεργών έργων"><StatCard label="Ενεργά έργα" value={String(stats.kpis.activeProjects)} tone="olive" interactive /></Link>}
        {canViewProjects && <Link href="/projects?view=delayed" aria-label="Προβολή καθυστερημένων έργων"><StatCard label="Εκτός προγράμματος" value={String(stats.kpis.delayedProjects)} tone="rust" interactive /></Link>}
        {canViewTasks && <Link href="/tasks" aria-label="Προβολή ανοιχτών εργασιών"><StatCard label="Ανοιχτές εργασίες" value={String(stats.kpis.openTasks)} interactive /></Link>}
        {showMoney && <Link href="/finance?tab=invoices&status=OVERDUE" aria-label="Προβολή ανεξόφλητων τιμολογίων">
          <StatCard label="Ανεξόφλητα" value={`${Math.round(stats.kpis.outstandingInvoices).toLocaleString("el-GR")} €`} tone="rust" interactive />
        </Link>}
      </div>

      {/* Money row */}
      {showMoney && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <Link href="/finance?tab=payments"><StatCard label="Έσοδα μήνα" value={`${Math.round(stats.kpis.monthRevenue).toLocaleString("el-GR")} €`} tone="olive" interactive /></Link>
          <Link href="/finance?tab=expenses"><StatCard label="Έξοδα μήνα" value={`${Math.round(stats.kpis.monthExpenses).toLocaleString("el-GR")} €`} tone="amber" interactive /></Link>
          <Link href="/reports"><StatCard label="Κέρδος μήνα (εκτ.)" value={`${Math.round(stats.kpis.monthProfit).toLocaleString("el-GR")} €`} tone="clay" interactive /></Link>
          {canViewPipeline && <Link href="/pipeline"><StatCard
            label="Αξία pipeline"
            value={`${Math.round(stats.kpis.pipelineValue / 1000)}k €`}
            sub={`Σταθμισμένη: ${Math.round(stats.kpis.weightedPipeline / 1000)}k €`}
            interactive
          /></Link>}
          {canViewPipeline && <Link href="/reports"><StatCard label="Μετατροπή leads" value={`${stats.kpis.conversionRate}%`} sub={`Έτος: ${stats.kpis.yearConversion}%`} tone="slate" interactive /></Link>}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {showMoney && <div className="card p-5 lg:col-span-1">
          <p className="eyebrow mb-3">Έσοδα ανά μήνα</p>
          <RevenueBar data={stats.charts.revenueByMonth} />
        </div>}
        {canViewProjects && <div className="card p-5">
          <p className="eyebrow mb-3">Έργα ανά περιοχή</p>
          <CategoryDonut data={stats.charts.byRegion} />
        </div>}
        {canViewProjects && <div className="card p-5">
          <p className="eyebrow mb-3">Έργα ανά κατάσταση</p>
          <CategoryDonut data={stats.charts.byStatus} />
        </div>}
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Upcoming tasks */}
        {canViewTasks && <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="eyebrow">Επερχόμενες προθεσμίες</p>
            <Link href="/tasks" className="text-xs text-clay hover:underline">Όλες</Link>
          </div>
          {upcomingTasks.length === 0 ? (
            <EmptyState title="Καμία ανοιχτή εργασία" icon="✓" />
          ) : (
            <ul className="divide-y divide-line-soft">
              {upcomingTasks.map((t) => {
                const overdue = t.dueDate && t.dueDate < new Date();
                return (
                  <li key={t.id}>
                    <Link href={t.project?.id ? `/projects/${t.project.id}?tab=tasks` : "/tasks"} className="py-2.5 flex items-start gap-3 rounded-lg hover:bg-parchment/60 px-1 -mx-1">
                    <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${overdue ? "bg-rust" : t.status === "IN_PROGRESS_TASK" ? "bg-slateblue" : "bg-line"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium truncate">{t.title}</p>
                      <p className="text-[11px] text-ink-faint">
                        {t.project?.code ? `${t.project.code} · ` : ""}
                        {t.dueDate?.toLocaleDateString("el-GR", { day: "numeric", month: "short" })}
                        {t.assignee ? ` · ${t.assignee.firstName}` : ""}
                      </p>
                    </div>
                    {t.milestone && <Badge tone="clay">Ορόσημο</Badge>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>}

        {/* Visits this week */}
        {canViewVisits && <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="eyebrow">Επισκέψεις χώρου (7 ημέρες)</p>
            <Link href="/calendar" className="text-xs text-clay hover:underline">Ημερολόγιο</Link>
          </div>
          {todayVisits.length === 0 ? (
            <EmptyState title="Καμία προγραμματισμένη επίσκεψη" icon="⌖" />
          ) : (
            <ul className="divide-y divide-line-soft">
              {todayVisits.map((v) => (
                <li key={v.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate">{v.title}</p>
                    <p className="text-[11px] text-ink-faint">
                      {v.scheduledAt.toLocaleDateString("el-GR", { weekday: "short", day: "numeric", month: "short" })} ·{" "}
                      {v.scheduledAt.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}
                      {v.city ? ` · ${v.city}` : ""}
                    </p>
                  </div>
                  <Link href={`/visits/${v.id}`} className="btn btn-secondary btn-sm shrink-0">Άνοιγμα</Link>
                </li>
              ))}
            </ul>
          )}
        </div>}

        {/* Recent activity */}
        {canViewPipeline && <div className="card p-5">
          <p className="eyebrow mb-3">Πρόσφατη δραστηριότητα</p>
          {recentActivities.length === 0 ? (
            <EmptyState title="Καμία δραστηριότητα" />
          ) : (
            <ul className="space-y-3">
              {recentActivities.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-parchment flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                    {a.kind === "CALL" ? "☎" : a.kind === "EMAIL" ? "✉" : a.kind === "SYSTEM" ? "⚙" : "•"}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] leading-snug">{a.subject ?? a.body?.slice(0, 60)}</p>
                    <p className="text-[10.5px] text-ink-faint mt-0.5">
                      {a.user ? `${a.user.firstName}: ` : ""}
                      {a.contact ? `${a.contact.firstName} ${a.contact.lastName} · ` : ""}
                      {a.occurredAt.toLocaleDateString("el-GR", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>}
      </div>
    </div>
  );
}
