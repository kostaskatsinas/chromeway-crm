import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { PrintButton } from "@/components/PrintButton";
import { computeQuoteTotals } from "@/lib/calc";
import { requirePageCapability } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

type ScheduleEntry = { label: string; pct: number; dueDays: number };

export default async function QuotePrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePageCapability("quotes.view");
  const { id } = await params;
  const quote = await prisma.quotation.findFirst({
    where: { id, deletedAt: null },
    include: {
      items: { orderBy: { position: "asc" } },
      contact: true,
      company: true,
      createdBy: { select: { firstName: true, lastName: true, phone: true, email: true } },
    },
  });
  if (!quote) notFound();

  const isEn = quote.language === "en";
  const totals = computeQuoteTotals({
    items: quote.items.map((it) => ({ quantity: Number(it.quantity), unitPrice: Number(it.unitPrice) })),
    wastePct: quote.wastePct,
    markupPct: quote.markupPct,
    discountPct: quote.discountPct,
    vatRate: quote.vatRate,
  });

  const schedule = (quote.paymentSchedule as unknown as ScheduleEntry[]) ?? [];
  const fmt = (n: number) => n.toLocaleString(isEn ? "en-IE" : "el-GR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dateFmt = (d: Date | null | undefined) =>
    d ? d.toLocaleDateString(isEn ? "en-GB" : "el-GR", { day: "2-digit", month: "long", year: "numeric" }) : "—";

  const L = isEn
    ? {
        quoteNo: "Quotation", project: "Project", client: "Client", address: "Address", date: "Date", validUntil: "Valid until",
        description: "Description", type: "Type", qty: "Qty", unit: "Unit", unitPrice: "Unit price €", total: "Total €",
        subtotal: "Subtotal", waste: `Material waste (${quote.wastePct}%)`, discount: `Discount (−${quote.discountPct}%)`,
        netTotal: "Net total", vat: `VAT ${quote.vatRate}%`, grossTotal: "Gross total", schedule: "Payment schedule",
        duration: "Estimated duration", warranty: "Warranty", months: "months", days: "days", terms: "Terms",
        exclusions: "Exclusions", notes: "Notes", accept: "To accept this quotation use the secure link you received by email.",
        signature: "Signature — Chromeway Studio", customerSig: "Customer acceptance", sqm: "m²",
      }
    : {
        quoteNo: "Προσφορά", project: "Έργο", client: "Πελάτης", address: "Διεύθυνση έργου", date: "Ημερομηνία", validUntil: "Ισχύς προσφοράς",
        description: "Περιγραφή", type: "Κατηγορία", qty: "Ποσ.", unit: "Μονάδα", unitPrice: "Τιμή μονάδας €", total: "Αξία €",
        subtotal: "Υποσύνολο", waste: `Ποσοστό σπατάλης (${quote.wastePct}%)`, discount: `Έκπτωση (−${quote.discountPct}%)`,
        netTotal: "Καθαρή αξία", vat: `ΦΠΑ ${quote.vatRate}%`, grossTotal: "Συνολική αξία", schedule: "Πρόγραμμα πληρωμών",
        duration: "Εκτιμώμενη διάρκεια εργασιών", warranty: "Εγγύηση", months: "μήνες", days: "ημέρες", terms: "Όροι",
        exclusions: "Εξαιρέσεις", notes: "Σημειώσεις", accept: "Για την αποδοχή της προσφοράς χρησιμοποιήστε τον ασφαλή σύνδεσμο που λάβατε με email.",
        signature: "Υπογραφή — Chromeway Studio", customerSig: "Αποδοχή πελάτη", sqm: "m²",
      };

  return (
    <div className="min-h-screen bg-paper py-8 print:py-0">
      <div className="print-page card max-w-3xl mx-auto p-10 bg-white">
        <PrintButton />

        {/* Header */}
        <header className="flex items-baseline justify-between border-b-2 border-ink pb-4 mb-8">
          <div>
            <p className="display text-4xl leading-none">chromeway<span className="text-clay">.</span></p>
            <p className="text-[10.5px] text-neutral-500 mt-1.5 tracking-wide">
              {isEn ? "Decorative finishes studio · Athens, Greece" : "Studio διακοσμητικών φινιρισμάτων premium κατηγορίας · Αθήνα"}
              <br />hello@chromeway.gr · +30 210 000 0000
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-clay">{L.quoteNo}</p>
            <p className="display text-2xl">{quote.number}</p>
          </div>
        </header>

        {/* Meta */}
        <div className="grid grid-cols-2 gap-x-10 gap-y-3 text-[12.5px] mb-8">
          <Meta label={L.client} value={quote.company?.name ?? `${quote.contact.firstName} ${quote.contact.lastName}`} strong />
          <Meta label={L.project} value={quote.projectName} />
          {quote.projectAddress && <Meta label={L.address} value={[quote.projectAddress, quote.city].filter(Boolean).join(", ")} />}
          <Meta label={L.date} value={dateFmt(quote.issueDate)} />
          {quote.validUntil && <Meta label={L.validUntil} value={dateFmt(quote.validUntil)} />}
          {quote.durationDays && <Meta label={L.duration} value={`${quote.durationDays} ${L.days}`} />}
          <Meta label={L.warranty} value={`${quote.warrantyMonths} ${L.months}`} />
        </div>

        {/* Items */}
        <table className="w-full text-[12px] border-collapse mb-6">
          <thead>
            <tr className="border-b-2 border-ink">
              <th className="py-2 text-left uppercase tracking-wider text-[10px] w-28">{L.type}</th>
              <th className="py-2 text-left uppercase tracking-wider text-[10px]">{L.description}</th>
              <th className="py-2 text-center uppercase tracking-wider text-[10px] w-16">{L.qty}</th>
              <th className="py-2 text-center uppercase tracking-wider text-[10px] w-16">{L.unit}</th>
              <th className="py-2 text-right uppercase tracking-wider text-[10px] w-24">{L.unitPrice}</th>
              <th className="py-2 text-right uppercase tracking-wider text-[10px] w-24">{L.total}</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((it) => (
              <tr key={it.id} className="border-b border-neutral-200 align-top">
                <td className="py-2 text-neutral-500">{itemTypeLabel(it.type, isEn)}</td>
                <td className="py-2">
                  {it.description}
                  {it.notes && <span className="block text-neutral-400 text-[11px] italic">{it.notes}</span>}
                </td>
                <td className="py-2 text-center tabular-nums">{fmt(Number(it.quantity))}</td>
                <td className="py-2 text-center text-neutral-500">{unitLabel(it.unit)}</td>
                <td className="py-2 text-right tabular-nums">{fmt(Number(it.unitPrice))}</td>
                <td className="py-2 text-right tabular-nums font-medium">{fmt(Number(it.quantity) * Number(it.unitPrice))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <table className="text-[12.5px] w-72">
            <tbody>
              <TotRow label={L.subtotal} value={`${fmt(totals.subtotal)} €`} />
              {totals.wasteAmount > 0 && <TotRow label={L.waste} value={`${fmt(totals.wasteAmount)} €`} muted />}
              {totals.discountAmount > 0 && <TotRow label={L.discount} value={`−${fmt(totals.discountAmount)} €`} muted />}
              {totals.markupAmount > 0 && <TotRow label={isEn ? "Studio margin" : "Προσαύξηση"} value={`${fmt(totals.markupAmount)} €`} muted />}
              <tr className="border-t border-neutral-300">
                <td className="py-1.5">{L.netTotal}</td>
                <td className="py-1.5 text-right tabular-nums">{fmt(totals.totalNet)} €</td>
              </tr>
              <tr><td className="py-1">{L.vat}</td><td className="py-1 text-right tabular-nums">{fmt(totals.vatAmount)} €</td></tr>
              <tr className="border-t-2 border-ink">
                <td className="pt-2 pb-1 display text-lg">{L.grossTotal}</td>
                <td className="pt-2 pb-1 text-right display text-lg tabular-nums">{fmt(totals.totalGross)} €</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment schedule */}
        {schedule.length > 0 && (
          <section className="mb-8">
            <h3 className="font-bold uppercase tracking-widest text-[10px] text-neutral-500 mb-2">{L.schedule}</h3>
            <ul className="space-y-1 text-[12px]">
              {schedule.map((s, i) => (
                <li key={i} className="flex justify-between border-b border-dashed border-neutral-200 py-1 max-w-md">
                  <span>{i + 1}. {s.label || (isEn ? "Instalment" : "Δόση")} {s.dueDays > 0 ? (isEn ? `(day ${s.dueDays})` : `(ημέρα ${s.dueDays})`) : ""}</span>
                  <span className="tabular-nums">{s.pct}% · {fmt(Math.round(totals.totalGross * s.pct) / 100)} €</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Terms */}
        {(quote.termsEl || quote.exclusionsEl || quote.notesEl) && (
          <section className="mb-8 space-y-4 text-[11.5px] text-neutral-700">
            {quote.termsEl && (<div><h3 className="font-bold uppercase tracking-widest text-[10px] text-neutral-500 mb-1">{L.terms}</h3><p className="whitespace-pre-wrap leading-relaxed">{quote.termsEl}</p></div>)}
            {quote.exclusionsEl && (<div><h3 className="font-bold uppercase tracking-widest text-[10px] text-neutral-500 mb-1">{L.exclusions}</h3><p className="whitespace-pre-wrap leading-relaxed">{quote.exclusionsEl}</p></div>)}
            {quote.notesEl && (<div><h3 className="font-bold uppercase tracking-widest text-[10px] text-neutral-500 mb-1">{L.notes}</h3><p className="whitespace-pre-wrap leading-relaxed">{quote.notesEl}</p></div>)}
          </section>
        )}

        <footer className="border-t border-neutral-200 pt-4 mt-8 flex items-end justify-between">
          <div className="text-[10px] text-neutral-400 leading-relaxed">
            <p>{quote.createdBy ? `${quote.createdBy.firstName} ${quote.createdBy.lastName}` : "Chromeway Studio"}{quote.createdBy?.phone ? ` · ${quote.createdBy.phone}` : ""}</p>
            <p>{quote.createdBy?.email ?? ""}</p>
          </div>
          <Link href={`/public-quote/${quote.publicToken}`} target="_blank" className="no-print text-[11px] text-clay underline underline-offset-2">
            Σύνδεσμος αποδοχής για τον πελάτη ↗
          </Link>
          <div className="w-48 border-b border-neutral-400 text-right text-[9px] text-neutral-400 pb-0.5 pt-16">{L.customerSig}</div>
        </footer>
      </div>
    </div>
  );
}

function Meta({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex gap-2 items-baseline">
      <span className="text-[10px] uppercase tracking-widest text-neutral-400 shrink-0 w-24">{label}</span>
      <span className={strong ? "font-semibold text-[14px]" : ""}>{value}</span>
    </div>
  );
}

function TotRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <tr>
      <td className={`py-0.5 ${muted ? "text-neutral-400" : "text-neutral-600"}`}>{label}</td>
      <td className={`py-0.5 text-right tabular-nums ${muted ? "text-neutral-400" : ""}`}>{value}</td>
    </tr>
  );
}

function itemTypeLabel(type: string, en: boolean): string {
  const elMap: Record<string, string> = {
    FINISH_APPLICATION: "Εφαρμογή", SURFACE_PREPARATION: "Προετοιμασία", MATERIAL: "Υλικά", LABOUR: "Εργασία",
    TRAVEL_TRANSPORT: "Μεταφορικά", ACCOMMODATION: "Διαμονή", EQUIPMENT: "Εξοπλισμός", SUBCONTRACTOR: "Υπεργολαβία", CUSTOM_ITEM: "Λοιπά",
  };
  const enMap: Record<string, string> = {
    FINISH_APPLICATION: "Application", SURFACE_PREPARATION: "Preparation", MATERIAL: "Materials", LABOUR: "Labour",
    TRAVEL_TRANSPORT: "Transport", ACCOMMODATION: "Stay", EQUIPMENT: "Equipment", SUBCONTRACTOR: "Subcontract", CUSTOM_ITEM: "Other",
  };
  return en ? enMap[type] ?? type : elMap[type] ?? type;
}

function unitLabel(u: string): string {
  const map: Record<string, string> = { SQM: "m²", LINEAR_M: "μ.μ.", PIECE: "τεμ.", KG: "kg", LITER: "λτ", HOUR: "ώρα", DAY: "ημέρα", LOT: "lot" };
  return map[u] ?? u;
}
