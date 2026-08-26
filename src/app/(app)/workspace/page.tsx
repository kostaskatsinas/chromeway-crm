import { prisma } from "@/lib/db";
import { can } from "@/lib/rbac";
import { requirePageCapability } from "@/lib/page-auth";
import { FocusWorkspace, type FocusItem } from "@/components/modules/FocusWorkspace";

export const dynamic = "force-dynamic";

const OPEN_OPPORTUNITY_STAGES = ["NEW_LEAD", "CONTACTED", "QUALIFIED", "SITE_VISIT_PLANNED", "SAMPLE_REQUESTED", "QUOTATION_PREPARATION", "QUOTATION_SENT", "NEGOTIATION", "ON_HOLD"] as const;

function urgency(dueAt?: Date | null, fallback: FocusItem["urgency"] = "normal"): FocusItem["urgency"] {
  if (!dueAt) return fallback;
  const hours = (dueAt.getTime() - Date.now()) / 3600000;
  if (hours < 0) return "critical";
  if (hours <= 24) return "high";
  if (hours <= 72) return "medium";
  return "normal";
}

export default async function WorkspacePage() {
  const user = await requirePageCapability("dashboard.view");
  const now = new Date();
  const horizon = new Date(now.getTime() + 14 * 86400000);

  const [tasks, opportunities, visits, quotations, projects, invoices] = await Promise.all([
    can(user.role, "tasks.view") ? prisma.projectTask.findMany({
      where: { deletedAt: null, assigneeUserId: user.id, status: { in: ["TODO", "IN_PROGRESS_TASK"] } },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
      take: 40,
      include: { project: { select: { id: true, code: true, name: true } } },
    }) : Promise.resolve([]),
    can(user.role, "pipeline.view") ? prisma.opportunity.findMany({
      where: {
        deletedAt: null,
        assignedUserId: user.id,
        stage: { in: [...OPEN_OPPORTUNITY_STAGES] },
        OR: [{ nextActionDate: { lte: horizon } }, { nextActionDate: null }],
      },
      orderBy: [{ nextActionDate: "asc" }, { updatedAt: "asc" }],
      take: 30,
      include: { contact: { select: { firstName: true, lastName: true } } },
    }) : Promise.resolve([]),
    can(user.role, "visits.view") ? prisma.siteVisit.findMany({
      where: { deletedAt: null, assignedUserId: user.id, status: "SCHEDULED", scheduledAt: { lte: horizon } },
      orderBy: { scheduledAt: "asc" },
      take: 20,
      include: { contact: { select: { firstName: true, lastName: true } } },
    }) : Promise.resolve([]),
    can(user.role, "quotes.view") ? prisma.quotation.findMany({
      where: { deletedAt: null, createdById: user.id, status: { in: ["SENT", "VIEWED"] } },
      orderBy: [{ validUntil: "asc" }, { sentAt: "asc" }],
      take: 20,
      include: { contact: { select: { firstName: true, lastName: true } } },
    }) : Promise.resolve([]),
    can(user.role, "projects.view") ? prisma.project.findMany({
      where: { deletedAt: null, managerUserId: user.id, status: { in: ["PLANNING", "SCHEDULED", "IN_PROGRESS", "ON_HOLD_PROJECT", "QUALITY_CONTROL"] } },
      orderBy: { plannedEndDate: "asc" },
      take: 20,
      include: { contact: { select: { firstName: true, lastName: true } } },
    }) : Promise.resolve([]),
    can(user.role, "finance.view") ? prisma.invoice.findMany({
      where: { deletedAt: null, status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] }, OR: [{ dueDate: { lte: horizon } }, { status: "OVERDUE" }] },
      orderBy: { dueDate: "asc" },
      take: 25,
      include: { contact: { select: { firstName: true, lastName: true } } },
    }) : Promise.resolve([]),
  ]);

  const items: FocusItem[] = [
    ...tasks.map((task) => ({
      id: task.id,
      kind: "task" as const,
      title: task.title,
      context: task.project ? `${task.project.code} · ${task.project.name}` : "Ανεξάρτητη εργασία",
      dueAt: task.dueDate?.toISOString() ?? null,
      urgency: urgency(task.dueDate, task.priority === "URGENT" ? "high" : task.priority === "HIGH" ? "medium" : "normal"),
      href: task.project ? `/projects/${task.project.id}?tab=tasks` : "/tasks?mine=1",
      status: task.status,
      completable: can(user.role, "tasks.edit"),
    })),
    ...opportunities.map((opportunity) => ({
      id: opportunity.id,
      kind: "opportunity" as const,
      title: opportunity.nextAction || `Ορισμός επόμενης ενέργειας: ${opportunity.title}`,
      context: `${opportunity.title} · ${opportunity.contact.firstName} ${opportunity.contact.lastName}`,
      dueAt: opportunity.nextActionDate?.toISOString() ?? null,
      urgency: urgency(opportunity.nextActionDate, opportunity.nextAction ? "medium" : "high"),
      href: `/pipeline?open=${opportunity.id}`,
      status: opportunity.stage,
    })),
    ...visits.map((visit) => ({
      id: visit.id,
      kind: "visit" as const,
      title: visit.title,
      context: `${visit.contact.firstName} ${visit.contact.lastName}${visit.city ? ` · ${visit.city}` : ""}`,
      dueAt: visit.scheduledAt.toISOString(),
      urgency: urgency(visit.scheduledAt),
      href: `/visits/${visit.id}`,
      status: visit.status,
    })),
    ...quotations.map((quotation) => {
      const dueAt = quotation.validUntil ?? (quotation.sentAt ? new Date(quotation.sentAt.getTime() + 5 * 86400000) : null);
      return {
        id: quotation.id,
        kind: "quotation" as const,
        title: `Follow-up προσφοράς ${quotation.number}`,
        context: `${quotation.projectName} · ${quotation.contact.firstName} ${quotation.contact.lastName}`,
        dueAt: dueAt?.toISOString() ?? null,
        urgency: urgency(dueAt, "medium"),
        href: `/quotes/${quotation.id}`,
        status: quotation.status,
      };
    }),
    ...projects.map((project) => ({
      id: project.id,
      kind: "project" as const,
      title: project.name,
      context: `${project.code} · ${project.progressPct}% · ${project.contact.firstName} ${project.contact.lastName}`,
      dueAt: project.plannedEndDate?.toISOString() ?? null,
      urgency: urgency(project.plannedEndDate, project.status === "ON_HOLD_PROJECT" ? "medium" : "normal"),
      href: `/projects/${project.id}`,
      status: project.status,
    })),
    ...invoices.map((invoice) => ({
      id: invoice.id,
      kind: "invoice" as const,
      title: `Είσπραξη ${invoice.number}`,
      context: `${invoice.contact.firstName} ${invoice.contact.lastName} · υπόλοιπο ${(invoice.total.toNumber() - invoice.paidTotal.toNumber()).toLocaleString("el-GR")} €`,
      dueAt: invoice.dueDate?.toISOString() ?? null,
      urgency: urgency(invoice.dueDate, invoice.status === "OVERDUE" ? "critical" : "medium"),
      href: `/finance?tab=invoices&open=${invoice.id}`,
      status: invoice.status,
    })),
  ].sort((a, b) => {
    const rank = { critical: 0, high: 1, medium: 2, normal: 3 };
    const urgencyDiff = rank[a.urgency] - rank[b.urgency];
    if (urgencyDiff) return urgencyDiff;
    return (a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER) - (b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER);
  });

  return <FocusWorkspace userName={user.firstName} initialItems={items} nowIso={now.toISOString()} />;
}
