import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import type { Prisma } from "@prisma/client";

 

/** Converts an accepted quotation into a project (automation core, reused by cron/tests). */
type DbClient = Prisma.TransactionClient | typeof prisma;

export async function createProjectFromQuotation(quotationId: string, userId?: string, db: DbClient = prisma) {
  const quote = await db.quotation.findFirst({ where: { id: quotationId, deletedAt: null }, include: { items: true } });
  if (!quote) throw new ApiError(404, "QUOTATION_NOT_FOUND");
  const existing = await db.project.findFirst({ where: { quotationId }, select: { id: true } });
  if (existing) return existing;

  const year = new Date().getFullYear();
  const count = await db.project.count({ where: { createdAt: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } } });
  const code = `CW-P-${year}-${String(count + 1).padStart(3, "0")}`;
  const estimatedHours = Math.round(quote.items.reduce((sum, it) => sum + Number(it.quantity) * Number(it.hoursPerUnit), 0));

  const qcDefaults = [
    { item: "Έλεγχος προετοιμασίας επιφανειών", done: false },
    { item: "Έλεγχος εφαρμογής ανά στρώση", done: false },
    { item: "Τελικός έλεγχος φωτισμού & οπτικής εντύπωσης", done: false },
    { item: "Καθαρισμός & παράδοση χώρου", done: false },
    { item: "Φωτογράφιση έργου για portfolio", done: false },
  ];

  return db.project.create({
    data: {
      code,
      name: quote.projectName,
      quotationId: quote.id,
      opportunityId: quote.opportunityId,
      contactId: quote.contactId,
      companyId: quote.companyId,
      managerUserId: quote.createdById ?? userId ?? null,
      status: "PLANNING",
      contractValue: quote.totalGross,
      estimatedCost: quote.internalCost,
      estimatedHours,
      address: quote.projectAddress,
      city: quote.city,
      region: quote.region,
      scopeDescription: quote.items.map((i) => i.description).join(" · "),
      qcChecklist: qcDefaults as never,
      notes: quote.notesEl,
    },
  });
}
