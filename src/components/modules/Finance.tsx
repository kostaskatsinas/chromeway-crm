"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Button, Badge, StatusBadge, Modal, Field, Input, Select, Tabs, EmptyState, Spinner, DebouncedSearch, useToast } from "@/components/ui";
import { ContactPicker } from "@/components/modules/Contacts";
import { useI18n, fmtMoney, fmtDate } from "@/i18n/LanguageProvider";

type InvoiceRow = {
  id: string;
  number: string;
  kind: string;
  status: string;
  issueDate: string;
  dueDate?: string | null;
  total: string;
  paidTotal: string;
  contact: { firstName: string; lastName: string };
  project?: { id?: string; code: string; name: string } | null;
};
type PaymentRow = {
  id: string;
  amount: string;
  method: string;
  paidAt: string;
  reference?: string | null;
  invoice?: { number: string } | null;
  project?: { id?: string; code: string } | null;
  contact?: { firstName: string; lastName: string } | null;
};
type ExpenseRow = {
  id: string;
  category: string;
  description: string;
  vendor?: string | null;
  amount: string;
  date: string;
  project?: { id: string; code: string } | null;
};

const EXPENSE_CATS = ["MATERIALS_EXPENSE", "SUBCONTRACTOR", "TRAVEL_EXPENSE", "ACCOMMODATION_EXPENSE", "EQUIPMENT_RENTAL", "TOOLS", "CONSUMABLES", "TRANSPORT", "PERMITS_FEES", "INSURANCE", "OFFICE_OTHER"];
const METHODS = ["BANK_TRANSFER", "WEB_BANKING", "CARD", "CASH", "CHEQUE", "OTHER_METHOD"];

/* ─────────── Invoice form ─────────── */
function InvoiceForm({ open, onClose, onSaved, presetProject }: { open: boolean; onClose: () => void; onSaved: () => void; presetProject?: { id: string; contactId: string; name: string } }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [header, setHeader] = useState<Record<string, unknown>>({ kind: "FINAL", vatRate: 24, discountAmount: 0 });
  const [items, setItems] = useState([{ description: "", quantity: 1, unitPrice: 0, unit: "PIECE" }]);
  const [projects, setProjects] = useState<{ id: string; code: string; name: string; contactId: string }[]>([]);
  const [quotes, setQuotes] = useState<{ id: string; number: string; projectName: string; contactId: string; totalGross: string; items?: never[] }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ items: typeof projects }>("/api/projects?pageSize=100").then((r) => setProjects(r.items)).catch(() => {});
    api<{ items: typeof quotes }>("/api/quotations?status=ACCEPTED").then((r) => setQuotes(r.items)).catch(() => {});
     
  }, []);

  useEffect(() => {
    if (!open) return;
    setItems([{ description: "", quantity: 1, unitPrice: 0, unit: "PIECE" }]);
    if (presetProject) setHeader({ kind: "FINAL", vatRate: 24, discountAmount: 0, projectId: presetProject.id, contactId: presetProject.contactId });
    else setHeader({ kind: "FINAL", vatRate: 24, discountAmount: 0 });
  }, [open, presetProject]);

  // Prefill items from an accepted quote
  const fillFromQuote = async (quoteId: string) => {
    if (!quoteId) return;
    try {
      const q = await api<{ contactId: string; projectName: string; quotationId?: string; id: string; items: { description: string; quantity: number; unitPrice: number; unit: string }[]; vatRate: number }>(`/api/quotations/${quoteId}`);
      setHeader((h) => ({ ...h, contactId: q.contactId, quotationId: q.id, notes: `Αντιστοιχεί στην προσφορά ${q.projectName ?? ""}`.trim(), vatRate: q.vatRate }));
      setItems(q.items.map((it) => ({ description: it.description, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice), unit: it.unit })));
    } catch (e) {
      toast(String(e), "err");
    }
  };

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const afterDiscount = Math.max(0, subtotal - Number(header.discountAmount || 0));
  const vat = Math.round(afterDiscount * (Number(header.vatRate || 24) / 100) * 100) / 100;

  return (
    <Modal open={open} onClose={onClose} title={t("fin.newInvoice")} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label={t("invoice.kind")}>
            <Select value={(header.kind as string) ?? ""} onChange={(e) => setHeader({ ...header, kind: e.target.value })} options={[{ value: "FINAL", label: t("ikind.FINAL") }, { value: "PROFORMA", label: t("ikind.PROFORMA") }, { value: "CREDIT_NOTE", label: t("ikind.CREDIT_NOTE") }]} />
          </Field>
          <Field label={t("invoice.issueDate")}><Input type="date" value={((header.issueDate as string) ?? new Date().toISOString().slice(0, 10))} onChange={(e) => setHeader({ ...header, issueDate: e.target.value })} /></Field>
          <Field label={t("invoice.dueDate")}><Input type="date" value={(header.dueDate as string) ?? ""} onChange={(e) => setHeader({ ...header, dueDate: e.target.value || null })} /></Field>
          <Field label="Έργο">
            <Select value={(header.projectId as string) ?? ""} onChange={(e) => setHeader({ ...header, projectId: e.target.value || null })} placeholder="—" options={projects.map((p) => ({ value: p.id, label: `${p.code}` }))} />
          </Field>
        </div>

        <Field label={`${t("opp.contact")} *`}>
          <ContactPicker value={(header.contactId as string) ?? ""} onChange={(v) => setHeader({ ...header, contactId: v })} />
        </Field>

        {quotes.length > 0 && (
          <Field label="Γέμισμα από αποδεκτή προσφορά">
            <Select
              value=""
              onChange={(e) => fillFromQuote(e.target.value)}
              placeholder="— Επιλογή —"
              options={quotes.map((qq) => ({ value: qq.id, label: `${qq.number} · ${qq.projectName}` }))}
            />
          </Field>
        )}

        <div className="space-y-2">
          <p className="eyebrow">{t("quote.items")}</p>
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-2 sm:grid-cols-[1fr_80px_90px_40px] gap-2 items-center">
              <Input className="col-span-2 sm:col-span-1" placeholder="Περιγραφή…" value={it.description} onChange={(e) => { const n = [...items]; n[i] = { ...it, description: e.target.value }; setItems(n); }} />
              <Input type="number" step="0.01" min={0} placeholder="Ποσ." value={it.quantity || ""} onChange={(e) => { const n = [...items]; n[i] = { ...it, quantity: Number(e.target.value) }; setItems(n); }} />
              <Input type="number" step="0.01" min={0} placeholder="€/μον." value={it.unitPrice || ""} onChange={(e) => { const n = [...items]; n[i] = { ...it, unitPrice: Number(e.target.value) }; setItems(n); }} />
              <Button variant="danger" size="sm" className="!px-2 max-sm:col-span-2" onClick={() => setItems(items.filter((_, j) => j !== i))}>✕</Button>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={() => setItems([...items, { description: "", quantity: 1, unitPrice: 0, unit: "PIECE" }])}>+ Γραμμή</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-line-soft pt-3">
          <Field label={`${t("common.subtotal")} €`} ><Input disabled readOnly className="tabular-nums bg-parchment/50" value={subtotal.toFixed(2)} /></Field>
          <Field label="Έκπτωση €"><Input type="number" min={0} step="0.5" value={(header.discountAmount as number) ?? 0} onChange={(e) => setHeader({ ...header, discountAmount: Number(e.target.value) })} /></Field>
          <Field label={`ΦΠΑ % (${vat.toFixed(2)} €)`}><Input type="number" min={0} max={30} step="1" value={(header.vatRate as number) ?? 24} onChange={(e) => setHeader({ ...header, vatRate: Number(e.target.value) })} /></Field>
        </div>
        <div className="text-right">
          <span className="eyebrow mr-3">{t("common.total")}</span>
          <span className="display text-2xl text-clay-dark">{fmtMoney(Math.round((afterDiscount + vat) * 100) / 100)}</span>
        </div>

        <div className="flex justify-end border-t border-line-soft pt-3">
          <Button
            disabled={busy}
            onClick={async () => {
              if (!header.contactId || items.some((it) => !it.description)) {
                toast("Συμπληρώστε επαφή και γραμμές", "err");
                return;
              }
              setBusy(true);
              try {
                await api("/api/invoices", { body: { ...header, dueDate: header.dueDate || null, items: items.filter((i) => i.description), projectId: (header.projectId as string) || null } });
                toast(t("common.savedOk"));
                onSaved();
                onClose();
              } catch (e) {
                toast(String(e), "err");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "…" : `${t("common.save")} & Έκδοση`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─────────── Payment modal ─────────── */
function PaymentModal({ invoice, onClose, onDone }: { invoice: InvoiceRow; onClose: () => void; onDone: () => void }) {
  const { t } = useI18n();
  const balance = Number(invoice.total) - Number(invoice.paidTotal);
  const [form, setForm] = useState({ amount: Math.round(balance * 100) / 100, method: "BANK_TRANSFER", paidAt: new Date().toISOString().slice(0, 10), reference: "" });

  return (
    <Modal open onClose={onClose} title={`Εισπραξη — ${invoice.number}`}>
      <div className="space-y-3">
        <p className="text-[13px] text-ink-soft">Σύνολο {fmtMoney(invoice.total)} · Εισπραχθέν {fmtMoney(invoice.paidTotal)} · Υπόλοιπο <b>{fmtMoney(balance)}</b></p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={`${t("common.amount")} €`} required><Input required type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} /></Field>
          <Field label={t("payment.method")}>
            <Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} options={METHODS.map((m) => ({ value: m, label: t(`paymethod.${m}`) }))} />
          </Field>
          <Field label={t("common.date")}><Input type="date" value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} /></Field>
          <Field label={t("payment.reference")}><Input placeholder="IBAN / αριθμός επιταγής…" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></Field>
        </div>
        <div className="flex justify-end">
          <Button onClick={async () => {
            await api("/api/payments", { body: { invoiceId: invoice.id, amount: form.amount, method: form.method, paidAt: new Date(form.paidAt).toISOString(), reference: form.reference || null, contactId: null } });
            t("");
            onDone();
            onClose();
          }}>{t("common.save")}</Button>
        </div>
      </div>
    </Modal>
  );
}

export function FinanceTabs({
  initialTab = "invoices",
  initialOpen,
  initialNew = false,
  initialStatus,
}: {
  initialTab?: "invoices" | "payments" | "expenses";
  initialOpen?: string;
  initialNew?: boolean;
  initialStatus?: string;
}) {
  const { t, lang } = useI18n();
  const [tab, setTab] = useState<"invoices" | "payments" | "expenses">(initialTab);
  const [invoices, setInvoices] = useState<InvoiceRow[] | null>(null);
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRow[] | null>(null);
  const [invOpen, setInvOpen] = useState(false);
  const [payFor, setPayFor] = useState<InvoiceRow | null>(null);
  const [expOpen, setExpOpen] = useState(false);
  const [expDraft, setExpDraft] = useState<Record<string, unknown>>({ category: "MATERIALS_EXPENSE", date: new Date().toISOString().slice(0, 10), paid: true });
  const [projects, setProjects] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState(initialStatus ?? "");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(initialOpen);

  const loadInv = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (invoiceQuery) params.set("q", invoiceQuery);
      if (invoiceStatus) params.set("status", invoiceStatus);
      const res = await api<{ items: InvoiceRow[] }>(`/api/invoices?${params}`);
      setInvoices(res.items);
    } catch {
      setInvoices([]);
    }
  }, [invoiceQuery, invoiceStatus]);
  const loadPay = useCallback(() => api<{ items: PaymentRow[] }>("/api/payments?pageSize=150").then((r) => setPayments(r.items)).catch(() => setPayments([])), []);
  const loadExp = useCallback(() => api<{ items: ExpenseRow[] }>("/api/expenses?pageSize=150").then((r) => setExpenses(r.items)).catch(() => setExpenses([])), []);

  useEffect(() => {
    if (tab === "invoices") loadInv();
    else if (tab === "payments") loadPay();
    else loadExp();
  }, [tab, loadInv, loadPay, loadExp]);

  useEffect(() => {
    if (tab === "expenses") {
      api<{ items: Array<{ id: string; code: string; name: string }> }>("/api/projects?pageSize=100")
        .then((response) => setProjects(response.items))
        .catch(() => setProjects([]));
    }
  }, [tab]);

  useEffect(() => {
    if (initialNew) {
      if (initialTab === "expenses") setExpOpen(true);
      if (initialTab === "invoices") setInvOpen(true);
    }
  }, [initialNew, initialTab]);

  useEffect(() => {
    if (!selectedInvoiceId || !invoices) return;
    document.getElementById(`invoice-${selectedInvoiceId}`)?.scrollIntoView({ block: "center" });
  }, [invoices, selectedInvoiceId]);

  const changeTab = (next: string) => {
    const valid = next as "invoices" | "payments" | "expenses";
    setTab(valid);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", valid);
    url.searchParams.delete("open");
    url.searchParams.delete("new");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  };

  return (
    <div className="space-y-4">
      <Tabs tabs={[{ key: "invoices", label: t("fin.invoices"), count: invoices?.length }, { key: "payments", label: t("fin.payments") }, { key: "expenses", label: t("fin.expenses") }]} active={tab} onChange={changeTab} />

      {/* Invoices */}
      {tab === "invoices" && (
        <>
          <InvoiceForm open={invOpen} onClose={() => setInvOpen(false)} onSaved={loadInv} />
          {payFor && <PaymentModal invoice={payFor} onClose={() => setPayFor(null)} onDone={loadInv} />}
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-64"><DebouncedSearch onSearch={setInvoiceQuery} placeholder="Αναζήτηση τιμολογίου…" /></div>
            <Select
              className="w-auto"
              value={invoiceStatus}
              onChange={(event) => {
                const next = event.target.value;
                setInvoiceStatus(next);
                const url = new URL(window.location.href);
                if (next) url.searchParams.set("status", next);
                else url.searchParams.delete("status");
                window.history.replaceState({}, "", `${url.pathname}${url.search}`);
              }}
              placeholder={t("common.status")}
              options={["ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"].map((status) => ({ value: status, label: t(`istatus.${status}`) }))}
            />
            <div className="flex-1" />
            <Button onClick={() => setInvOpen(true)}>+ {t("fin.newInvoice")}</Button>
          </div>
          {!invoices ? (
            <Spinner />
          ) : invoices.length === 0 ? (
            <EmptyState icon="€" title="Κανένα τιμολόγιο" hint="Εκδώστε pro forma ή τελικά τιμολόγια με ελληνικό ΦΠΑ και αυτόματη αρίθμηση CW-INV-2026-XXXX." />
          ) : (
            <div className="card overflow-x-auto">
              <table className="table-base min-w-[820px]">
                <thead>
                  <tr>
                    <th>Αριθμός</th>
                    <th>Τύπος</th>
                    <th>Πελάτης</th>
                    <th>Έκδοση</th>
                    <th>Λήξη</th>
                    <th>Σύνολο</th>
                    <th>Υπόλοιπο</th>
                    <th>{t("common.status")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const balance = Number(inv.total) - Number(inv.paidTotal);
                    return (
                      <tr
                        id={`invoice-${inv.id}`}
                        key={inv.id}
                        className={selectedInvoiceId === inv.id ? "bg-clay-soft/60" : ""}
                        onClick={() => setSelectedInvoiceId(inv.id)}
                      >
                        <td className="font-semibold whitespace-nowrap">
                          {inv.number}
                          {inv.project && <span className="block text-[10.5px] text-clay font-normal">{inv.project.code}</span>}
                        </td>
                        <td><Badge tone={inv.kind === "PROFORMA" ? "slate" : "neutral"}>{t(`ikind.${inv.kind}`)}</Badge></td>
                        <td>{inv.contact.firstName} {inv.contact.lastName}</td>
                        <td>{fmtDate(inv.issueDate, lang)}</td>
                        <td className={inv.status === "OVERDUE" ? "text-rust font-medium" : ""}>{fmtDate(inv.dueDate, lang)}</td>
                        <td className="tabular-nums whitespace-nowrap">{fmtMoney(inv.total, lang)}</td>
                        <td className={`tabular-nums whitespace-nowrap ${balance > 0 ? "font-semibold" : "text-ink-faint"}`}>{balance > 0 ? fmtMoney(balance, lang) : "✓"}</td>
                        <td><StatusBadge status={inv.status} label={t(`istatus.${inv.status}`)} /></td>
                        <td>
                          <div className="flex gap-1 justify-end">
                            {balance > 0 && !["CANCELLED"].includes(inv.status) && (
                              <Button size="sm" onClick={() => setPayFor(inv)}>Εισπραξη</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Payments */}
      {tab === "payments" && (
        <>
          {!payments ? (
            <Spinner />
          ) : payments.length === 0 ? (
            <EmptyState title="Καμία πληρωμή" icon="✓" />
          ) : (
            <div className="card overflow-x-auto">
              <table className="table-base min-w-[640px]">
                <thead>
                  <tr><th>{t("common.date")}</th><th>Τιμολόγιο / Έργο</th><th>Πελάτης</th><th>{t("payment.method")}</th><th>{t("payment.reference")}</th><th>{t("common.amount")}</th></tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{fmtDate(p.paidAt, lang)}</td>
                      <td className="whitespace-nowrap">{[p.invoice?.number, p.project?.code].filter(Boolean).join(" · ") || "—"}</td>
                      <td>{p.contact ? `${p.contact.firstName} ${p.contact.lastName}` : "—"}</td>
                      <td><Badge tone="clay">{t(`paymethod.${p.method}`)}</Badge></td>
                      <td className="max-w-[160px] truncate">{p.reference ?? "—"}</td>
                      <td className="tabular-nums font-medium whitespace-nowrap text-olive">+{fmtMoney(p.amount, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Expenses */}
      {tab === "expenses" && (
        <>
          {expOpen && (
            <div className="card p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label={t("common.category")}><Select value={(expDraft.category as string) ?? ""} onChange={(e) => setExpDraft({ ...expDraft, category: e.target.value })} options={EXPENSE_CATS.map((c) => ({ value: c, label: t(`expcat.${c}`) }))} /></Field>
              <Field label={t("common.description")}><Input value={(expDraft.description as string) ?? ""} onChange={(e) => setExpDraft({ ...expDraft, description: e.target.value })} /></Field>
              <Field label={`${t("common.amount")} €`}><Input type="number" min={0} step="0.5" value={(expDraft.amount as number) ?? ""} onChange={(e) => setExpDraft({ ...expDraft, amount: Number(e.target.value) })} /></Field>
              <Field label={t("expense.vendor")}><Input value={(expDraft.vendor as string) ?? ""} onChange={(e) => setExpDraft({ ...expDraft, vendor: e.target.value })} /></Field>
              <Field label={t("common.date")}><Input type="date" value={(expDraft.date as string) ?? ""} onChange={(e) => setExpDraft({ ...expDraft, date: e.target.value })} /></Field>
              <Field label="Έργο">
                <Select value={(expDraft.projectId as string) ?? ""} onChange={(e) => setExpDraft({ ...expDraft, projectId: e.target.value || null })} placeholder="—" options={projects.map((project) => ({ value: project.id, label: `${project.code} · ${project.name}` }))} />
              </Field>
              <div className="flex items-end gap-2">
                <Button size="sm" onClick={async () => {
                  if (!expDraft.description || !expDraft.amount) return;
                  await api("/api/expenses", { body: expDraft });
                  setExpOpen(false);
                  setExpDraft({ category: "MATERIALS_EXPENSE", date: new Date().toISOString().slice(0, 10), paid: true });
                  loadExp();
                }}>{t("common.save")}</Button>
                <Button size="sm" variant="secondary" onClick={() => setExpOpen(false)}>{t("common.cancel")}</Button>
              </div>
            </div>
          )}
          <div className="flex justify-end"><Button onClick={() => setExpOpen(!expOpen)}>+ Έξοδο</Button></div>
          {!expenses ? (
            <Spinner />
          ) : expenses.length === 0 ? (
            <EmptyState title="Κανένας δαπάνη" icon="−" />
          ) : (
            <div className="card overflow-x-auto">
              <table className="table-base min-w-[640px]">
                <thead><tr><th>{t("common.date")}</th><th>{t("common.category")}</th><th>Περιγραφή</th><th>Δικαιούχος</th><th>Έργο</th><th>{t("common.amount")}</th></tr></thead>
                <tbody>
                  {expenses.map((x) => (
                    <tr key={x.id}>
                      <td>{fmtDate(x.date, lang)}</td>
                      <td><Badge tone="amber">{t(`expcat.${x.category}`)}</Badge></td>
                      <td>{x.description}</td>
                      <td>{x.vendor ?? "—"}</td>
                      <td>{x.project ? <Link href={`/projects/${x.project.id}`} className="text-clay">{x.project.code}</Link> : "—"}</td>
                      <td className="tabular-nums font-medium whitespace-nowrap text-rust">−{fmtMoney(x.amount, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
