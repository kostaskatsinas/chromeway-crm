import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui";
import { ActivityTimeline, Comments } from "@/components/modules/Timeline";
import { FileGallery } from "@/components/modules/FileGallery";
import { requirePageCapability } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

const BIZ_LABELS: Record<string, string> = {
  ARCHITECT: "Αρχιτέκτονας",
  INTERIOR_DESIGNER: "Interior Designer",
  CONTRACTOR: "Κατασκευαστική",
  HOTEL: "Ξενοδοχείο",
  RESTAURANT: "Εστίαση",
  RETAIL_BUSINESS: "Λιανική",
  OFFICE: "Γραφείο",
  PRIVATE_CUSTOMER: "Ιδιώτης",
  OTHER_BUSINESS: "Άλλο",
};

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageCapability("companies.view");
  const { id } = await params;
  const company = await prisma.company.findFirst({
    where: { id, deletedAt: null },
    include: {
      contacts: { where: { deletedAt: null }, orderBy: { lastName: "asc" } },
      projects: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 10 },
      quotations: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 8 },
      opportunities: { where: { deletedAt: null }, take: 8 },
    },
  });
  if (!company) notFound();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">{BIZ_LABELS[company.businessType] ?? company.businessType}{company.city ? ` · ${company.city}` : ""}</p>
          <h1 className="display text-3xl mt-0.5">{company.name}</h1>
          <p className="text-[13px] text-ink-soft mt-1 flex flex-wrap gap-x-3">
            {company.email && <span>✉ {company.email}</span>}
            {company.phone && <span>☎ {company.phone}</span>}
            {company.website && <span>⌂ {company.website}</span>}
            {company.vatNumber && <span>ΑΦΜ {company.vatNumber}{company.taxOffice ? `, ΔΟΥ ${company.taxOffice}` : ""}</span>}
          </p>
        </div>
        <Link href={`/contacts?company=${company.id}`} className="btn btn-secondary">Επαφές ({company.contacts.length})</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Contacts / decision makers */}
        <div className="card p-5">
          <p className="eyebrow mb-3">Στελέχη & λήπτες αποφάσεων</p>
          <ul className="divide-y divide-line-soft">
            {company.contacts.map((c) => (
              <li key={c.id}>
                <Link href={`/contacts/${c.id}`} className="flex items-center justify-between py-2 group">
                  <span>
                    <span className="block text-[13px] font-medium group-hover:text-clay">{c.firstName} {c.lastName}</span>
                    <span className="block text-[11px] text-ink-faint">{[c.position, c.mobile].filter(Boolean).join(" · ")}</span>
                  </span>
                  {c.gdprConsent && <Badge tone="olive">GDPR</Badge>}
                </Link>
              </li>
            ))}
            {company.contacts.length === 0 && <li className="text-xs text-ink-faint py-2">—</li>}
          </ul>
        </div>

        <div className="card p-5">
          <ActivityTimeline filters={{ companyId: id }} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <p className="eyebrow mb-3">Πρόσφατα έργα</p>
          <ul className="divide-y divide-line-soft">
            {company.projects.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="flex items-center justify-between py-2 text-[13px] group">
                  <span className="font-medium group-hover:text-clay">{p.code} · {p.name}</span>
                  <Badge>{p.status}</Badge>
                </Link>
              </li>
            ))}
            {company.projects.length === 0 && <li className="text-xs text-ink-faint py-2">—</li>}
          </ul>
        </div>
        <div className="card p-5 space-y-6">
          <Comments entityType="company" entityId={id} />
          <div className="border-t border-line-soft pt-4">
            <FileGallery entityType="company" entityId={id} />
          </div>
        </div>
      </div>
    </div>
  );
}
