"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Button, Select, StatusBadge, EmptyState, DebouncedSearch, Spinner, useToast } from "@/components/ui";
import { useI18n, fmtMoney, fmtDate } from "@/i18n/LanguageProvider";
import { BulkActionBar, TableViewControls, useTablePreferences, type TableColumn } from "@/components/DataTableControls";
import { downloadCsv } from "@/lib/client-csv";

const QUOTE_STATUSES = ["DRAFT", "SENT", "VIEWED", "ACCEPTED", "REJECTED", "EXPIRED"];
const BULK_QUOTE_STATUSES = ["EXPIRED"];
const QUOTE_COLUMNS: TableColumn[] = [
  { key: "number", label: "Αριθμός", locked: true },
  { key: "project", label: "Έργο" },
  { key: "contact", label: "Πελάτης" },
  { key: "date", label: "Ημερομηνία" },
  { key: "total", label: "Σύνολο" },
  { key: "status", label: "Κατάσταση" },
];

export type QuoteListRow = {
  id: string;
  number: string;
  version: number;
  status: string;
  projectName: string;
  totalGross: string;
  issueDate?: string;
  sentAt?: string | null;
  contact: { firstName: string; lastName: string };
};

export function QuotesTable() {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState<QuoteListRow[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const table = useTablePreferences("crm.quotes.table", QUOTE_COLUMNS);

  useEffect(() => {
    const requestedStatus = new URLSearchParams(window.location.search).get("status");
    if (requestedStatus) setStatus(requestedStatus);
  }, []);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ pageSize: "150" });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    try {
      const res = await api<{ items: QuoteListRow[] }>(`/api/quotations?${params}`);
      setRows(res.items);
    } catch {
      setRows([]);
    }
     
  }, [q, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const available = new Set((rows ?? []).map((row) => row.id));
    setSelected((current) => new Set([...current].filter((id) => available.has(id))));
  }, [rows]);

  const visibleRows = rows ?? [];
  const selectedRows = visibleRows.filter((quote) => selected.has(quote.id));
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((quote) => selected.has(quote.id));
  const applyBulkStatus = async () => {
    if (!bulkStatus || selected.size === 0) return;
    setBulkBusy(true);
    try {
      await Promise.all([...selected].map((id) => api(`/api/quotations/${id}`, { method: "PATCH", body: { status: bulkStatus } })));
      toast("Οι προσφορές ενημερώθηκαν");
      setSelected(new Set());
      setBulkStatus("");
      await load();
    } catch (error) {
      toast(String((error as Error).message), "err");
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="w-full sm:w-64"><DebouncedSearch onSearch={setQ} placeholder={`${t("common.search")}…`} /></div>
        <select className="select w-auto" value={status} onChange={(e) => {
          const next = e.target.value;
          setStatus(next);
          const url = new URL(window.location.href);
          if (next) url.searchParams.set("status", next);
          else url.searchParams.delete("status");
          window.history.replaceState({}, "", `${url.pathname}${url.search}`);
        }}>
          <option value="">{t("common.status")}</option>
          {QUOTE_STATUSES.map((s) => (
            <option key={s} value={s}>{t(`qstatus.${s}`)}</option>
          ))}
        </select>
        <div className="flex-1" />
        <TableViewControls columns={QUOTE_COLUMNS} visible={table.visible} onToggleColumn={table.toggleColumn} density={table.density} onDensity={table.setDensity} />
        <Link href="/quotes/new" className="btn btn-primary">+ {t("quote.newQuote")}</Link>
      </div>

      <BulkActionBar count={selected.size} onClear={() => setSelected(new Set())}>
        <Button variant="secondary" size="sm" onClick={() => downloadCsv("quotes-selected.csv", [
          ["Αριθμός", "Έργο", "Πελάτης", "Ημερομηνία", "Σύνολο", "Κατάσταση"],
          ...selectedRows.map((quote) => [quote.number, quote.projectName, `${quote.contact.firstName} ${quote.contact.lastName}`, fmtDate(quote.sentAt ?? quote.issueDate, lang), String(quote.totalGross), t(`qstatus.${quote.status}`)]),
        ])}>⇩ CSV</Button>
        <Select className="!w-auto" value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)} placeholder="Μαζική ενέργεια" options={BULK_QUOTE_STATUSES.map((quoteStatus) => ({ value: quoteStatus, label: `Σήμανση: ${t(`qstatus.${quoteStatus}`)}` }))} />
        <Button size="sm" disabled={!bulkStatus || bulkBusy} onClick={applyBulkStatus}>{bulkBusy ? "Ενημέρωση…" : "Εφαρμογή"}</Button>
      </BulkActionBar>

      {!rows ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title="Καμία προσφορά" icon="▤" hint="Δημιουργήστε την πρώτη επαγγελματική προσφορά με αναλυτικότητα m², φινιρίσματα και πρόγραμμα πληρωμών." />
      ) : (
        <div className="card overflow-x-auto">
          <table className={`table-base min-w-[820px] ${table.density === "compact" ? "table-compact" : ""}`}>
            <thead>
              <tr>
                <th className="w-10"><input type="checkbox" aria-label="Επιλογή όλων των προσφορών" checked={allVisibleSelected} onChange={(event) => setSelected(event.target.checked ? new Set(visibleRows.map((row) => row.id)) : new Set())} className="accent-[var(--color-clay)]" /></th>
                {table.isVisible("number") && <th>{t("quote.number")}</th>}
                {table.isVisible("project") && <th>{t("opp.projectName")}</th>}
                {table.isVisible("contact") && <th>{t("opp.contact")}</th>}
                {table.isVisible("date") && <th>{t("common.date")}</th>}
                {table.isVisible("total") && <th>{t("quote.totalGross")}</th>}
                {table.isVisible("status") && <th>{t("common.status")}</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={selected.has(r.id) ? "row-selected" : ""}>
                  <td><input type="checkbox" aria-label={`Επιλογή ${r.number}`} checked={selected.has(r.id)} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(r.id); else next.delete(r.id); return next; })} className="accent-[var(--color-clay)]" /></td>
                  {table.isVisible("number") && <td><Link href={`/quotes/${r.id}`} className="font-semibold hover:text-clay">{r.number}</Link> <span className="text-ink-faint">v{r.version}</span></td>}
                  {table.isVisible("project") && <td>{r.projectName}</td>}
                  {table.isVisible("contact") && <td>{r.contact.firstName} {r.contact.lastName}</td>}
                  {table.isVisible("date") && <td>{fmtDate(r.sentAt ?? r.issueDate, lang)}</td>}
                  {table.isVisible("total") && <td className="tabular-nums whitespace-nowrap">{fmtMoney(r.totalGross, lang)}</td>}
                  {table.isVisible("status") && <td><StatusBadge status={r.status} label={t(`qstatus.${r.status}`)} /></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
