"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { Button, Badge, StatusBadge, Field, Input, Select, Textarea, Checkbox, Modal, Spinner, useToast, Avatar, EmptyState } from "@/components/ui";
import { TaskBoard } from "@/components/modules/Tasks";
import { FileGallery } from "@/components/modules/FileGallery";
import { ActivityTimeline } from "@/components/modules/Timeline";
import { useI18n, fmtMoney } from "@/i18n/LanguageProvider";

const STATUSES = ["PLANNING", "SCHEDULED", "IN_PROGRESS", "ON_HOLD_PROJECT", "QUALITY_CONTROL", "COMPLETED", "CANCELLED"];
const EXPENSE_CATS = ["MATERIALS_EXPENSE", "SUBCONTRACTOR", "TRAVEL_EXPENSE", "ACCOMMODATION_EXPENSE", "EQUIPMENT_RENTAL", "TOOLS", "CONSUMABLES", "TRANSPORT", "PERMITS_FEES", "INSURANCE", "OFFICE_OTHER"];

type QcItem = { item: string; done: boolean; note?: string };

export type ProjectDetailData = {
  id: string;
  code: string;
  name: string;
  status: string;
  contractValue: string;
  estimatedCost: string;
  estimatedHours: number;
  address?: string | null;
  city?: string | null;
  scopeDescription?: string | null;
  startDate?: string | null;
  plannedEndDate?: string | null;
  actualEndDate?: string | null;
  progressPct: number;
  qcChecklist: QcItem[];
  customerApproved: boolean;
  notes?: string | null;
  contactId: string;
  contactName: string;
  managerUserId?: string | null;
  teamUserIds: string[];
};

export function ProjectDetail({
  data,
  users,
  canSeeMoney,
  canEditProject,
  canEditTasks,
  currentUserId,
  initialTab = "overview",
}: {
  data: ProjectDetailData;
  users: { id: string; firstName: string; lastName: string; color: string }[];
  canSeeMoney: boolean;
  canEditProject: boolean;
  canEditTasks: boolean;
  currentUserId: string;
  initialTab?: string;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const availableTabs = ["overview", "tasks", "logs", "extras", "photos", ...(canSeeMoney ? ["finance"] : []), "timeline"];
  const [tab, setTab] = useState(availableTabs.includes(initialTab) ? initialTab : "overview");
  const [form, setForm] = useState({ ...data, qcChecklist: data.qcChecklist ?? [] });
  const [busy, setBusy] = useState(false);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  const changeTab = (next: string) => {
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  };

  const saveHeader = async () => {
    if (!canEditProject) return;
    setBusy(true);
    try {
      await api(`/api/projects/${data.id}`, { method: "PATCH", body: form });
      toast(t("common.savedOk"));
      router.refresh();
    } catch (e) {
      toast(String(e), "err");
    } finally {
      setBusy(false);
    }
  };

  const toggleQc = async (i: number) => {
    const next = form.qcChecklist.map((q, j) => (j === i ? { ...q, done: !q.done } : q));
    setForm({ ...form, qcChecklist: next });
    const allDone = next.every((q) => q.done);
    await api(`/api/projects/${data.id}`, {
      method: "PATCH",
      body: { qcChecklist: next, ...(allDone && !form.customerApproved ? { status: form.status === "QUALITY_CONTROL" ? form.status : form.status } : {}) },
    });
    router.refresh();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="sticky top-14 z-30 -mx-4 lg:-mx-6 px-4 lg:px-6 py-3 bg-paper/95 backdrop-blur border-b border-line-soft flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">{data.code} · <Link href={`/contacts/${data.contactId}`} className="hover:text-clay underline-offset-2 hover:underline">{data.contactName}</Link></p>
          <h1 className="display text-3xl mt-0.5">{data.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden md:block w-32">
            <div className="flex justify-between text-[10px] text-ink-faint mb-1"><span>Πρόοδος</span><span>{form.progressPct}%</span></div>
            <div className="h-1.5 bg-parchment rounded-full overflow-hidden"><div className="h-full bg-clay rounded-full" style={{ width: `${form.progressPct}%` }} /></div>
          </div>
          {form.plannedEndDate && <span className="hidden sm:inline text-[11px] text-ink-faint">Λήξη {new Date(form.plannedEndDate).toLocaleDateString("el-GR")}</span>}
          <Button variant="ghost" size="sm" onClick={() => changeTab("tasks")}>✓ Εργασίες</Button>
          <Button variant="ghost" size="sm" onClick={() => changeTab("photos")}>▧ Φωτογραφίες</Button>
        {canEditProject ? <Select
          className="w-auto"
          value={form.status}
          onChange={async (e) => {
            const status = e.target.value;
            set("status", status);
            await api(`/api/projects/${data.id}`, {
              method: "PATCH",
              body: {
                status,
                ...(status === "COMPLETED" ? { actualEndDate: new Date().toISOString() } : {}),
                ...(status === "IN_PROGRESS" && !form.startDate ? { startDate: new Date().toISOString() } : {}),
              },
            });
            router.refresh();
          }}
          options={STATUSES.map((s) => ({ value: s, label: t(`pstatus.${s}`) }))}
        /> : <StatusBadge status={form.status} label={t(`pstatus.${form.status}`)} />}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-line-soft overflow-x-auto">
        {[["overview", "Επισκόπηση"], ["tasks", "Εργασίες"], ["logs", "Ημερολόγιο εργασιών"], ["extras", "Πρόσθετες εργασίες"], ["photos", "Φωτογραφίες"], ...(canSeeMoney ? [["finance", "Οικονομικά"]] : []), ["timeline", "Χρονολόγιο"]].map(([key, label]) => (
          <button key={key} onClick={() => changeTab(key)} className={`px-4 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 -mb-px ${tab === key ? "border-clay text-clay-dark" : "border-transparent text-ink-faint hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="card p-5 space-y-4 lg:col-span-2">
            <Field label={t("project.scope")}>
              <Textarea disabled={!canEditProject} rows={3} value={(form.scopeDescription as string) ?? ""} onChange={(e) => set("scopeDescription", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label={t("project.startDate")}><Input disabled={!canEditProject} type="date" value={(form.startDate as string)?.slice(0, 10) ?? ""} onChange={(e) => set("startDate", e.target.value || null)} /></Field>
              <Field label={t("project.plannedEnd")}><Input disabled={!canEditProject} type="date" value={(form.plannedEndDate as string)?.slice(0, 10) ?? ""} onChange={(e) => set("plannedEndDate", e.target.value || null)} /></Field>
              <Field label={t("project.manager")}>
                <Select disabled={!canEditProject} value={(form.managerUserId as string) ?? ""} onChange={(e) => set("managerUserId", e.target.value || null)} placeholder="—" options={users.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))} />
              </Field>
              <Field label={`${t("project.progress")}: ${form.progressPct}%`}>
                <input disabled={!canEditProject} type="range" min={0} max={100} step={5} value={form.progressPct} onChange={(e) => set("progressPct", Number(e.target.value))} className="w-full accent-[var(--color-clay)] mt-2" />
              </Field>
            </div>
            <Field label={t("common.notes")}><Textarea disabled={!canEditProject} rows={2} value={(form.notes as string) ?? ""} onChange={(e) => set("notes", e.target.value)} /></Field>
            {canEditProject && <Button size="sm" onClick={saveHeader} disabled={busy}>{busy ? t("common.saving") : t("common.save")}</Button>}
          </div>

          <div className="card p-5">
            <p className="eyebrow mb-3">{t("project.qcChecklist")}</p>
            <ul className="space-y-2.5">
              {form.qcChecklist.map((qc, i) => (
                <li key={i}>
                  <Checkbox disabled={!canEditProject} checked={!!qc.done} onChange={() => toggleQc(i)} label={qc.item} />
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-3 border-t border-line-soft">
              <Checkbox
                checked={form.customerApproved}
                disabled={!canEditProject}
                onChange={async (e) => {
                  set("customerApproved", e.target.checked);
                  await api(`/api/projects/${data.id}`, { method: "PATCH", body: { customerApproved: e.target.checked, ...(e.target.checked ? {} : {}) } });
                  router.refresh();
                }}
                label={`✓ ${t("project.customerApproved")}`}
              />
            </div>
          </div>
        </div>
      )}

      {tab === "tasks" && <TaskBoard fixedProjectId={data.id} currentUserId={currentUserId} canEdit={canEditTasks} />}
      {tab === "logs" && <WorkLogs projectId={data.id} team={users} canEdit={canEditTasks} />}
      {tab === "extras" && <ChangeOrders projectId={data.id} canSeeMoney={canSeeMoney} canEdit={canEditProject} />}
      {tab === "photos" && <FileGallery entityType="project" entityId={data.id} />}
      {tab === "finance" && canSeeMoney && <ProjectFinance project={data} />}
      {tab === "timeline" && (
        <div className="card p-5"><ActivityTimeline filters={{ projectId: data.id }} /></div>
      )}
    </div>
  );

  function WorkLogs({ projectId, team, canEdit }: { projectId: string; team: { id: string; firstName: string; lastName: string; color: string }[]; canEdit: boolean }) {
    const [logs, setLogs] = useState<WorkLogRow[] | null>(null);
    const [entry, setEntry] = useState({ date: new Date().toISOString().slice(0, 10), userId: team[0]?.id ?? "", hours: 8, note: "", hasIssue: false, issueNote: "" });

    const loadLogs = useCallback(() => {
      api<{ items: WorkLogRow[] }>(`/api/worklogs?projectId=${projectId}&pageSize=200`).then((r) => setLogs(r.items)).catch(() => setLogs([]));
    }, [projectId]);
    useEffect(() => {
      loadLogs();
    }, [loadLogs]);

    const addLog = async () => {
      if (!entry.userId || entry.hours <= 0) return;
      await api("/api/worklogs/upsert", { body: { ...entry, projectId } });
      toast(t("common.savedOk"));
      loadLogs();
    };

    const totalHours = (logs ?? []).reduce((s, l) => s + l.hours, 0);

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {canEdit && <div className="card p-5 space-y-3">
          <p className="eyebrow">Καταχώρηση ημέρας</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t("common.date")}><Input type="date" value={entry.date} onChange={(e) => setEntry({ ...entry, date: e.target.value })} /></Field>
            <Field label={t("worklog.hoursWorked")}><Input type="number" min={0} max={24} step="0.5" value={entry.hours} onChange={(e) => setEntry({ ...entry, hours: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Μέλος ομάδας">
            <Select value={entry.userId} onChange={(e) => setEntry({ ...entry, userId: e.target.value })} placeholder="—" options={team.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))} />
          </Field>
          <Field label={t("worklog.note")}><Textarea rows={2} value={entry.note} onChange={(e) => setEntry({ ...entry, note: e.target.value })} /></Field>
          <Checkbox checked={entry.hasIssue} onChange={(e) => setEntry({ ...entry, hasIssue: e.target.checked })} label={t("worklog.hasIssue")} />
          {entry.hasIssue && <Input placeholder="Περιγραφή προβλήματος…" value={entry.issueNote} onChange={(e) => setEntry({ ...entry, issueNote: e.target.value })} />}
          <Button size="sm" onClick={addLog}>+ Καταχώρηση</Button>
        </div>}

        <div className={`card p-5 ${canEdit ? "lg:col-span-2" : "lg:col-span-3"}`}>
          <div className="flex justify-between items-baseline mb-3">
            <p className="eyebrow">Ιστορικό</p>
            <span className="text-[12px] text-clay font-semibold">Σύνολο: {Math.round(totalHours * 10) / 10} ώρες</span>
          </div>
          {!logs ? (
            <Spinner />
          ) : logs.length === 0 ? (
            <p className="text-xs text-ink-faint text-center py-6">Καμία καταχώρηση ακόμη</p>
          ) : (
            <ul className="divide-y divide-line-soft max-h-[480px] overflow-y-auto">
              {logs.map((l) => (
                <li key={l.id} className="py-2.5 flex items-start gap-3">
                  <Avatar name={l.user ? `${l.user.firstName} ${l.user.lastName}` : "?"} color={l.user?.color ?? "#8a7968"} size={26} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px]">
                      <b>{new Date(l.date).toLocaleDateString("el-GR")}</b> · {l.hours}h
                      {l.note ? ` — ${l.note}` : ""}
                    </p>
                    {l.hasIssue && (
                      <Badge tone="rust" className="mt-1">⚠ {l.issueNote ?? "Πρόβλημα"}</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  type WorkLogRow = { id: string; date: string; hours: number; note?: string | null; hasIssue: boolean; issueNote?: string | null; user?: { firstName: string; lastName: string; color: string } | null };
  type ChangeOrderRow = { id: string; title: string; description?: string | null; amount: string; cost: string; approved: boolean; createdAt: string };

  function ChangeOrders({ projectId, canSeeMoney, canEdit }: { projectId: string; canSeeMoney: boolean; canEdit: boolean }) {
    const [rows, setRows] = useState<ChangeOrderRow[] | null>(null);
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState({ title: "", description: "", amount: 0, cost: 0 });

    const loadRows = useCallback(() => {
      api<{ items: ChangeOrderRow[] }>(`/api/changeOrders?projectId=${projectId}`).then((r) => setRows(r.items)).catch(() => setRows([]));
    }, [projectId]);
    useEffect(() => {
      loadRows();
    }, [loadRows]);

    return (
      <div className="space-y-4 max-w-3xl">
        {canEdit && <div className="flex justify-end"><Button size="sm" onClick={() => setOpen(true)}>+ Πρόσθετη εργασία</Button></div>}
        {canEdit && <Modal open={open} onClose={() => setOpen(false)} title="Νέα πρόσθετη εργασία (change order)">
          <div className="space-y-3">
            <Field label="Τίτλος *" required><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
            <Field label={t("common.description")}><Textarea rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Αξία χρέωσης €"><Input type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} /></Field>
              <Field label="Κόστος €"><Input type="number" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: Number(e.target.value) })} /></Field>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={async () => {
                if (!draft.title) return;
                await api("/api/changeOrders", { body: { ...draft, projectId } });
                setOpen(false);
                setDraft({ title: "", description: "", amount: 0, cost: 0 });
                loadRows();
              }}>{t("common.save")}</Button>
            </div>
          </div>
        </Modal>}

        {!rows ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState title="Δεν υπάρχουν πρόσθετες εργασίες" icon="+" hint="Καταγράψτε εκτός αρχικού αντικειμένου εργασίες και εγκρίσεις πελάτη." />
        ) : (
          <ul className="divide-y divide-line-soft card px-5">
            {rows.map((co) => (
              <li key={co.id} className="py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[13.5px] font-medium">{co.title}</p>
                  {co.description && <p className="text-[12px] text-ink-faint mt-0.5">{co.description}</p>}
                  <p className="text-[11px] text-ink-faint mt-1">{new Date(co.createdAt).toLocaleDateString("el-GR")}{canSeeMoney ? ` · κόστος ${fmtMoney(co.cost, lang)}` : ""}</p>
                </div>
                <div className="text-right shrink-0">
                  {canSeeMoney && <p className="display text-lg">{fmtMoney(co.amount, lang)}</p>}
                  {canEdit && <button
                    className={`btn btn-sm mt-1 ${co.approved ? "btn-secondary opacity-70" : "btn-primary"}`}
                    onClick={async () => {
                      await api(`/api/changeOrders/${co.id}`, { method: "PATCH", body: { approved: !co.approved, approvedAt: !co.approved ? new Date().toISOString() : null } });
                      loadRows();
                    }}
                  >
                    {co.approved ? `✓ ${t("changecord.approved")}` : "Έγκριση πελάτη"}
                  </button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  function ProjectFinance({ project }: { project: ProjectDetailData }) {
    const [summary, setSummary] = useState<{
      expensesTotal: number;
      expensesByCat: Record<string, number>;
      changeOrdersApproved: number;
      worklogHours: number;
      labourCost: number;
      invoiced: number;
      paid: number;
      invoices: { id: string; number: string; status: string; total: string; kind: string }[];
    } | null>(null);
    const [expOpen, setExpOpen] = useState(false);
    const [draft, setDraft] = useState<Record<string, unknown>>({ category: "MATERIALS_EXPENSE", date: new Date().toISOString().slice(0, 10), paid: true });

    const loadSummary = useCallback(async () => {
      try {
        const res = await api<typeof summary>(`/api/projects/${project.id}/finance`);
        setSummary(res);
      } catch {
        setSummary(null);
      }
    }, [project.id]);
    useEffect(() => {
      loadSummary();
    }, [loadSummary]);

    const actualCost = summary ? summary.expensesTotal + summary.labourCost + summary.changeOrdersApproved * 0.35 : 0;

    return (
      <div className="space-y-4">
        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MiniStat label={t("project.contractValue")} value={fmtMoney(project.contractValue, lang)} tone="clay" />
          <MiniStat label="+ Εγκεκριμένα change orders" value={summary ? fmtMoney(summary.changeOrdersApproved, lang) : "…"} />
          <MiniStat label="− Πραγματικό κόστος (εκτ.)" value={fmtMoney(Math.round(actualCost), lang)} tone="amber" sub={`έξοδα ${summary ? Math.round(summary.expensesTotal).toLocaleString("el-GR") : "…"} € + εργασία`} />
          <MiniStat label="Κέρδος (εκτ.)" value={fmtMoney(Math.round(Number(project.contractValue) - actualCost), lang)} tone="olive" />
          <MiniStat
            label={t("project.margin")}
            value={Number(project.contractValue) > 0 ? `${Math.round(((Number(project.contractValue) - actualCost) / Number(project.contractValue)) * 100)}%` : "—"}
            tone="olive"
          />
        </div>

        {/* Est vs actual */}
        <div className="card p-5 space-y-2">
          <p className="eyebrow mb-2">Εκτίμηση vs πραγματικό</p>
          <BarRow label="Κόστος" estimated={Number(project.estimatedCost)} actual={actualCost} fmtV={(n) => `${Math.round(n).toLocaleString("el-GR")} €`} />
          <BarRow label="Ώρες" estimated={project.estimatedHours} actual={summary?.worklogHours ?? 0} fmtV={(n) => `${Math.round(n)} h`} />
        </div>

        {/* Expenses */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="eyebrow">{t("project.expenses")}</p>
            <Button size="sm" variant="secondary" onClick={() => setExpOpen(!expOpen)}>+ Έξοδο</Button>
          </div>
          {expOpen && (
            <div className="card p-4 mb-4 grid grid-cols-2 sm:grid-cols-3 gap-3 bg-parchment/40">
              <Field label={t("common.category")}>
                <Select value={(draft.category as string) ?? ""} onChange={(e) => setDraft({ ...draft, category: e.target.value })} options={EXPENSE_CATS.map((c) => ({ value: c, label: t(`expcat.${c}`) }))} />
              </Field>
              <Field label={t("common.description")}><Input value={(draft.description as string) ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
              <Field label={`${t("common.amount")} €`}><Input type="number" min={0} step="0.5" value={(draft.amount as number) ?? ""} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} /></Field>
              <Field label="Προμηθευτής"><Input value={(draft.vendor as string) ?? ""} onChange={(e) => setDraft({ ...draft, vendor: e.target.value })} /></Field>
              <Field label={t("common.date")}><Input type="date" value={(draft.date as string) ?? ""} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></Field>
              <div className="flex items-end">
                <Button size="sm" onClick={async () => {
                  if (!draft.description || !draft.amount) return;
                  await api("/api/expenses", { body: { ...draft, projectId: project.id } });
                  setDraft({ category: "MATERIALS_EXPENSE", date: new Date().toISOString().slice(0, 10), paid: true });
                  setExpOpen(false);
                  loadSummary();
                }}>{t("common.save")}</Button>
              </div>
            </div>
          )}
          {!summary ? (
            <Spinner />
          ) : Object.keys(summary.expensesByCat).length === 0 ? (
            <p className="text-xs text-ink-faint py-3 text-center">Κανένα καταγεγραμμένο έξοδο</p>
          ) : (
            <ul className="divide-y divide-line-soft">
              {Object.entries(summary.expensesByCat).map(([cat, amt]) => (
                <li key={cat} className="py-2 flex justify-between text-[13px]">
                  <span>{t(`expcat.${cat}`)}</span>
                  <span className="tabular-nums">{fmtMoney(amt, lang)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Invoices of project */}
        <div className="card p-5">
          <p className="eyebrow mb-3">Τιμολόγια έργου</p>
          {!summary || summary.invoices.length === 0 ? (
            <p className="text-xs text-ink-faint py-2 text-center">Δεν έχουν εκδοθεί τιμολόγια</p>
          ) : (
            <ul className="divide-y divide-line-soft">
              {summary.invoices.map((inv) => (
                <li key={inv.id} className="py-2.5 flex items-center justify-between text-[13px]">
                  <Link href={`/finance?tab=invoices&open=${inv.id}`} className="font-medium hover:text-clay">{inv.number}</Link>
                  <span className="flex items-center gap-3">
                    <Badge tone={inv.kind === "PROFORMA" ? "slate" : "neutral"}>{inv.kind === "PROFORMA" ? "Pro forma" : inv.kind === "FINAL" ? "Τελικό" : "Πιστωτικό"}</Badge>
                    <Badge tone={inv.status === "PAID" ? "olive" : inv.status === "OVERDUE" ? "rust" : "neutral"}>{t(`istatus.${inv.status}`)}</Badge>
                    <span className="tabular-nums">{fmtMoney(inv.total, lang)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Modal open={false} onClose={() => undefined} title=""><span /></Modal>
      </div>
    );
  }

  function MiniStat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "clay" | "olive" | "amber" }) {
    const bar = tone === "olive" ? "bg-olive" : tone === "amber" ? "bg-amber-warm" : tone === "clay" ? "bg-clay" : "bg-bronze";
    return (
      <div className="card p-4 relative overflow-hidden">
        <span className={`absolute left-0 top-0 bottom-0 w-1 ${bar}`} />
        <p className="eyebrow mb-1.5 leading-tight">{label}</p>
        <p className="display text-lg leading-tight">{value}</p>
        {sub && <p className="text-[10px] text-ink-faint mt-0.5">{sub}</p>}
      </div>
    );
  }

  function BarRow({ label, estimated, actual, fmtV }: { label: string; estimated: number; actual: number; fmtV: (n: number) => string }) {
    const max = Math.max(estimated, actual, 1);
    const over = actual > estimated;
    return (
      <div>
        <div className="flex justify-between text-[12px] mb-1">
          <span className="font-medium">{label}</span>
          <span className="tabular-nums text-ink-faint">
            Εκτ.: {fmtV(estimated)} → Πραγματ.: <b className={over ? "text-rust" : "text-olive"}>{fmtV(actual)}</b>
          </span>
        </div>
        <div className="relative h-4 bg-parchment rounded-md overflow-hidden">
          <div className={`absolute inset-y-0 left-0 ${over ? "bg-rust/70" : "bg-olive/70"}`} style={{ width: `${(actual / max) * 100}%` }} />
          <div className="absolute inset-y-0 border-r-2 border-ink/60" style={{ left: `${(estimated / max) * 100}%`, width: 0 }} />
        </div>
      </div>
    );
  }
}
