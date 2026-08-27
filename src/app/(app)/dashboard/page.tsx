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

  const [upcomingTasks, recentActivities, todayVisits, focusOpportunities, projectHealth] = await Promise.all([
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
    canViewPipeline ? prisma.opportunity.findMany({
      where: {
        deletedAt: null,
        stage: { notIn: ["WON", "LOST"] },
        OR: [
          { nextActionDate: { lte: new Date(Date.now() + 5 * 86400000) } },
          { nextActionDate: null },
        ],
      },
      orderBy: [{ nextActionDate: "asc" }, { updatedAt: "asc" }],
      take: 7,
      include: {
        contact: { select: { firstName: true, lastName: true } },
        assignedTo: { select: { firstName: true, lastName: true, color: true } },
      },
    }) : Promise.resolve([]),
    canViewProjects ? prisma.project.findMany({
      where: { deletedAt: null, status: { in: ["PLANNING", "SCHEDULED", "IN_PROGRESS", "ON_HOLD_PROJECT", "QUALITY_CONTROL"] } },
      orderBy: [{ plannedEndDate: "asc" }, { updatedAt: "desc" }],
      take: 7,
      include: {
        contact: { select: { firstName: true, lastName: true } },
        manager: { select: { firstName: true, lastName: true, color: true } },
      },
    }) : Promise.resolve([]),
  ]);

  const today = new Date();
  const dueText = (date: Date | null) => {
    if (!date) return "Χωρίς ημερομηνία";
    const diff = Math.ceil((date.getTime() - today.getTime()) / 86400000);
    if (diff < 0) return `${Math.abs(diff)}ημ. καθυστέρηση`;
    if (diff === 0) return "Σήμερα";
    if (diff === 1) return "Αύριο";
    return date.toLocaleDateString("el-GR", { day: "numeric", month: "short" });
  };

  return (
    <div className="space-y-7">
      <DashboardStrings enabled={user.role === "ADMIN"} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Operations command center</p>
          <h1 className="display text-3xl lg:text-4xl mt-1">Καλημέρα, {user.firstName}</h1>
          <p className="text-[13px] text-ink-faint mt-1">{today.toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" })} · οι προτεραιότητες της ημέρας</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEditPipeline && <Link href="/pipeline?new=1" className="btn btn-secondary">+ Lead</Link>}
          {canEditQuotes && <Link href="/quotes/new" className="btn btn-primary">+ Προσφορά</Link>}
        </div>
      </div>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-line-soft flex items-center justify-between">
            <div><p className="eyebrow">Now</p><h2 className="text-base font-semibold mt-1">Σήμερα & επόμενο</h2></div>
            <Link href="/workspace" className="btn btn-secondary btn-sm">Πλήρης ουρά →</Link>
          </div>
          <div className="p-4">
          {canViewTasks && <>
          <p className="text-[10px] uppercase tracking-wider text-ink-faint font-semibold px-1 mb-1">Εργασίες</p>
          {upcomingTasks.length === 0 ? (
            <EmptyState title="Καμία ανοιχτή εργασία" icon="✓" />
          ) : (
            <ul className="space-y-1">
              {upcomingTasks.slice(0, 5).map((t) => {
                const overdue = t.dueDate && t.dueDate < new Date();
                return (
                  <li key={t.id}>
                    <Link href={t.project?.id ? `/projects/${t.project.id}?tab=tasks` : "/tasks"} className="py-2.5 flex items-start gap-3 rounded-xl hover:bg-parchment/70 px-2">
                    <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${overdue ? "bg-rust" : t.status === "IN_PROGRESS_TASK" ? "bg-slateblue" : "bg-line"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium truncate">{t.title}</p>
                      <p className="text-[11px] text-ink-faint">
                        {t.project?.code ? `${t.project.code} · ` : ""}
                        <span className={overdue ? "text-rust font-semibold" : ""}>{dueText(t.dueDate)}</span>
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
          </>}
          {canViewVisits && todayVisits.length > 0 && <div className="mt-4 pt-4 border-t border-line-soft">
            <div className="flex items-center justify-between px-1 mb-1"><p className="text-[10px] uppercase tracking-wider text-ink-faint font-semibold">Επισκέψεις</p><Link href="/calendar" className="text-[11px] text-clay">Ημερολόγιο</Link></div>
            {todayVisits.slice(0, 3).map((visit) => <Link key={visit.id} href={`/visits/${visit.id}`} className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-parchment/70">
              <span className="w-8 h-8 rounded-lg bg-slateblue-soft text-slateblue flex items-center justify-center">⌖</span>
              <span className="min-w-0 flex-1"><span className="block text-[13px] font-medium truncate">{visit.title}</span><span className="block text-[11px] text-ink-faint">{visit.scheduledAt.toLocaleDateString("el-GR", { weekday: "short", day: "numeric", month: "short" })} · {visit.scheduledAt.toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}</span></span>
            </Link>)}
          </div>}
          </div>
        </div>

        {canViewPipeline && <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-line-soft flex items-center justify-between">
            <div><p className="eyebrow">Pipeline attention</p><h2 className="text-base font-semibold mt-1">Χρειάζονται επόμενη κίνηση</h2></div>
            <Link href="/pipeline?mine=1" className="text-xs text-clay font-semibold">Pipeline →</Link>
          </div>
          <ul className="p-3 space-y-1">
            {focusOpportunities.map((opportunity) => {
              const overdue = !!opportunity.nextActionDate && opportunity.nextActionDate < today;
              return <li key={opportunity.id}><Link href={`/pipeline?open=${opportunity.id}`} className="block p-3 rounded-xl hover:bg-parchment/70 border-l-2 border-transparent hover:border-clay">
                <div className="flex items-start justify-between gap-3"><p className="text-[13px] font-semibold leading-snug">{opportunity.title}</p><span className={`text-[10.5px] whitespace-nowrap font-semibold ${overdue || !opportunity.nextActionDate ? "text-rust" : "text-ink-faint"}`}>{dueText(opportunity.nextActionDate)}</span></div>
                <p className="text-[11px] text-ink-faint mt-1">{opportunity.contact.firstName} {opportunity.contact.lastName}</p>
                <div className="flex items-center justify-between mt-2"><span className="text-[11px] text-clay truncate">{opportunity.nextAction || "Ορισμός επόμενης ενέργειας"}</span>{opportunity.assignedTo && <span className="text-[10px] text-ink-faint">{opportunity.assignedTo.firstName}</span>}</div>
              </Link></li>;
            })}
            {focusOpportunities.length === 0 && <EmptyState title="Κανένα lead σε κίνδυνο" icon="✓" />}
          </ul>
        </div>}

        {canViewProjects && <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-line-soft flex items-center justify-between">
            <div><p className="eyebrow">Project health</p><h2 className="text-base font-semibold mt-1">Παράδοση & πρόοδος</h2></div>
            <Link href="/projects" className="text-xs text-clay font-semibold">Έργα →</Link>
          </div>
          <ul className="p-3 space-y-1">
            {projectHealth.map((project) => {
              const delayed = !!project.plannedEndDate && project.plannedEndDate < today;
              return <li key={project.id}><Link href={`/projects/${project.id}`} className="block p-3 rounded-xl hover:bg-parchment/70">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[13px] font-semibold truncate">{project.name}</p><p className="text-[11px] text-ink-faint mt-0.5">{project.code} · {project.contact.firstName} {project.contact.lastName}</p></div><span className={`text-[10.5px] whitespace-nowrap font-semibold ${delayed ? "text-rust" : "text-ink-faint"}`}>{dueText(project.plannedEndDate)}</span></div>
                <div className="flex items-center gap-3 mt-3"><div className="h-1.5 bg-parchment rounded-full overflow-hidden flex-1"><div className={`h-full rounded-full ${delayed ? "bg-rust" : "bg-olive"}`} style={{ width: `${project.progressPct}%` }} /></div><span className="text-[11px] font-semibold w-8 text-right">{project.progressPct}%</span></div>
              </Link></li>;
            })}
            {projectHealth.length === 0 && <EmptyState title="Κανένα ενεργό έργο" icon="▦" />}
          </ul>
        </div>}
      </section>

      <section>
        <div className="flex items-center justify-between mb-3"><div><p className="eyebrow">Business pulse</p><h2 className="text-lg font-semibold mt-1">Η εικόνα με μία ματιά</h2></div><Link href="/reports" className="text-xs text-clay font-semibold">Αναφορές →</Link></div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
          {canViewPipeline && <Link href="/pipeline?stage=NEW_LEAD"><StatCard label="Νέα leads" value={String(stats.kpis.newLeads)} tone="clay" interactive /></Link>}
          {canViewPipeline && <Link href="/pipeline"><StatCard label="Ενεργές ευκαιρίες" value={String(stats.kpis.activeOpps)} interactive /></Link>}
          {canViewQuotes && <Link href="/quotes?status=SENT"><StatCard label="Προσφορές" value={String(stats.kpis.pendingQuotes)} tone="amber" interactive /></Link>}
          {canViewVisits && <Link href="/visits?status=SCHEDULED"><StatCard label="Επισκέψεις" value={String(stats.kpis.upcomingVisits)} interactive /></Link>}
          {canViewProjects && <Link href="/projects?status=IN_PROGRESS"><StatCard label="Ενεργά έργα" value={String(stats.kpis.activeProjects)} tone="olive" interactive /></Link>}
          {canViewProjects && <Link href="/projects?view=delayed"><StatCard label="Εκτός πλάνου" value={String(stats.kpis.delayedProjects)} tone="rust" interactive /></Link>}
          {canViewTasks && <Link href="/tasks"><StatCard label="Εργασίες" value={String(stats.kpis.openTasks)} interactive /></Link>}
          {showMoney && <Link href="/finance?tab=invoices&status=OVERDUE"><StatCard label="Ανεξόφλητα" value={`${Math.round(stats.kpis.outstandingInvoices / 1000)}k €`} tone="rust" interactive /></Link>}
        </div>
      </section>

      <details className="card group overflow-hidden">
        <summary className="list-none cursor-pointer px-5 py-4 flex items-center justify-between"><span><span className="eyebrow">Analytics</span><span className="block text-sm font-semibold mt-1">Οικονομικά, περιοχή και δραστηριότητα</span></span><span className="text-xl text-ink-faint transition-transform group-open:rotate-90">›</span></summary>
        <div className="border-t border-line-soft p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {showMoney && <div className="rounded-xl border border-line-soft p-4"><p className="eyebrow mb-3">Έσοδα ανά μήνα</p><RevenueBar data={stats.charts.revenueByMonth} /></div>}
          {canViewProjects && <div className="rounded-xl border border-line-soft p-4"><p className="eyebrow mb-3">Έργα ανά περιοχή</p><CategoryDonut data={stats.charts.byRegion} /></div>}
          {canViewProjects && <div className="rounded-xl border border-line-soft p-4"><p className="eyebrow mb-3">Έργα ανά κατάσταση</p><CategoryDonut data={stats.charts.byStatus} /></div>}
          {canViewPipeline && <div className="lg:col-span-3 pt-4 border-t border-line-soft"><p className="eyebrow mb-3">Πρόσφατη δραστηριότητα</p><div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2">{recentActivities.slice(0, 8).map((activity) => <div key={activity.id} className="rounded-xl bg-paper p-3"><p className="text-[12px] font-medium line-clamp-2">{activity.subject ?? activity.body?.slice(0, 60)}</p><p className="text-[10.5px] text-ink-faint mt-1">{activity.contact ? `${activity.contact.firstName} ${activity.contact.lastName}` : "Εσωτερική"}</p></div>)}</div></div>}
        </div>
      </details>
    </div>
  );
}
