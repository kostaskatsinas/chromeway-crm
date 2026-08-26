"use client";

import { use, useEffect, useState } from "react";
import { computeQuoteTotals, scheduleAmounts } from "@/lib/calc";
import { Button, Spinner, Badge } from "@/components/ui";

type PublicQuote = {
  number: string;
  version: number;
  status: string;
  projectName: string;
  projectAddress?: string | null;
  language: string;
  validUntil?: string | null;
  durationDays?: number | null;
  warrantyMonths: number;
  vatRate: number;
  wastePct: number;
  markupPct: number;
  discountPct: number;
  totalGross: string;
  paymentSchedule: { label: string; pct: number; dueDays: number }[];
  termsEl?: string | null;
  exclusionsEl?: string | null;
  notesEl?: string | null;
  expired?: boolean;
  items: { id: string; description: string; quantity: string; unit: string; unitPrice: string }[];
  contact: { firstName: string; lastName: string };
  companyProfile?: { companyName?: string };
};

export default function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [quote, setQuote] = useState<PublicQuote | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [decided, setDecided] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/public/quote/${token}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setQuote(j.data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [token]);

  const decide = async (decision: "accept" | "reject") => {
    setBusy(true);
    try {
      const res = await fetch(`/api/public/quote/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason, name: quote?.contact.firstName }),
      });
      const j = await res.json();
      if (j.ok) setDecided(decision);
    } finally {
      setBusy(false);
      setRejectOpen(false);
    }
  };

  if (notFound)
    return (
      <Center>
        <p className="display text-3xl">chromeway<span className="text-clay">.</span></p>
        <p className="text-ink-soft mt-3">Η προσφορά δεν βρέθηκε ή ο σύνδεσμος έχει ανακληθεί.</p>
      </Center>
    );

  if (!quote)
    return (
      <Center>
        <Spinner />
      </Center>
    );

  const isEn = quote.language === "en";
  const totals = computeQuoteTotals({
    items: quote.items.map((it) => ({ quantity: Number(it.quantity), unitPrice: Number(it.unitPrice) })),
    wastePct: quote.wastePct,
    markupPct: quote.markupPct,
    discountPct: quote.discountPct,
    vatRate: quote.vatRate,
  });
  const fmt = (n: number) => n.toLocaleString(isEn ? "en-IE" : "el-GR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const schedule = scheduleAmounts(totals.totalGross, quote.paymentSchedule ?? []);

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-2xl mx-auto px-4 py-10 print-page">
        <header className="flex items-baseline justify-between border-b-2 border-ink pb-4 mb-6">
          <p className="display text-3xl">chromeway<span className="text-clay">.</span></p>
          <p className="display text-xl">{quote.number}</p>
        </header>

        <h1 className="display text-3xl">{quote.projectName}</h1>
        <p className="text-[13px] text-ink-faint mt-1 mb-6">
          {isEn ? "Prepared for" : "Προσφορά για"} {quote.contact.firstName} {quote.contact.lastName}
          {" · "}
          {isEn ? `valid until ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString("el-GR") : "—"}` : `Ισχύς έως ${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString("el-GR") : "—"}`}
        </p>

        {/* Items */}
        <table className="w-full text-[13px] mb-5">
          <thead>
            <tr className="border-b border-line">
              <th className="py-2 text-left uppercase tracking-wider text-[10px]">{isEn ? "Description" : "Περιγραφή"}</th>
              <th className="py-2 text-right uppercase tracking-wider text-[10px] w-16">{isEn ? "Qty" : "Ποσ."}</th>
              <th className="py-2 text-right uppercase tracking-wider text-[10px] w-24">{isEn ? "Unit price" : "Τιμή μονάδας"}</th>
              <th className="py-2 text-right uppercase tracking-wider text-[10px] w-24">{isEn ? "Total €" : "Αξία €"}</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((it) => (
              <tr key={it.id} className="border-b border-line-soft align-top">
                <td className="py-2">{it.description}<span className="block text-[11px] text-ink-faint">{unitLabel(it.unit)}</span></td>
                <td className="py-2 text-right tabular-nums">{fmt(Number(it.quantity))}</td>
                <td className="py-2 text-right tabular-nums">{fmt(Number(it.unitPrice))} €</td>
                <td className="py-2 text-right tabular-nums font-medium">{fmt(Number(it.quantity) * Number(it.unitPrice))} €</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto w-full sm:w-72 space-y-1 text-[13px] mb-8">
          <Row k={isEn ? "Net total" : "Καθαρή αξία"} v={`${fmt(totals.totalNet)} €`} />
          <Row k={`ΦΠΑ ${quote.vatRate}%`} v={`${fmt(totals.vatAmount)} €`} />
          <div className="flex justify-between border-t-2 border-ink pt-2 mt-2">
            <span className="display text-lg">{isEn ? "Total" : "Συνολική αξία"}</span>
            <span className="display text-lg text-clay-dark tabular-nums">{fmt(totals.totalGross)} €</span>
          </div>
        </div>

        {/* Schedule */}
        {quote.paymentSchedule?.length > 0 && (
          <section className="mb-6">
            <h3 className="eyebrow mb-2">{isEn ? "Payment schedule" : "Πρόγραμμα πληρωμών"}</h3>
            <ul className="space-y-1 text-[13px]">
              {quote.paymentSchedule.map((s, i) => (
                <li key={i} className="flex justify-between border-b border-dashed border-line-soft py-1">
                  <span>{i + 1}. {s.label}</span>
                  <span className="tabular-nums">{s.pct}% · {fmt(schedule[i].amount)} €</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(quote.termsEl || quote.exclusionsEl) && (
          <section className="mb-8 space-y-3 text-[12px] text-ink-soft">
            {quote.termsEl && (<div><h3 className="eyebrow mb-1">{isEn ? "Terms" : "Όροι"}</h3><p className="whitespace-pre-wrap leading-relaxed">{quote.termsEl}</p></div>)}
            {quote.exclusionsEl && (<div><h3 className="eyebrow mb-1">{isEn ? "Exclusions" : "Εξαιρέσεις"}</h3><p className="whitespace-pre-wrap leading-relaxed">{quote.exclusionsEl}</p></div>)}
          </section>
        )}

        {/* Decision */}
        {decided === "accept" ? (
          <div className="card p-6 text-center bg-olive-soft border-olive/30">
            <p className="display text-2xl text-olive">{isEn ? "Thank you — quotation accepted ✓" : "Ευχαριστούμε — η προσφορά έγινε αποδεκτή ✓"}</p>
            <p className="text-[13px] text-ink-soft mt-2">{isEn ? "Our team will contact you to schedule the work." : "Η ομάδα μας θα επικοινωνήσει μαζί σας για τον προγραμματισμό των εργασιών."}</p>
          </div>
        ) : decided === "reject" ? (
          <div className="card p-6 text-center">
            <p className="display text-2xl">{isEn ? "Response recorded" : "Η απάντησή σας καταγράφηκε"}</p>
            <p className="text-[13px] text-ink-soft mt-2">{isEn ? "We appreciate your feedback and hope to collaborate in the future." : "Σας ευχαριστούμε για την ανταπόκριση — ελπίζουμε σε μελλοντική συνεργασία."}</p>
          </div>
        ) : ["ACCEPTED"].includes(quote.status) ? (
          <Badge tone="olive">✓ Αποδεκτή</Badge>
        ) : ["REJECTED"].includes(quote.status) || quote.expired ? (
          <Badge tone="neutral">{quote.expired ? (isEn ? "Link expired" : "Ο σύνδεσμος έληξε") : isEn ? "Rejected" : "Απορρίφθηκε"}</Badge>
        ) : (
          <div className="card p-6 space-y-4">
            <p className="text-[13px] text-ink-soft text-center">
              {isEn
                ? "Please confirm your decision — the studio is notified instantly."
                : "Παρακαλώ επιβεβαιώστε την απόφασή σας — το εργαστήριο ειδοποιείται άμεσα."}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Button onClick={() => decide("accept")} disabled={busy} className="!px-10">
                {isEn ? "Accept quotation" : "Αποδοχή προσφοράς"} ✓
              </Button>
              <Button variant="secondary" onClick={() => setRejectOpen(!rejectOpen)} disabled={busy}>
                {isEn ? "Decline" : "Απόρριψη"}
              </Button>
            </div>
            {rejectOpen && (
              <div className="pt-3 border-t border-line-soft space-y-3">
                <textarea
                  rows={2}
                  className="textarea"
                  placeholder={isEn ? "Optional feedback…" : "Προαιρετικό σχόλιο…"}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <div className="text-center">
                  <Button variant="danger" size="sm" onClick={() => decide("reject")} disabled={busy}>
                    {isEn ? "Confirm decline" : "Επιβεβαίωση απόρριψης"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <footer className="mt-10 pt-4 border-t border-line-soft text-center text-[11px] text-ink-faint">
          Chromeway · Premium decorative finishes · Athens — Peloponnese<br />hello@chromeway.gr
        </footer>
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex flex-col items-center justify-center gap-3">{children}</div>;
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-soft">{k}</span>
      <span className="tabular-nums">{v}</span>
    </div>
  );
}

function unitLabel(u: string): string {
  const map: Record<string, string> = { SQM: "m²", LINEAR_M: "μ.μ.", PIECE: "τεμ.", KG: "kg", LITER: "λτ", HOUR: "ώρα", DAY: "ημέρα", LOT: "lot" };
  return map[u] ?? u;
}
