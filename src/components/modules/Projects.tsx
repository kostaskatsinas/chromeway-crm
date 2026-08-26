"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { Button, Badge, StatusBadge, Select, EmptyState, DebouncedSearch, Spinner, useToast } from "@/components/ui";
import { useI18n, fmtMoney } from "@/i18n/LanguageProvider";
import { BulkActionBar, TableViewControls, useTablePreferences, type TableColumn } from "@/components/DataTableControls";
import { downloadCsv } from "@/lib/client-csv";

export type ProjectRow = {
  id: string;
  code: string;
  name: string;
  status: string;
  contractValue: string | number;
  city?: string | null;
  startDate?: string | null;
  plannedEndDate?: string | null;
  progressPct: number;
  contact: { firstName: string; lastName: string };
  manager?: { firstName: string; lastName: string } | null;
};

const PROJECT_STATUSES = ["PLANNING", "SCHEDULED", "IN_PROGRESS", "ON_HOLD_PROJECT", "QUALITY_CONTROL", "COMPLETED", "CANCELLED"];
const PROJECT_COLUMNS: TableColumn[] = [
  { key: "code", label: "Κωδικός", locked: true },
  { key: "project", label: "Έργο" },
  { key: "contact", label: "Πελάτης" },
  { key: "status", label: "Κατάσταση" },
  { key: "progress", label: "Πρόοδος" },
  { key: "plannedEnd", label: "Προβλεπόμενη λήξη" },
  { key: "value", label: "Αξία" },
];

export function ProjectsTable({ canSeeMoney, canEdit }: { canSeeMoney: boolean; canEdit: boolean }) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState<ProjectRow[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [delayedOnly, setDelayedOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const table = useTablePreferences("crm.projects.table", PROJECT_COLUMNS);
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("status")) setStatus(params.get("status") ?? "");
    if (params.get("view") === "delayed") setDelayedOnly(true);
  }, []);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ pageSize: "100" });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    try {
      const res = await api<{ items: ProjectRow[] }>(`/api/projects?${params}`);
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

  const displayedRows = (rows ?? []).filter((project) => {
    if (!delayedOnly) return true;
    return Boolean(project.plannedEndDate && new Date(project.plannedEndDate) < new Date() && !["COMPLETED", "CANCELLED"].includes(project.status));
  });

  const updateUrl = (updates: Record<string, string | null>) => {
    const url = new URL(window.location.href);
    Object.entries(updates).forEach(([key, value]) => value ? url.searchParams.set(key, value) : url.searchParams.delete(key));
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  };
  const selectedRows = displayedRows.filter((project) => selected.has(project.id));
  const allVisibleSelected = displayedRows.length > 0 && displayedRows.every((project) => selected.has(project.id));

  const applyBulkStatus = async () => {
    if (!bulkStatus || selected.size === 0) return;
    setBulkBusy(true);
    try {
      await Promise.all([...selected].map((id) => api(`/api/projects/${id}`, { method: "PATCH", body: { status: bulkStatus } })));
      toast("Τα έργα ενημερώθηκαν");
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
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64"><DebouncedSearch onSearch={setQ} placeholder={`${t("common.search")}…`} /></div>
        <select className="select w-auto" value={status} onChange={(e) => { setStatus(e.target.value); updateUrl({ status: e.target.value || null }); }}>
          <option value="">{t("common.status")}</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>{t(`pstatus.${s}`)}</option>
          ))}
        </select>
        <Button
          variant={delayedOnly ? "secondary" : "ghost"}
          size="sm"
          aria-pressed={delayedOnly}
          onClick={() => { const next = !delayedOnly; setDelayedOnly(next); updateUrl({ view: next ? "delayed" : null }); }}
        >Καθυστερημένα</Button>
        <div className="flex-1" />
        <TableViewControls columns={PROJECT_COLUMNS.filter((column) => column.key !== "value" || canSeeMoney)} visible={table.visible} onToggleColumn={table.toggleColumn} density={table.density} onDensity={table.setDensity} />
        {canEdit && <Button onClick={() => router.push("/projects/new")}>+ Νέο έργο</Button>}
      </div>

      <BulkActionBar count={selected.size} onClear={() => setSelected(new Set())}>
        <Button variant="secondary" size="sm" onClick={() => downloadCsv("projects-selected.csv", [
          ["Κωδικός", "Έργο", "Πελάτης", "Κατάσταση", "Πρόοδος", "Λήξη", ...(canSeeMoney ? ["Αξία"] : [])],
          ...selectedRows.map((project) => [project.code, project.name, `${project.contact.firstName} ${project.contact.lastName}`, t(`pstatus.${project.status}`), `${project.progressPct}%`, project.plannedEndDate ? new Date(project.plannedEndDate).toLocaleDateString("el-GR") : "", ...(canSeeMoney ? [String(project.contractValue)] : [])]),
        ])}>⇩ CSV</Button>
        {canEdit && <>
          <Select className="!w-auto" value={bulkStatus} onChange={(event) => setBulkStatus(event.target.value)} placeholder="Νέα κατάσταση" options={PROJECT_STATUSES.map((projectStatus) => ({ value: projectStatus, label: t(`pstatus.${projectStatus}`) }))} />
          <Button size="sm" disabled={!bulkStatus || bulkBusy} onClick={applyBulkStatus}>{bulkBusy ? "Ενημέρωση…" : "Εφαρμογή"}</Button>
        </>}
      </BulkActionBar>

      {!rows ? (
        <Spinner />
      ) : displayedRows.length === 0 ? (
        <EmptyState title="Κανένα έργα" icon="▦" hint="Τα έργα δημιουργούνται αυτόματα όταν ο πελάτης αποδέχεται προσφορά μέσω ασφαλούς συνδέσμου — ή χειροκίνητα εδώ." />
      ) : (
        <div className="card overflow-x-auto">
          <table className={`table-base min-w-[860px] ${table.density === "compact" ? "table-compact" : ""}`}>
            <thead>
              <tr>
                <th className="w-10"><input type="checkbox" aria-label="Επιλογή όλων των έργων" checked={allVisibleSelected} onChange={(event) => setSelected(event.target.checked ? new Set(displayedRows.map((row) => row.id)) : new Set())} className="accent-[var(--color-clay)]" /></th>
                {table.isVisible("code") && <th>{t("project.code")}</th>}
                {table.isVisible("project") && <th>Έργο</th>}
                {table.isVisible("contact") && <th>{t("opp.contact")}</th>}
                {table.isVisible("status") && <th>{t("common.status")}</th>}
                {table.isVisible("progress") && <th>{t("project.progress")}</th>}
                {table.isVisible("plannedEnd") && <th>{t("project.plannedEnd")}</th>}
                {canSeeMoney && table.isVisible("value") && <th>{t("project.contractValue")}</th>}
              </tr>
            </thead>
            <tbody>
              {displayedRows.map((p) => {
                const delayed = p.plannedEndDate && new Date(p.plannedEndDate) < new Date() && !["COMPLETED", "CANCELLED"].includes(p.status);
                return (
                  <tr key={p.id} className={`cursor-pointer ${selected.has(p.id) ? "row-selected" : ""}`} onClick={() => router.push(`/projects/${p.id}`)}>
                    <td onClick={(event) => event.stopPropagation()}><input type="checkbox" aria-label={`Επιλογή ${p.code}`} checked={selected.has(p.id)} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(p.id); else next.delete(p.id); return next; })} className="accent-[var(--color-clay)]" /></td>
                    {table.isVisible("code") && <td><Link href={`/projects/${p.id}`} className="font-semibold hover:text-clay">{p.code}</Link></td>}
                    {table.isVisible("project") && <td>
                      <span className="block font-medium">{p.name}</span>
                      <span className="block text-[11px] text-ink-faint">{[p.city, p.manager ? `PM: ${p.manager.firstName}` : null].filter(Boolean).join(" · ")}</span>
                    </td>}
                    {table.isVisible("contact") && <td>{p.contact.firstName} {p.contact.lastName}</td>}
                    {table.isVisible("status") && <td><StatusBadge status={p.status} label={t(`pstatus.${p.status}`)} /></td>}
                    {table.isVisible("progress") && <td>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 bg-parchment rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${delayed ? "bg-rust" : "bg-clay"}`} style={{ width: `${p.progressPct}%` }} />
                        </div>
                        <span className="text-[11px] text-ink-faint tabular-nums">{p.progressPct}%</span>
                      </div>
                    </td>}
                    {table.isVisible("plannedEnd") && <td>
                      {p.plannedEndDate ? new Date(p.plannedEndDate).toLocaleDateString("el-GR") : "—"}
                      {delayed && <Badge tone="rust">καθυστέρηση</Badge>}
                    </td>}
                    {canSeeMoney && table.isVisible("value") && <td className="tabular-nums whitespace-nowrap">{fmtMoney(p.contractValue, lang)}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
