import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handler, ok, ApiError } from "@/lib/api";
import { can } from "@/lib/rbac";

type Hit = { type: string; id: string; title: string; sub?: string; href: string };

/** GET /api/search?q= — global search across core entities */
export async function GET(req: NextRequest) {
  return handler(async (_rq, c) => {
    const q = new URL(req.url).searchParams.get("q")?.trim();
    if (!q || q.length < 2) throw new ApiError(400, "QUERY_TOO_SHORT");
    const like = { contains: q, mode: "insensitive" as const };
    const hits: Hit[] = [];

    const [contacts, companies, opps, quotes, projects, visits] = await Promise.all([
      prisma.contact.findMany({
        where: { deletedAt: null, OR: [{ firstName: like }, { lastName: like }, { email: like }, { phone: like }] },
        take: 5,
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
      prisma.company.findMany({
        where: { deletedAt: null, OR: [{ name: like }, { vatNumber: like }] },
        take: 5,
        select: { id: true, name: true, city: true },
      }),
      prisma.opportunity.findMany({
        where: { deletedAt: null, OR: [{ title: like }, { projectName: like }] },
        take: 5,
        select: { id: true, title: true, projectName: true },
      }),
      prisma.quotation.findMany({
        where: { deletedAt: null, OR: [{ number: like }, { projectName: like }] },
        take: 5,
        select: { id: true, number: true, projectName: true },
      }),
      prisma.project.findMany({
        where: { deletedAt: null, OR: [{ code: like }, { name: like }, { city: like }] },
        take: 5,
        select: { id: true, code: true, name: true, status: true },
      }),
      prisma.siteVisit.findMany({
        where: { deletedAt: null, OR: [{ title: like }, { address: like }, { city: like }] },
        take: 4,
        select: { id: true, title: true, scheduledAt: true },
      }),
    ]);

    // Respect module permissions — e.g. collaborators have no contacts.view
    if (can(c.user.role as never, "contacts.view"))
      for (const r of contacts) hits.push({ type: "contact", id: r.id, title: `${r.firstName} ${r.lastName}`, sub: r.email ?? undefined, href: `/contacts/${r.id}` });
    if (can(c.user.role as never, "companies.view"))
      for (const r of companies) hits.push({ type: "company", id: r.id, title: r.name, sub: r.city ?? undefined, href: `/companies/${r.id}` });
    if (can(c.user.role as never, "pipeline.view"))
      for (const r of opps) hits.push({ type: "opportunity", id: r.id, title: r.title, sub: r.projectName ?? undefined, href: `/pipeline?open=${r.id}` });
    if (can(c.user.role as never, "quotes.view"))
      for (const r of quotes) hits.push({ type: "quotation", id: r.id, title: r.number, sub: r.projectName ?? undefined, href: `/quotes/${r.id}` });
    if (can(c.user.role as never, "projects.view"))
      for (const r of projects) hits.push({ type: "project", id: r.id, title: `${r.code} · ${r.name}`, sub: r.status, href: `/projects/${r.id}` });
    if (can(c.user.role as never, "visits.view"))
      for (const r of visits)
        hits.push({ type: "visit", id: r.id, title: r.title, sub: r.scheduledAt ? new Date(r.scheduledAt).toLocaleDateString("el-GR") : undefined, href: `/visits/${r.id}` });

    void c;
    return ok({ hits });
  })(req);
}
