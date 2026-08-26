"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { computeQuoteTotals } from "@/lib/calc";
import { Button, Badge, Field, Input, Select, Textarea, useToast } from "@/components/ui";
import { ContactPicker } from "@/components/modules/Contacts";
import { useI18n, fmtMoney } from "@/i18n/LanguageProvider";

const ITEM_TYPES = ["FINISH_APPLICATION", "SURFACE_PREPARATION", "MATERIAL", "LABOUR", "TRAVEL_TRANSPORT", "ACCOMMODATION", "EQUIPMENT", "SUBCONTRACTOR", "CUSTOM_ITEM"];
const UNITS = ["SQM", "LINEAR_M", "PIECE", "KG", "LITER", "HOUR", "DAY", "LOT"];

export type QuoteItem = {
  id?: string;
  type: string;
  description: string;
  finishId?: string | null;
  unit: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  hoursPerUnit: number;
  notes?: string | null;
};

export type QuoteHeader = {
  contactId?: string;
  opportunityId?: string | null;
  projectName: string;
  projectAddress?: string | null;
  city?: string | null;
  region?: string;
  language: string;
  validUntil?: string | null;
  durationDays?: number | null;
  warrantyMonths: number;
  wastePct: number;
  markupPct: number;
  discountPct: number;
  vatRate: number;
  paymentSchedule: { label: string; pct: number; dueDays: number }[];
  termsEl?: string | null;
  exclusionsEl?: string | null;
  notesEl?: string | null;
};

const DEFAULT_SCHEDULE = [
  { label: "Προκαταβολή", pct: 40, dueDays: 0 },
  { label: "Ποσοστό εξέλιξης", pct: 40, dueDays: 15 },
  { label: "Ολοκλήρωση & παράδοση", pct: 20, dueDays: 30 },
];

export function QuoteBuilder({
  quoteId,
  initialHeader,
  initialItems,
  meta,
}: {
  quoteId?: string;
  initialHeader?: Partial<QuoteHeader>;
  initialItems?: QuoteItem[];
  meta?: { number?: string; status?: string; version?: number; publicToken?: string; contactName?: string };
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const [header, setHeader] = useState<Record<string, unknown>>({
    language: "el",
    warrantyMonths: 24,
    wastePct: 5,
    markupPct: 35,
    discountPct: 0,
    vatRate: 24,
    paymentSchedule: DEFAULT_SCHEDULE,
    region: "ATTICA",
    ...initialHeader,
  });
  const [items, setItems] = useState<QuoteItem[]>(initialItems ?? []);
  const [finishes, setFinishes] = useState<{ id: string; nameEl: string; code: string; suggestedPricePerM2: string; materialCostPerM2: string; labourHoursPerM2: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const [showInternal] = useState(true);

  useEffect(() => {
    type F = { id: string; nameEl: string; code: string; suggestedPricePerM2: string; materialCostPerM2: string; labourHoursPerM2: number };
    api<{ items: F[] }>("/api/finishes?pageSize=200").then((r) => setFinishes(r.items)).catch(() => {});
  }, []);

  const totals = useMemo(
    () => computeQuoteTotals({ items, wastePct: Number(header.wastePct) || 0, markupPct: Number(header.markupPct) || 0, discountPct: Number(header.discountPct) || 0, vatRate: Number(header.vatRate) || 0 }),
    [items, header]
  );

  const setH = (k: string, v: unknown) => setHeader((h) => ({ ...h, [k]: v }));
  const setItem = (i: number, k: keyof QuoteItem, v: unknown) =>
    setItems((its) => its.map((it, j) => (j === i ? { ...it, [k]: v } as QuoteItem : it)));

  const applyFinish = async (i: number, finishId: string) => {
    const f = finishes.find((x) => x.id === finishId);
    if (!f) return void setItem(i, "finishId", null);
    try {
      const detail = await api<{ nameEl: string; suggestedPricePerM2: string; materialCostPerM2: string; labourHoursPerM2: number; applicationLayers?: number }>(`/api/finishes/${f.id}`);
      setItems((its) =>
        its.map((it, j) =>
          j === i
            ? {
                ...it,
                finishId,
                description: it.description || `${detail.nameEl} — εφαρμογή`,
                unitPrice: Number(detail.suggestedPricePerM2),
                unitCost: Number(detail.materialCostPerM2),
                hoursPerUnit: Number(detail.labourHoursPerM2),
              }
            : it
        )
      );
    } catch {
      setItem(i, "finishId", finishId);
    }
  };

  const save = async (): Promise<string | null> => {
    if (!header.contactId || !header.projectName) {
      toast("Επιλέξτε επαφή και όνομα έργου", "err");
      return null;
    }
    setBusy(true);
    try {
      if (quoteId) {
        await api(`/api/quotations/${quoteId}`, { method: "PATCH", body: { ...header, items } });
        return quoteId;
      }
      const created = await api<{ id: string }>("/api/quotations", { body: { ...header, items } });
      toast(t("common.savedOk"));
      return created.id;
    } catch (err) {
      toast(String((err as Error).message), "err");
      return null;
    } finally {
      setBusy(false);
    }
  };

  const saveAndView = async () => {
    const id = await save();
    if (id && !quoteId) router.replace(`/quotes/${id}`);
  };

  const sendToCustomer = async () => {
    let id: string | null | undefined = quoteId;
    if (!id) {
      id = await save();
      if (!id) return;
      router.replace(`/quotes/${id}`);
    }
    try {
      const updated = await api<{ publicToken: string }>(`/api/quotations/${id}`, { body: { action: "send" } });
      toast("Ο σύνδεσμος πελάτη δημιουργήθηκε — η προσφορά σήμθηκε ως απεσταλμένη");
      const link = `${window.location.origin}/public-quote/${updated.publicToken}`;
      await navigator.clipboard.writeText(link).catch(() => {});
      toast(`Σύνδεσμος αντιγράφηκε: ${link.slice(0, 48)}…`);
      router.refresh();
    } catch (e) {
      toast(String((e as Error).message), "err");
    }
  };

  const newVersion = async () => {
    if (!quoteId) return;
    try {
      const created = await api<{ id: string }>(`/api/quotations/${quoteId}`, { body: { action: "newVersion" } });
      toast("Νέα έκδοση προσφοράς δημιουργήθηκε");
      router.push(`/quotes/${created.id}`);
    } catch (e) {
      toast(String((e as Error).message), "err");
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5 items-start">
      {/* Main column */}
      <div className="space-y-5">
        {/* Meta bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="eyebrow">Προσφορά</p>
            <h1 className="display text-3xl mt-0.5">{meta?.number ?? "Πρόχειρη"}</h1>
          </div>
          {meta?.status && <Badge tone={meta.status === "ACCEPTED" ? "olive" : meta.status === "SENT" || meta.status === "VIEWED" ? "slate" : meta.status === "REJECTED" ? "rust" : "neutral"}>{t(`qstatus.${meta.status}`)}</Badge>}
          {meta?.version && <Badge>v{meta.version}</Badge>}
          <div className="flex-1" />
          <div className="flex gap-2 flex-wrap">
            {!quoteId ? (
              <Button onClick={saveAndView} disabled={busy}>{busy ? t("common.saving") : t("common.save")}</Button>
            ) : (
              <>
                <Button variant="secondary" onClick={save} disabled={busy}>{busy ? t("common.saving") : t("common.save")}</Button>
                <Button variant="secondary" onClick={newVersion}>+ Νέα έκδοση</Button>
                <a href={`/quotes/${quoteId}/print`} target="_blank" className="btn btn-secondary">▤ PDF</a>
                <Button onClick={sendToCustomer} disabled={["ACCEPTED"].includes(meta?.status ?? "")}>✈ Σύνδεσμος πελάτη</Button>
              </>
            )}
          </div>
        </div>

        {/* Customer & project */}
        <div className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={`${t("opp.contact")} *`}>
            <ContactPicker value={(header.contactId as string) ?? ""} onChange={(v) => setH("contactId", v)} />
          </Field>
          <Field label={`${t("opp.projectName")} *`}>
            <Input value={(header.projectName as string) ?? ""} onChange={(e) => setH("projectName", e.target.value)} placeholder="π.χ. Ανακαίνιση lobby ξενοδοχείου" />
          </Field>
          <Field label={t("common.address")}>
            <Input value={(header.projectAddress as string) ?? ""} onChange={(e) => setH("projectAddress", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("common.city")}><Input value={(header.city as string) ?? ""} onChange={(e) => setH("city", e.target.value)} /></Field>
            <Field label={t("quote.language")}>
              <Select value={(header.language as string) ?? "el"} onChange={(e) => setH("language", e.target.value)} options={[{ value: "el", label: "Ελληνικά" }, { value: "en", label: "English" }]} />
            </Field>
          </div>
          <Field label={t("quote.validUntil")}>
            <Input type="date" value={(header.validUntil as string)?.slice(0, 10) ?? ""} onChange={(e) => setH("validUntil", e.target.value || null)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("quote.durationDays")}><Input type="number" min={0} value={(header.durationDays as number) ?? ""} onChange={(e) => setH("durationDays", e.target.value === "" ? null : Number(e.target.value))} /></Field>
            <Field label={t("quote.warrantyMonths")}><Input type="number" min={0} value={(header.warrantyMonths as number) ?? 24} onChange={(e) => setH("warrantyMonths", Number(e.target.value))} /></Field>
          </div>
        </div>

        {/* Items */}
        <div className="card p-5">
          <p className="eyebrow mb-4">{t("quote.items")}</p>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="table-base min-w-[820px]">
              <thead>
                <tr>
                  <th className="w-44">{t("quote.itemType")}</th>
                  <th>{t("common.description")}</th>
                  <th className="w-20">{t("common.unit")}</th>
                  <th className="w-24">{t("common.quantity")}</th>
                  <th className="w-28">{t("common.price")} €</th>
                  <th className="w-24">{t("common.total")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i}>
                    <td>
                      <Select value={it.type} onChange={(e) => setItem(i, "type", e.target.value)} options={ITEM_TYPES.map((ty) => ({ value: ty, label: t(`item.${ty}`) }))} className="!text-[12px]" />
                    </td>
                    <td>
                      {it.type === "FINISH_APPLICATION" ? (
                        <div className="space-y-1">
                          <Select value={it.finishId ?? ""} onChange={(e) => applyFinish(i, e.target.value)} placeholder="— Φινίρισμα —" options={finishes.map((f) => ({ value: f.id, label: `${f.code} · ${f.nameEl}` }))} className="!text-[12px] mb-1" />
                          <Input value={it.description} onChange={(e) => setItem(i, "description", e.target.value)} placeholder="Περιγραφή γραμμής…" />
                        </div>
                      ) : (
                        <Input value={it.description} onChange={(e) => setItem(i, "description", e.target.value)} placeholder="π.χ. Αστάρωση & τρίψιμο επιφανειών" />
                      )}
                    </td>
                    <td><Select value={it.unit} onChange={(e) => setItem(i, "unit", e.target.value)} options={UNITS.map((u) => ({ value: u, label: t(`unit.${u}`) }))} className="!text-[12px]" /></td>
                    <td><Input type="number" step="0.01" min={0} value={it.quantity} onChange={(e) => setItem(i, "quantity", Number(e.target.value) || 0)} /></td>
                    <td><Input type="number" step="0.5" min={0} value={it.unitPrice} onChange={(e) => setItem(i, "unitPrice", Number(e.target.value) || 0)} /></td>
                    <td className="tabular-nums font-medium whitespace-nowrap">{fmtMoney(it.quantity * it.unitPrice, lang)}</td>
                    <td><Button variant="danger" size="sm" onClick={() => setItems(items.filter((_, j) => j !== i))}>✕</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {items.map((it, i) => (
              <div key={i} className="card p-3 space-y-2 bg-parchment/40">
                <Select value={it.type} onChange={(e) => setItem(i, "type", e.target.value)} options={ITEM_TYPES.map((ty) => ({ value: ty, label: t(`item.${ty}`) }))} />
                {it.type === "FINISH_APPLICATION" && (
                  <Select value={it.finishId ?? ""} onChange={(e) => applyFinish(i, e.target.value)} placeholder="— Φινίρισμα —" options={finishes.map((f) => ({ value: f.id, label: f.nameEl }))} />
                )}
                <Input value={it.description} onChange={(e) => setItem(i, "description", e.target.value)} placeholder="Περιγραφή…" />
                <div className="grid grid-cols-3 gap-2">
                  <Input type="number" step="0.01" value={it.quantity} onChange={(e) => setItem(i, "quantity", Number(e.target.value) || 0)} placeholder="Ποσ." />
                  <Input type="number" step="0.5" value={it.unitPrice} onChange={(e) => setItem(i, "unitPrice", Number(e.target.value) || 0)} placeholder="€/μονάδα" />
                  <span className="input flex items-center tabular-nums">{Math.round(it.quantity * it.unitPrice * 100) / 100} €</span>
                </div>
                <Button variant="danger" size="sm" onClick={() => setItems(items.filter((_, j) => j !== i))}>Αφαίρεση γραμμής</Button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setItems([...items, { type: "FINISH_APPLICATION", description: "", unit: "SQM", quantity: 0, unitPrice: 0, unitCost: 0, hoursPerUnit: 0 }])}>
              + {t("quote.addItem")}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setItems([...items, { type: "SURFACE_PREPARATION", description: "Προετοιμασία & αστάρωμα επιφανειών", unit: "SQM", quantity: 0, unitPrice: 6, unitCost: 2, hoursPerUnit: 0.25 }])}>
              + Προετοιμασία
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setItems([...items, { type: "LABOUR", description: "Εργασία — προετοιμασία χώρου & καθαρισμός", unit: "DAY", quantity: 1, unitPrice: 180, unitCost: 120, hoursPerUnit: 8 }])}>
              + Εργασία
            </Button>
          </div>
        </div>

        {/* Terms */}
        <div className="card p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={t("quote.terms")}><Textarea rows={3} value={(header.termsEl as string) ?? ""} onChange={(e) => setH("termsEl", e.target.value)} placeholder="Όροι συνεργασίας, εγγύηση 24 μηνών…" /></Field>
          <Field label={t("quote.exclusions")}><Textarea rows={3} value={(header.exclusionsEl as string) ?? ""} onChange={(e) => setH("exclusionsEl", e.target.value)} placeholder="Δεν περιλαμβάνονται: σcaffolding, οικοδομικές εργασίες…" /></Field>
          <div className="md:col-span-2"><Field label={t("quote.notes")}><Textarea rows={2} value={(header.notesEl as string) ?? ""} onChange={(e) => setH("notesEl", e.target.value)} /></Field></div>
        </div>
      </div>

      {/* Sidebar: pricing controls & totals */}
      <div className="space-y-4 lg:sticky lg:top-20">
        <div className="card p-5 space-y-4">
          <p className="eyebrow">Τιμολόγηση παραμέτρων</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("quote.wastePct")}><Input type="number" min={0} max={50} step="0.5" value={(header.wastePct as number) ?? 0} onChange={(e) => setH("wastePct", Number(e.target.value))} /></Field>
            <Field label={t("quote.markupPct")}><Input type="number" min={0} max={100} step="1" value={(header.markupPct as number) ?? 0} onChange={(e) => setH("markupPct", Number(e.target.value))} /></Field>
            <Field label={t("quote.discountPct")}><Input type="number" min={0} max={100} step="0.5" value={(header.discountPct as number) ?? 0} onChange={(e) => setH("discountPct", Number(e.target.value))} /></Field>
            <Field label={t("quote.vatRate")}><Input type="number" min={0} max={30} step="1" value={(header.vatRate as number) ?? 24} onChange={(e) => setH("vatRate", Number(e.target.value))} /></Field>
          </div>

          <div className="border-t border-line-soft pt-4 space-y-1.5 text-[13px]">
            <Row k={`${t("common.subtotal")}`} v={totals.subtotal} />
            {(Number(header.wastePct) || 0) > 0 && <Row k={`Σπατάλη (${header.wastePct}%)`} v={totals.wasteAmount} />}
            {(Number(header.discountPct) || 0) > 0 && <Row k={`Έκπτωση (−${header.discountPct}%)`} v={-totals.discountAmount} />}
            {(Number(header.markupPct) || 0) > 0 && <Row k={`Κέρδος (+${header.markupPct}%)`} v={totals.markupAmount} />}
            <Row k={t("quote.totalNet")} v={totals.totalNet} strong />
            <Row k={`ΦΠΑ ${header.vatRate}%`} v={totals.vatAmount} />
            <div className="flex justify-between border-t border-line pt-2 mt-2">
              <span className="font-semibold">{t("quote.totalGross")}</span>
              <span className="display text-xl text-clay-dark">{fmtMoney(totals.totalGross, lang)}</span>
            </div>
          </div>
        </div>

        {/* Payment schedule */}
        <div className="card p-5 space-y-3">
          <p className="eyebrow">{t("quote.paymentSchedule")}</p>
          {(header.paymentSchedule as typeof DEFAULT_SCHEDULE).map((p, i, arr) => (
            <div key={i} className="grid grid-cols-[1fr_70px_70px_28px] gap-2 items-end">
              <Input value={p.label} onChange={(e) => setSchedule(i, "label", e.target.value)} placeholder="Δόση…" className="!py-1.5 !text-[12px]" />
              <Input type="number" min={0} max={100} value={p.pct} onChange={(e) => setSchedule(i, "pct", Number(e.target.value))} className="!py-1.5 !text-[12px]" title={t("quote.schedulePct")} />
              <Input type="number" min={0} value={p.dueDays} onChange={(e) => setSchedule(i, "dueDays", Number(e.target.value))} className="!py-1.5 !text-[12px]" title={t("quote.scheduleDueDays")} />
              <Button variant="danger" size="sm" className="!px-2" onClick={() => setH("paymentSchedule", arr.filter((_, j) => j !== i))}>✕</Button>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setH("paymentSchedule", [...(header.paymentSchedule as typeof DEFAULT_SCHEDULE), { label: "", pct: 0, dueDays: 0 }])}>
              + Δόση
            </Button>
            <span className={`text-[11px] font-semibold ${(header.paymentSchedule as typeof DEFAULT_SCHEDULE).reduce((s, p) => s + p.pct, 0) === 100 ? "text-olive" : "text-rust"}`}>
              Σύνολο: {(header.paymentSchedule as typeof DEFAULT_SCHEDULE).reduce((s, p) => s + p.pct, 0)}%
            </span>
          </div>
        </div>

        {/* Internal profitability */}
        {showInternal && (
          <div className="card p-5 space-y-2 bg-parchment/60 border-dashed">
            <div className="flex justify-between items-center">
              <p className="eyebrow">{t("quote.profitability")}</p>
              <Badge tone="amber">Εσωτερικό</Badge>
            </div>
            <Row k="Εσωτερικό κόστος" v={totals.internalCost} />
            <Row k="Μικτό κέρδος" v={Math.round((totals.totalNet - totals.internalCost) * 100) / 100} />
            <div className="flex justify-between items-baseline">
              <span className="text-[13px] font-medium">Margin</span>
              <span className={`display text-lg ${totals.marginPct >= 30 ? "text-olive" : totals.marginPct >= 15 ? "text-amber-warm" : "text-rust"}`}>
                {totals.marginPct.toFixed(1)}%
              </span>
            </div>
            <p className="text-[10.5px] text-ink-faint leading-snug pt-1 border-t border-line-soft">Το εσωτερικό κόστος δεν εμφανίζεται ποτέ στον πελάτη ούτε στο PDF.</p>
          </div>
        )}
      </div>
    </div>
  );

  function setSchedule(i: number, k: string, v: unknown) {
    const arr = [...(header.paymentSchedule as { label: string; pct: number; dueDays: number }[])];
    arr[i] = { ...arr[i], [k]: v };
    setH("paymentSchedule", arr);
  }

  function Row({ k, v, strong }: { k: string; v: number; strong?: boolean }) {
    return (
      <div className="flex justify-between">
        <span className="text-ink-soft">{k}</span>
        <span className={`tabular-nums ${strong ? "font-semibold" : ""}`}>{fmtMoney(v, lang)}</span>
      </div>
    );
  }
}
