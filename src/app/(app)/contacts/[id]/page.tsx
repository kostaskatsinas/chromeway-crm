import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Avatar, Badge, StatCard, StatusBadge } from "@/components/ui";
import { ContactQuickActivity } from "@/components/layout/CommandCenter";
import { ActivityTimeline, Comments } from "@/components/modules/Timeline";
import { FileGallery } from "@/components/modules/FileGallery";
import { requirePageCapability } from "@/lib/page-auth";
import { can } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const money = (n: number) => `${n.toLocaleString("el-GR", { maximumFractionDigits: 0 })} €`;

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePageCapability("contacts.view");
  const canSeeMoney = can(user.role, "finance.viewAmounts");
  const canSeeQuotes = can(user.role, "quotes.view");
  const canLogActivity = can(user.role, "tasks.edit");
  const canCreateOpportunity = can(user.role, "pipeline.edit");
  const canCreateQuote = can(user.role, "quotes.edit");
  const { id } = await params;
  const contact = await prisma.contact.findFirst({
    where: { id, deletedAt: null },
    include: {
      company: true,
      owner: { select: { firstName: true, lastName: true } },
      opportunities: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 10 },
      quotations: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 8 },
      projects: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 8 },
      invoices: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 8 },
      payments: { where: { deletedAt: null }, orderBy: { paidAt: "desc" }, take: 8 },
    },
  });
  if (!contact) notFound();

  const totalPaid = contact.payments.reduce((s, p) => s + p.amount.toNumber(), 0);
  const lifetimeValue = contact.invoices.reduce((s, i) => s + i.total.toNumber(), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="sticky top-14 z-30 -mx-4 lg:-mx-6 px-4 lg:px-6 py-3 bg-paper/95 backdrop-blur border-b border-line-soft flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <Avatar name={`${contact.firstName} ${contact.lastName}`} size={52} color="#9a5b36" />
          <div>
            <p className="eyebrow">{contact.company?.name ?? t_biz(contact.businessType)}</p>
            <h1 className="display text-3xl mt-0.5">
              {contact.firstName} {contact.lastName}
            </h1>
            <p className="text-[13px] text-ink-soft mt-1 flex flex-wrap gap-x-3">
              {contact.email && <a href={`mailto:${contact.email}`} className="hover:text-clay hover:underline">✉ {contact.email}</a>}
              {(contact.mobile || contact.phone) && <a href={`tel:${contact.mobile ?? contact.phone}`} className="hover:text-clay hover:underline">☎ {contact.mobile ?? contact.phone}</a>}
              {contact.position && <span>· {contact.position}</span>}
              {contact.city && <span>· {contact.city}, {t_reg(contact.region)}</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {canLogActivity && <ContactQuickActivity contactId={contact.id} />}
          {canCreateOpportunity && <Link href={`/pipeline?new=1&contact=${contact.id}`} className="btn btn-secondary">+ Ευκαιρία</Link>}
          {canCreateQuote && <Link href={`/quotes/new?contact=${contact.id}`} className="btn btn-primary">+ Προσφορά</Link>}
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge tone={contact.businessType === "PRIVATE_CUSTOMER" ? "neutral" : "slate"}>{t_biz(contact.businessType)}</Badge>
        <Badge>Πηγή: {t_src(contact.leadSource)}</Badge>
        {contact.gdprConsent ? <Badge tone="olive">GDPR ✓</Badge> : <Badge tone="rust">GDPR ✗</Badge>}
        {contact.marketingOptIn && <Badge tone="clay">Marketing</Badge>}
        {contact.tags.map((tag) => (
          <Badge key={tag} tone="amber">{tag}</Badge>
        ))}
        {contact.notes && <span className="text-[12px] text-ink-faint italic self-center">“{contact.notes}”</span>}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Ευκαιρίες" value={String(contact.opportunities.length)} />
        <StatCard label="Προσφορές" value={String(contact.quotations.length)} />
        <StatCard label="Έργα" value={String(contact.projects.length)} tone="olive" />
        <StatCard label="Εισπραχθέντα" value={canSeeMoney ? money(totalPaid) : "•••"} tone="olive" sub={canSeeMoney ? `Τιμολογηθέντα: ${showMoney(lifetimeValue)}` : undefined} />
      </div>

      {/* Related records */}
      <details open className="group">
        <summary className="cursor-pointer list-none flex items-center gap-2 mb-3 text-sm font-semibold"><span aria-hidden="true" className="transition-transform group-open:rotate-90">›</span> Σχετικές εγγραφές</summary>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {canSeeQuotes && <RelatedList
          title="Προσφορές"
          href="/quotes"
          rows={contact.quotations.map((q) => ({
            id: q.id,
            link: `/quotes/${q.id}`,
            main: `${q.number} · v${q.version}`,
            right: money(q.totalGross.toNumber()),
            badge: q.status,
          }))}
        />}
        <RelatedList
          title="Έργα"
          href="/projects"
          rows={contact.projects.map((p) => ({
            id: p.id,
            link: `/projects/${p.id}`,
            main: `${p.code} · ${p.name}`,
            right: p.status,
          }))}
        />
        <RelatedList
          title="Ευκαιρίες"
          href="/pipeline"
          rows={contact.opportunities.map((o) => ({
            id: o.id,
            link: `/pipeline?open=${o.id}`,
            main: o.title,
            right: `${Math.round(o.probability)}%`,
            badge: o.stage,
          }))}
        />
        {canSeeMoney && <RelatedList
          title="Τιμολόγια"
          href="/finance"
          rows={contact.invoices.map((i) => ({
            id: i.id,
            link: `/finance?tab=invoices&open=${i.id}`,
            main: i.number,
            right: money(i.total.toNumber()),
            badge: i.status,
          }))}
        />}
      </div>
      </details>

      {/* Timeline + comments + files */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-1"><ActivityTimeline filters={{ contactId: id }} /></div>
        <div className="card p-5 lg:col-span-1">
          <Comments entityType="contact" entityId={id} />
          <div className="mt-6 border-t border-line-soft pt-4">
            <p className="eyebrow mb-2">Αρχεία & φωτογραφίες</p>
            <FileGallery entityType="contact" entityId={id} />
          </div>
        </div>
        <details className="card p-5 lg:col-span-1 group">
          <summary className="cursor-pointer list-none eyebrow mb-2 flex items-center justify-between">Στοιχεία & συναίνεση GDPR <span aria-hidden="true" className="text-base transition-transform group-open:rotate-90">›</span></summary>
          <dl className="text-[13px] space-y-2">
            <Row k="Διεύθυνση" v={[contact.street, contact.city, contact.postalCode].filter(Boolean).join(", ") || "—"} />
            <Row k="Περιοχή" v={t_reg(contact.region)} />
            <Row k="Γλώσσα επικοινωνίας" v={contact.preferredLanguage === "el" ? "Ελληνικά" : "English"} />
            <Row k="Συναίνεση GDPR" v={contact.gdprConsent ? `Ναι (${contact.gdprConsentAt?.toLocaleDateString("el-GR") ?? ""})` : "Όχι"} />
            <Row k="Marketing opt-in" v={contact.marketingOptIn ? "Ναι" : "Όχι"} />
            <Row k="Υπεύθυνος" v={contact.owner ? `${contact.owner.firstName} ${contact.owner.lastName}` : "—"} />
          </dl>
        </details>
      </div>
    </div>
  );
}

function showMoney(n: number) {
  return n > 0 ? `${Math.round(n).toLocaleString("el-GR")} €` : "—";
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line-soft pb-1.5 last:border-0">
      <dt className="text-ink-faint shrink-0">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}

function RelatedList({
  title,
  rows,
}: {
  title: string;
  href: string;
  rows: { id: string; link: string; main: string; right?: string; badge?: string | null }[];
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="eyebrow">{title}</p>
        <span className="text-xs text-ink-faint">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-ink-faint py-2">—</p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={r.link} className="flex items-center justify-between py-2 group text-[13px]">
                <span className="truncate font-medium group-hover:text-clay">{r.main}</span>
                <span className="flex items-center gap-2 text-ink-faint whitespace-nowrap">
                  {r.right}
                  {r.badge && <StatusBadge status={r.badge} />}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// tiny server-side label helpers (avoid client dictionary import)
function t_biz(b: string): string {
  return b.replaceAll("_", " ").toLowerCase();
}
function t_src(s: string): string {
  return s.replaceAll("_", " ").toLowerCase();
}
function t_reg(r: string): string {
  return r.replaceAll("_", " ").toLowerCase();
}
