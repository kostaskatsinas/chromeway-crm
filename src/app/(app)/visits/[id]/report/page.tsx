import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PrintButton } from "@/components/PrintButton";
import { requirePageCapability } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function VisitReportPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageCapability("visits.view");
  const { id } = await params;
  const visit = await prisma.siteVisit.findFirst({
    where: { id, deletedAt: null },
    include: {
      contact: true,
      assignedTo: { select: { firstName: true, lastName: true } },
      measurements: true,
    },
  });
  if (!visit) notFound();

  const files = await prisma.file.findMany({
    where: { entityType: "siteVisit", entityId: visit.id, deletedAt: null, mimeType: { startsWith: "image/" } },
    take: 12,
  });

  const totalArea = visit.measurements.reduce((s, m) => s + (m.areaM2 ?? 0), 0);

  return (
    <div className="min-h-screen bg-paper py-8 print:py-0">
      <div className="print-page card max-w-3xl mx-auto p-10 bg-white">
        <PrintButton />

        <header className="flex items-baseline justify-between border-b-2 border-ink pb-4 mb-6">
          <div>
            <p className="display text-3xl">chromeway<span className="text-clay">.</span></p>
            <p className="text-[11px] text-neutral-500 mt-1">Διακοσμητικά φινιρίσματα premium κατηγορίας · Αθήνα</p>
          </div>
          <div className="text-right text-[11px] text-neutral-600">
            <p className="font-bold uppercase tracking-widest text-[10px]">Έκθεση επίσκεψης χώρου</p>
            <p>Ημερομηνία: {new Date(visit.scheduledAt).toLocaleDateString("el-GR")}</p>
          </div>
        </header>

        <h1 className="display text-2xl mb-1">{visit.title}</h1>
        <p className="text-[13px] text-neutral-700 mb-5">
          Πελάτης: <b>{visit.contact.firstName} {visit.contact.lastName}</b>
          {visit.address ? ` · ${[visit.address, visit.city].filter(Boolean).join(", ")}` : ""}
        </p>

        <table className="w-full text-[12px] border border-neutral-300 mb-5">
          <thead className="bg-neutral-100">
            <tr>
              {[["Χώρος / Επιφάνεια", "text-left"], ["Τύπος", "text-left"], ["Υλικό", "text-left"], ["Διαστάσεις (m)", "text-center"], ["m²", "text-right"], ["Κατάσταση / Προετοιμασία", "text-left"]].map(([label, align]) => (
                <th key={label as string} className={`border-b border-neutral-300 px-2.5 py-2 ${align}`}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visit.measurements.map((m) => (
              <tr key={m.id}>
                <td className="px-2.5 py-1.5 border-b border-neutral-200 font-medium">{m.areaName}</td>
                <td className="px-2.5 py-1.5 border-b border-neutral-200">{m.surfaceType ?? "—"}</td>
                <td className="px-2.5 py-1.5 border-b border-neutral-200">{m.material ?? "—"}</td>
                <td className="px-2.5 py-1.5 border-b border-neutral-200 text-center whitespace-nowrap">
                  {[m.lengthM && `${m.lengthM}`, m.widthM && `×${m.widthM}`, m.heightM && `×${m.heightM}`].filter(Boolean).join(" ") || "—"}
                </td>
                <td className="px-2.5 py-1.5 border-b border-neutral-200 text-right tabular-nums">{m.areaM2 ?? "—"}</td>
                <td className="px-2.5 py-1.5 border-b border-neutral-200">{[m.condition, m.prepRequired].filter(Boolean).join(" → ") || "—"}</td>
              </tr>
            ))}
            {visit.measurements.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-4 text-center text-neutral-400">Χωρίς καταγεγραμμένες μετρήσεις</td></tr>
            )}
            <tr className="bg-neutral-50 font-semibold">
              <td colSpan={4} className="px-2.5 py-2 text-right">Σύνολο επιφανειών</td>
              <td className="px-2.5 py-2 text-right tabular-nums">{Math.round(totalArea * 10) / 10}</td>
              <td />
            </tr>
          </tbody>
        </table>

        <div className="grid grid-cols-2 gap-6 text-[12px] mb-5">
          <section>
            <p className="font-bold uppercase tracking-widest text-[10px] text-neutral-500 mb-1.5">Περιορισμοί πρόσβασης</p>
            <p className="whitespace-pre-wrap min-h-[24px]">{visit.accessNotes ?? "—"}</p>
          </section>
          <section>
            <p className="font-bold uppercase tracking-widest text-[10px] text-neutral-500 mb-1.5">Συνθήκες εργασίας</p>
            <p className="whitespace-pre-wrap min-h-[24px]">{visit.workingConditions ?? "—"}</p>
          </section>
          <section>
            <p className="font-bold uppercase tracking-widest text-[10px] text-neutral-500 mb-1.5">Απαιτήσεις πελάτη</p>
            <p className="whitespace-pre-wrap min-h-[24px]">{visit.customerRequirements ?? "—"}</p>
          </section>
          <section>
            <p className="font-bold uppercase tracking-widest text-[10px] text-neutral-500 mb-1.5">Γενικές σημειώσεις</p>
            <p className="whitespace-pre-wrap min-h-[24px]">{visit.generalNotes ?? "—"}</p>
          </section>
        </div>

        {files.length > 0 && (
          <section className="mb-4">
            <p className="font-bold uppercase tracking-widest text-[10px] text-neutral-500 mb-2">Φωτογραφικό υλικό</p>
            <div className="grid grid-cols-4 gap-2">
              {files.map((f) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img key={f.id} src={`/api/files/${f.id}/raw?variant=main`} alt="" className="aspect-square object-cover rounded border border-neutral-200" />
              ))}
            </div>
          </section>
        )}

        <footer className="border-t border-neutral-200 pt-3 mt-6 flex justify-between text-[10px] text-neutral-400">
          <span>Με μέρινα για την λεπτομέρεια — Chromeway Studio</span>
          <span>{visit.assignedTo ? `${visit.assignedTo.firstName} ${visit.assignedTo.lastName}` : ""}</span>
        </footer>
      </div>
    </div>
  );
}
