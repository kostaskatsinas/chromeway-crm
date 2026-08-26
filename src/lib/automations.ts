import { prisma } from "@/lib/db";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type AutomationResult = { key: string; triggered: number };

const DEFAULTS: Record<string, { enabled: boolean; config: Record<string, unknown> }> = {
  followUpOnLead: { enabled: true, config: { daysSinceCreation: 2 } },
  unansweredLeads: { enabled: true, config: { daysSinceLastContact: 5 } },
  visitReminders: { enabled: true, config: { hoursBefore: 24 } },
  staleQuotes: { enabled: true, config: { daysAfterSend: 5 } },
  createProjectOnAccept: { enabled: true, config: {} }, // handled inline on accept event
  paymentReminders: { enabled: true, config: { daysBeforeDue: 3 } },
  projectOverrunAlerts: { enabled: true, config: { costTolerancePct: 110, timeTolerancePct: 110 } },
  feedbackAfterCompletion: { enabled: true, config: { daysAfterCompletion: 3 } },
};

async function settingsMap() {
  const rows = await prisma.automationSetting.findMany();
  const map = new Map<string, { enabled: boolean; config: any; lastRunAt?: Date | null }>();
  for (const [key, def] of Object.entries(DEFAULTS)) {
    const row = rows.find((r) => r.key === key);
    map.set(key, {
      enabled: row?.enabled ?? def.enabled,
      config: { ...def.config, ...((row?.config as object) ?? {}) },
      lastRunAt: row?.lastRunAt,
    });
  }
  return map;
}

/** Main entry — runs all due automations. Safe to call frequently. */
export async function runAutomations(force = false): Promise<AutomationResult[]> {
  const results: AutomationResult[] = [];
  const settings = await settingsMap();

  // ── Follow-up task after new lead ────────────────────
  if (settings.get("followUpOnLead")!.enabled) {
    const days = Number(settings.get("followUpOnLead")!.config.daysSinceCreation ?? 2);
    const cutoff = new Date(Date.now() - days * 86400000);
    const leads = await prisma.opportunity.findMany({
      where: {
        deletedAt: null,
        stage: "NEW_LEAD",
        createdAt: { lt: cutoff },
      },
      include: { _count: { select: { activities: true } } },
    });
    let n = 0;
    for (const lead of leads) {
      const existingTask = await prisma.projectTask.findFirst({
        where: {
          deletedAt: null,
          title: { startsWith: "Follow-up:" },
          description: { contains: lead.id },
        },
      });
      if (!existingTask && lead._count.activities === 0) {
        await prisma.projectTask.create({
          data: {
            title: `Follow-up: ${lead.title}`,
            description: `Αυτόματη εργασία παρακολούθησης για το lead #${lead.id}. Επικοινωνήστε με τον πελάτη.`,
            priority: "HIGH",
            assigneeUserId: lead.assignedUserId,
            dueDate: new Date(Date.now() + 86400000),
          },
        });
        n++;
      }
    }
    results.push({ key: "followUpOnLead", triggered: n });
  }

  // ── Unanswered enquiries ─────────────────────────────
  if (settings.get("unansweredLeads")!.enabled) {
    const days = Number(settings.get("unansweredLeads")!.config.daysSinceLastContact ?? 5);
    const cutoff = new Date(Date.now() - days * 86400000);
    const stale = await prisma.opportunity.findMany({
      where: {
        deletedAt: null,
        stage: { in: ["NEW_LEAD", "CONTACTED", "QUALIFIED", "QUOTATION_SENT", "NEGOTIATION"] },
        OR: [{ lastContactedAt: { lt: cutoff } }, { lastContactedAt: null, createdAt: { lt: cutoff } }],
      },
      take: 50,
    });
    let n = 0;
    for (const opp of stale) {
      const dup = await prisma.notification.findFirst({
        where: { entityType: "opportunity", entityId: opp.id, type: "LEAD_UNANSWERED", createdAt: { gte: new Date(Date.now() - 3 * 86400000) } },
      });
      if (!dup && opp.assignedUserId) {
        await prisma.notification.create({
          data: {
            userId: opp.assignedUserId,
            type: "LEAD_UNANSWERED",
            title: `Χωρίς απάντηση >${days} ημέρες: ${opp.title}`,
            body: `Η ευκαιρία «${opp.title}» χρειάζεται επικοινωνία.`,
            link: `/pipeline?open=${opp.id}`,
            entityType: "opportunity",
            entityId: opp.id,
          },
        });
        n++;
      }
    }
    results.push({ key: "unansweredLeads", triggered: n });
  }

  // ── Visit reminders ──────────────────────────────────
  if (settings.get("visitReminders")!.enabled) {
    const hoursBefore = Number(settings.get("visitReminders")!.config.hoursBefore ?? 24);
    const soon = new Date(Date.now() + hoursBefore * 3600000);
    const visits = await prisma.siteVisit.findMany({
      where: { deletedAt: null, status: "SCHEDULED", scheduledAt: { lte: soon, gte: new Date() } },
    });
    let n = 0;
    for (const v of visits) {
      const dup = await prisma.notification.findFirst({
        where: { entityType: "siteVisit", entityId: v.id, type: "VISIT_UPCOMING" },
      });
      if (!dup) {
        const users = [v.assignedUserId].filter(Boolean) as string[];
        for (const uid of users) {
          await prisma.notification.create({
            data: {
              userId: uid,
              type: "VISIT_UPCOMING",
              title: `Επόμενη επίσκεψη: ${v.title}`,
              body: `Προγραμματισμένη για ${new Date(v.scheduledAt).toLocaleString("el-GR")}`,
              link: `/visits/${v.id}`,
              entityType: "siteVisit",
              entityId: v.id,
            },
          });
        }
        n++;
      }
    }
    results.push({ key: "visitReminders", triggered: n });
  }

  // ── Stale quotations ─────────────────────────────────
  if (settings.get("staleQuotes")!.enabled) {
    const days = Number(settings.get("staleQuotes")!.config.daysAfterSend ?? 5);
    const cutoff = new Date(Date.now() - days * 86400000);
    const stale = await prisma.quotation.findMany({
      where: { deletedAt: null, status: { in: ["SENT", "VIEWED"] }, sentAt: { lt: cutoff } },
    });
    let n = 0;
    for (const q of stale) {
      const dup = await prisma.notification.findFirst({
        where: { entityId: q.id, type: "QUOTE_STALE", createdAt: { gte: new Date(Date.now() - 4 * 86400000) } },
      });
      if (!dup && q.createdById) {
        await prisma.notification.create({
          data: {
            userId: q.createdById,
            type: "QUOTE_STALE",
            title: `Προσφορά ${q.number} χωρίς απάντηση`,
            body: `Στάλθηκε πριν από ${days}+ ημέρες. Αξία ${Number(q.totalGross).toFixed(2)} €.`,
            link: `/quotes/${q.id}`,
            entityType: "quotation",
            entityId: q.id,
          },
        });
        n++;
      }
    }
    results.push({ key: "staleQuotes", triggered: n });
  }

  // ── Payment reminders ────────────────────────────────
  if (settings.get("paymentReminders")!.enabled) {
    const daysBefore = Number(settings.get("paymentReminders")!.config.daysBeforeDue ?? 3);
    const now = new Date();
    const dueSoon = new Date(now.getTime() + daysBefore * 86400000);
    const invoices = await prisma.invoice.findMany({
      where: {
        deletedAt: null,
        kind: "FINAL",
        status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] },
        OR: [{ dueDate: { lte: dueSoon } }],
      },
      include: { contact: true },
    });
    let n = 0;
    for (const inv of invoices) {
      const overdue = inv.dueDate && inv.dueDate < now;
      if (!overdue && !(inv.dueDate && inv.dueDate <= dueSoon)) continue;
      const admins = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "ACCOUNTANT"] }, active: true, deletedAt: null }, select: { id: true } });
      for (const a of admins) {
        const dup = await prisma.notification.findFirst({
          where: { userId: a.id, entityType: "invoice", entityId: inv.id, type: overdue ? "PAYMENT_OVERDUE" : "PAYMENT_UPCOMING", createdAt: { gte: new Date(now.getTime() - 5 * 86400000) } },
        });
        if (!dup) {
          await prisma.notification.create({
            data: {
              userId: a.id,
              type: overdue ? ("PAYMENT_OVERDUE" as never) : ("PAYMENT_UPCOMING" as never),
              title: `${overdue ? "Ληξιπρόθεσμο" : "Επερχόμενη"} πληρωμή: ${inv.number}`,
              body: `${inv.contact?.firstName ?? ""} ${inv.contact?.lastName ?? ""} · Υπόλοιπο ${(
                Number(inv.total) - Number(inv.paidTotal)
              ).toFixed(2)} €`,
              link: `/finance?tab=invoices&open=${inv.id}`,
              entityType: "invoice",
              entityId: inv.id,
            },
          });
          n++;
        }
      }
      if (overdue) {
        await prisma.invoice.update({ where: { id: inv.id }, data: { remindersSent: inv.remindersSent + 1, lastReminderAt: now, status: "OVERDUE" } });
      }
    }
    results.push({ key: "paymentReminders", triggered: n });
  }

  // ── Project overrun alerts ───────────────────────────
  if (settings.get("projectOverrunAlerts")!.enabled) {
    const cfgA = settings.get("projectOverrunAlerts")!.config;
    const costTol = Number(cfgA.costTolerancePct ?? 110);
    const projects = await prisma.project.findMany({
      where: { deletedAt: null, status: { in: ["IN_PROGRESS", "PLANNING", "SCHEDULED"] } },
    });
    let n = 0;
    for (const p of projects) {
      const [expensesAgg, worklogAgg] = await Promise.all([
        prisma.expense.aggregate({ _sum: { amount: true }, where: { projectId: p.id, deletedAt: null } }),
        prisma.workLog.aggregate({ _sum: { hours: true }, where: { projectId: p.id } }),
      ]);
      const actualCost = Number(expensesAgg._sum.amount ?? 0);
      const actualHours = Number(worklogAgg._sum.hours ?? 0);
      const overCost = Number(p.estimatedCost) > 0 && actualCost > (Number(p.estimatedCost) * costTol) / 100;
      const overTime =
        Number(p.estimatedHours) > 0 &&
        actualHours > (Number(p.estimatedHours) * costTol) / 100;
      const plannedEndPassed = p.plannedEndDate && p.plannedEndDate < new Date();
      if ((overCost || overTime || plannedEndPassed)) {
        const dup = await prisma.notification.findFirst({
          where: { entityType: "project", entityId: p.id, type: "PROJECT_OVER_COST", createdAt: { gte: new Date(Date.now() - 5 * 86400000) } },
        });
        if (!dup && p.managerUserId) {
          await prisma.notification.create({
            data: {
              userId: p.managerUserId,
              type: "PROJECT_OVER_COST",
              title: `Υπέρβαση έργου ${p.code}`,
              body: overCost
                ? `Κόστος ${actualCost.toFixed(0)} € vs εκτίμηση ${Number(p.estimatedCost).toFixed(0)} €`
                : overTime
                  ? `Ώρες ${actualHours} vs εκτίμηση ${p.estimatedHours}`
                  : `Ξεπεράστηκε η προγραμματισμένη λήξη (${p.plannedEndDate?.toLocaleDateString("el-GR")})`,
              link: `/projects/${p.id}`,
              entityType: "project",
              entityId: p.id,
            },
          });
          n++;
        }
      }
    }
    results.push({ key: "projectOverrunAlerts", triggered: n });
  }

  // ── Feedback after completion ────────────────────────
  if (settings.get("feedbackAfterCompletion")!.enabled) {
    const days = Number(settings.get("feedbackAfterCompletion")!.config.daysAfterCompletion ?? 3);
    const cutoff = new Date(Date.now() - days * 86400000);
    const doneProjects = await prisma.project.findMany({
      where: { deletedAt: null, status: "COMPLETED", actualEndDate: { lt: cutoff }, feedbackRating: null },
    });
    let n = 0;
    for (const p of doneProjects) {
      const existing = await prisma.projectTask.findFirst({
        where: { projectId: p.id, deletedAt: null, title: { startsWith: "Feedback" } },
      });
      if (!existing) {
        await prisma.projectTask.create({
          data: {
            projectId: p.id,
            title: `Feedback: ζητήστε αξιολόγηση πελάτη για ${p.name}`,
            priority: "LOW",
            assigneeUserId: p.managerUserId,
            dueDate: new Date(Date.now() + 2 * 86400000),
          },
        });
        n++;
      }
    }
    results.push({ key: "feedbackAfterCompletion", triggered: n });
  }

  void force;
  // Update lastRun markers
  await prisma.$transaction(
    Object.keys(DEFAULTS).map((key) =>
      prisma.automationSetting.upsert({
        where: { key },
        update: { lastRunAt: new Date(), ...(settings.get(key)!.enabled ? {} : {}) },
        create: { key, enabled: DEFAULTS[key].enabled, config: DEFAULTS[key].config as never, lastRunAt: new Date() },
      })
    )
  );

  return results;
}

export { DEFAULTS as AUTOMATION_DEFAULTS };
