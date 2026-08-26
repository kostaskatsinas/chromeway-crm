"use client";

import { useState } from "react";
import Link from "next/link";
import { RevenueBar, CategoryDonut } from "@/components/charts";
import { Badge, Tabs, Button, EmptyState } from "@/components/ui";
import { fmtMoney } from "@/i18n/LanguageProvider";
import { toCsv } from "@/lib/utils";

type Data = {
  leadsBySource: Record<string, number>;
  wonLost: Record<string, number>;
  avgQuote: number;
  quoteCount: number;
  avgProject: number;
  projectCount: number;
  revenueByMonth: { label: string; value: number; expenses?: number }[];
  pipelineByStage: { label: string; value: number }[];
  teamUtil: { name: string; hours: number; color: string }[];
  materialConsumption: { name: string; qty: number }[];
  outstandingRows: { number: string; customer: string; dueDate: string; balance: number; overdue: boolean }[];
  repeatCustomers: { name: string; projects: number }[];
  revenueByRegion: Record<string, number>;
  revenueByBizType: Record<string, number>;
  grossProfit: number;
  grossExpenses: number;
};

const SRC_LABELS: Record<string, string> = {
  WEBSITE: "Ιστότοπος", REFERRAL: "Συστάσεις", INSTAGRAM: "Instagram", FACEBOOK: "Facebook", GOOGLE_SEARCH: "Google",
  WALK_IN: "Επίσκεψη", EXHIBITION: "Έκθεση", PARTNER: "Συνεργάτης", COLD_OUTREACH: "Προσέγγιση", REPEAT_CUSTOMER: "Επαναλαμβανόμενος", OTHER: "Άλλο",
};
const STAGE_LABELS: Record<string, string> = {
  NEW_LEAD: "Νέο lead", CONTACTED: "Επικοινωνία", QUALIFIED: "Προκριθέν", SITE_VISIT_PLANNED: "Επίσκεψη",
  SAMPLE_REQUESTED: "Δείγμα", QUOTATION_PREPARATION: "Εκπόνηση προσφοράς", QUOTATION_SENT: "Απεσταλμένη", NEGOTIATION: "Διαπραγμάτευση",
};

function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chromeway-${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsClient({ data, canSeeFinancial }: { data: Data; canSeeFinancial: boolean }) {
  const [tab, setTab] = useState("sales");

  const conversion = data.wonLost.WON + data.wonLost.LOST > 0 ? Math.round((data.wonLost.WON / (data.wonLost.WON + data.wonLost.LOST)) * 100) : 0;
  const margin = data.grossProfit > 0 ? Math.round(((data.grossProfit - data.grossExpenses) / data.grossProfit) * 100) : 0;

  return (
    <div className="space-y-5">
      <Tabs
        tabs={[
          { key: "sales", label: "Πωλήσεις" },
          ...(canSeeFinancial ? [{ key: "financial", label: "Οικονομικά" }] : []),
          { key: "ops", label: "Παραγωγή & Ομάδα" },
          { key: "outstanding", label: "Ανεξόφλητα", count: data.outstandingRows.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "sales" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Μετατροπή leads (έτος)" value={`${conversion}%`} sub={`${data.wonLost.WON} κερδημένες / ${data.wonLost.LOST} χαμένες`} />
            <Kpi label="Μέση αξία προσφοράς" value={fmtMoney(data.avgQuote)} sub={`${data.quoteCount} προσφορές`} />
            <Kpi label="Μέση αξία έργου" value={fmtMoney(data.avgProject)} sub={`${data.projectCount} έργα`} />
            <Kpi label="Pipeline ανά στάδιο" value={fmtMoney(data.pipelineByStage.reduce((s, x) => s + x.value, 0), undefined, true)} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="eyebrow">Leads ανά πηγή</p>
                <Button size="sm" variant="secondary" onClick={() => downloadCsv("leads-by-source", Object.entries(data.leadsBySource).map(([k, v]) => ({ source: k, count: v })))}>CSV</Button>
              </div>
              {Object.keys(data.leadsBySource).length ? (
                <ul className="divide-y divide-line-soft">
                  {Object.entries(data.leadsBySource).sort((a, b) => b[1] - a[1]).map(([src, n]) => (
                    <li key={src} className="py-2 flex items-center gap-3 text-[13px]">
                      <span className="w-32 shrink-0">{SRC_LABELS[src] ?? src}</span>
                      <div className="flex-1 h-2 bg-parchment rounded-full overflow-hidden">
                        <div className="h-full bg-clay rounded-full" style={{ width: `${(n / Math.max(...Object.values(data.leadsBySource))) * 100}%` }} />
                      </div>
                      <b className="tabular-nums w-8 text-right">{n}</b>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState title="—" />}
            </div>
            <div className="card p-5">
              <p className="eyebrow mb-2">Κερδημένες vs χαμένες (έτος)</p>
              <CategoryDonut data={data.wonLost} labels={{ WON: "Κερδημένες", LOST: "Χαμένες" }} />
            </div>
            <div className="card p-5">
              <p className="eyebrow mb-2">Αξία pipeline ανά στάδιο</p>
              {data.pipelineByStage.length ? (
                <ul className="divide-y divide-line-soft">
                  {data.pipelineByStage.sort((a, b) => b.value - a.value).map((s) => (
                    <li key={s.label} className="py-2 flex items-center gap-3 text-[13px]">
                      <span className="w-36 shrink-0">{STAGE_LABELS[s.label] ?? s.label}</span>
                      <div className="flex-1 h-2 bg-parchment rounded-full overflow-hidden">
                        <div className="h-full bg-slateblue rounded-full" style={{ width: `${(s.value / Math.max(...data.pipelineByStage.map((x) => x.value))) * 100}%` }} />
                      </div>
                      <b className="tabular-nums whitespace-nowrap">{Math.round(s.value / 1000)}k €</b>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState title="—" />}
            </div>
            <div className="card p-5">
              <p className="eyebrow mb-2">Επαναλαμβανόμενοι πελάτες</p>
              {data.repeatCustomers.filter((c) => c.projects > 0).length ? (
                <ul className="divide-y divide-line-soft">
                  {data.repeatCustomers.filter((c) => c.projects > 0).map((c) => (
                    <li key={c.name} className="py-2 flex justify-between text-[13px]">
                      <span>{c.name}</span>
                      <Badge tone={c.projects > 1 ? "olive" : "neutral"}>{c.projects} ολοκληρωμένα</Badge>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState title="—" />}
            </div>
          </div>
        </div>
      )}

      {tab === "financial" && canSeeFinancial && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Έσοδα 12μήνου" value={fmtMoney(data.grossProfit)} tone="olive" />
            <Kpi label="Δαπάνες 12μήνου" value={fmtMoney(data.grossExpenses)} tone="amber" />
            <Kpi label="Μικτό κέρδος" value={fmtMoney(data.grossProfit - data.grossExpenses)} tone="clay" />
            <Kpi label="Margin" value={`${margin}%`} tone={margin >= 30 ? "olive" : margin >= 15 ? "amber" : "rust"} />
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="eyebrow">Έσοδα & δαπάνες ανά μήνα</p>
              <Button size="sm" variant="secondary" onClick={() => downloadCsv("revenue", data.revenueByMonth.map((m) => ({ month: m.label, revenue: m.value, expenses: m.expenses ?? 0 })))}>CSV</Button>
            </div>
            <RevenueBar data={data.revenueByMonth} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <p className="eyebrow mb-2">Έσοδα ανά περιοχή (συμβάσεις)</p>
              <CategoryDonut data={data.revenueByRegion} />
            </div>
            <div className="card p-5">
              <p className="eyebrow mb-2">Έσοδα ανά τύπο πελάτη</p>
              <CategoryDonut data={data.revenueByBizType} />
            </div>
          </div>
        </div>
      )}

      {tab === "ops" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5">
            <p className="eyebrow mb-3">Αξιοποίηση ομάδας (ώρες, καταγεγραμμένες)</p>
            {data.teamUtil.length ? (
              <ul className="divide-y divide-line-soft">
                {data.teamUtil.sort((a, b) => b.hours - a.hours).map((u) => (
                  <li key={u.name} className="py-2.5 flex items-center gap-3 text-[13px]">
                    <span className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: u.color }}>
                      {u.name.split(" ").map((p) => p[0]).join("")}
                    </span>
                    <span className="flex-1">{u.name}</span>
                    <b className="tabular-nums">{u.hours} h</b>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="Καμία καταγεγραμμένη ώρα" />}
          </div>
          <div className="card p-5">
            <p className="eyebrow mb-3">Κατανάλωση υλικών (top 12)</p>
            {data.materialConsumption.length ? (
              <ul className="divide-y divide-line-soft">
                {data.materialConsumption.map((m) => (
                  <li key={m.name} className="py-2 flex justify-between text-[13px]">
                    <span className="truncate pr-3">{m.name}</span>
                    <b className="tabular-nums whitespace-nowrap">{m.qty}</b>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="Καμία κατανάλωση καταγεγραμμένη" />}
          </div>
        </div>
      )}

      {tab === "outstanding" && (
        <div className="card overflow-x-auto">
          <div className="p-4 flex justify-between items-center border-b border-line-soft">
            <p className="eyebrow">Ανεξόφλητα υπόλοιπα τιμολογίων</p>
            <Button size="sm" variant="secondary" onClick={() => downloadCsv("outstanding", data.outstandingRows)}>CSV</Button>
          </div>
          <table className="table-base min-w-[640px]">
            <thead><tr><th>Τιμολόγιο</th><th>Πελάτης</th><th>Λήξη</th><th>Υπόλοιπο</th></tr></thead>
            <tbody>
              {data.outstandingRows.length === 0 ? (
                <tr><td colSpan={4}><EmptyState icon="✓" title="Όλα εξοφλημένα" /></td></tr>
              ) : (
                data.outstandingRows.map((r) => (
                  <tr key={r.number}>
                    <td className="font-semibold">{r.number}</td>
                    <td>{r.customer}</td>
                    <td className={r.overdue ? "text-rust font-medium" : ""}>{r.dueDate}{r.overdue && " ⚠"}</td>
                    <td className="tabular-nums font-medium">{fmtMoney(r.balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="p-3 text-center">
            <Link href="/finance" className="text-[12px] text-clay hover:underline">Μετάβαση στα Οικονομικά →</Link>
          </div>
        </div>
      )}
    </div>
  );

  function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "olive" | "amber" | "rust" | "clay" }) {
    return (
      <div className="card p-4 relative overflow-hidden">
        <span className={`absolute left-0 top-0 bottom-0 w-1 ${tone === "olive" ? "bg-olive" : tone === "amber" ? "bg-amber-warm" : tone === "rust" ? "bg-rust" : tone === "clay" ? "bg-clay" : "bg-bronze"}`} />
        <p className="eyebrow mb-1">{label}</p>
        <p className="display text-xl">{value}</p>
        {sub && <p className="text-[11px] text-ink-faint mt-0.5">{sub}</p>}
      </div>
    );
  }
}
