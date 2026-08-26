import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui";
import { MeasurementsEditor, VisitNotes, VisitActions } from "@/components/modules/Measurements";
import { FileGallery } from "@/components/modules/FileGallery";
import { ActivityTimeline, Comments } from "@/components/modules/Timeline";
import { requirePageCapability } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function VisitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageCapability("visits.view");
  const { id } = await params;
  const visit = await prisma.siteVisit.findFirst({
    where: { id, deletedAt: null },
    include: {
      contact: true,
      opportunity: true,
      assignedTo: { select: { firstName: true, lastName: true } },
      measurements: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!visit) notFound();

  const totalArea = visit.measurements.reduce((s, m) => s + (m.areaM2 ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Επίσκεψη χώρου</p>
          <h1 className="display text-3xl mt-0.5">{visit.title}</h1>
          <p className="text-[13px] text-ink-soft mt-1 flex flex-wrap gap-x-3 items-center">
            <span>
              🗓{" "}
              <b>
                {new Date(visit.scheduledAt).toLocaleString("el-GR", {
                  weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
                })}
              </b>{" "}
              · {visit.durationMin}′
            </span>
            <Link href={`/contacts/${visit.contactId}`} className="text-clay hover:underline">
              ☺ {visit.contact.firstName} {visit.contact.lastName}
            </Link>
            {visit.city && <span>📍 {[visit.address, visit.city].filter(Boolean).join(", ")}</span>}
            {visit.assignedTo && <span>· {visit.assignedTo.firstName}</span>}
          </p>
        </div>
        <VisitActions id={visit.id} status={visit.status} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge tone={visit.status === "COMPLETED" ? "olive" : visit.status === "SCHEDULED" ? "slate" : "neutral"}>Σύνολο επιφανειών: {Math.round(totalArea * 10) / 10} m²</Badge>
        {visit.purpose && <Badge tone="clay">{visit.purpose}</Badge>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Measurements — primary content */}
        <div className="card p-5 lg:col-span-2 space-y-6">
          <MeasurementsEditor visitId={visit.id} initial={visit.measurements.map((m) => ({ ...m }))} />

          <div className="border-t border-line-soft pt-5">
            <FileGallery entityType="siteVisit" entityId={visit.id} />
          </div>

          <div className="border-t border-line-soft pt-5">
            <Comments entityType="siteVisit" entityId={visit.id} />
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-4">
          <div className="card p-5">
            <VisitNotes
              visit={{
                id: visit.id,
                accessNotes: visit.accessNotes,
                workingConditions: visit.workingConditions,
                customerRequirements: visit.customerRequirements,
                generalNotes: visit.generalNotes,
              }}
            />
          </div>
          <div className="card p-5">
            <p className="eyebrow mb-2">Έκδοση έκθεσης</p>
            <p className="text-xs text-ink-faint mb-3">Δομημένη έκθεση επίσκεψης με μετρήσεις και φωτογραφίες.</p>
            <Link href={`/visits/${visit.id}/report`} target="_blank" className="btn btn-secondary btn-sm w-full">▤ Έκθεση / PDF</Link>
          </div>
          <div className="card p-5">
            <ActivityTimeline filters={{ opportunityId: visit.opportunity?.id ?? "" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
