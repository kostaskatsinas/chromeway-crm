"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client";
import { Button, StatusBadge, Modal, Field, Input, Select, Textarea, EmptyState, DebouncedSearch, Spinner, Avatar, useToast } from "@/components/ui";
import { useI18n, fmtMoney } from "@/i18n/LanguageProvider";
import { QuickActivityModal } from "@/components/layout/CommandCenter";

const STAGES = ["NEW_LEAD", "CONTACTED", "QUALIFIED", "SITE_VISIT_PLANNED", "SAMPLE_REQUESTED", "QUOTATION_PREPARATION", "QUOTATION_SENT", "NEGOTIATION"] as const;
const CLOSED = ["WON", "LOST", "ON_HOLD"] as const;
const ALL_STAGES = [...STAGES, ...CLOSED];

export type Opp = {
  id: string;
  title: string;
  stage: string;
  position: number;
  estimatedValue: string | number;
  probability: number;
  region: string;
  city?: string | null;
  requestedFinish?: string | null;
  nextAction?: string | null;
  nextActionDate?: string | null;
  expectedDecisionDate?: string | null;
  source: string;
  contact: { id: string; firstName: string; lastName: string };
  assignedTo?: { id: string; firstName: string; lastName: string; color: string } | null;
};

type UserOpt = { id: string; firstName: string; lastName: string };

function OpportunityForm({ open, onClose, onSaved, initial, presetContact, readOnly = false }: { open: boolean; onClose: () => void; onSaved: (id?: string) => void; initial?: Partial<Opp> | null; presetContact?: string; readOnly?: boolean }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [contacts, setContacts] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [cq, setCq] = useState("");
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ items: { id: string; firstName: string; lastName: string }[] }>(`/api/contacts?pageSize=100${cq ? `&q=${encodeURIComponent(cq)}` : ""}`).then((r) => setContacts(r.items)).catch(() => {});
    api<{ items: UserOpt[] }>("/api/users?pageSize=100").then((r) => setUsers(r.items.filter((u) => u.id))).catch(() => {});
  }, [cq]);

  useEffect(() => {
    if (open) {
      setForm({
        stage: initial?.stage ?? "NEW_LEAD",
        probability: 30,
        estimatedValue: "",
        region: "ATTICA",
        source: "REFERRAL",
        surfaceMaterials: [],
        ...(initial ? { ...initial, contactId: initial.contact?.id } : {}),
        ...(presetContact ? { contactId: presetContact } : {}),
      });
    }
     
  }, [open, initial, presetContact]);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    setBusy(true);
    try {
      if (initial?.id) {
        await api(`/api/opportunities/${initial.id}`, { method: "PATCH", body: form });
        onSaved(initial.id);
      } else {
        const created = await api<{ id: string }>("/api/opportunities", { body: form });
        onSaved(created.id);
      }
      toast(t("common.savedOk"));
      onClose();
    } catch (err) {
      toast(String((err as Error).message), "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={initial?.id ? t("common.edit") : t("opp.newOpportunity")} wide>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <fieldset disabled={readOnly} className="contents">
        <div className="md:col-span-2">
          <Field label={`${t("opp.title")} *`}><Input required value={(form.title as string) ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="π.χ. Ξενοδοχείο — Επένδυση λόμπι" /></Field>
        </div>
        <div className="md:col-span-2">
          <Field label={`${t("opp.contact")} *`} required>
            <Input placeholder={t1("Αναζήτηση επαφής…")} value={cq} onChange={(e) => setCq(e.target.value)} className="mb-1" />
            <Select required value={(form.contactId as string) ?? ""} onChange={(e) => set("contactId", e.target.value)} placeholder="— Επιλογή επαφής —" options={contacts.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }))} />
          </Field>
        </div>
        <Field label={t("common.city")}><Input value={(form.city as string) ?? ""} onChange={(e) => set("city", e.target.value)} /></Field>
        <Field label={t("common.region")}>
          <Select value={(form.region as string) ?? ""} onChange={(e) => set("region", e.target.value)} options={["ATTICA", "PELOPONNESE", "STEREA_ELLADA", "THESSALY", "EPIRUS", "MACEDONIA", "THRACE", "IONIAN_ISLANDS", "AEGEAN_ISLANDS", "CRETE", "OTHER_REGION"].map((r) => ({ value: r, label: t(`reg.${r}`) }))} />
        </Field>
        <Field label={t("opp.estimatedArea")}>
          <Input type="number" step="any" min={0} value={(form.estimatedAreaM2 as number) ?? ""} onChange={(e) => set("estimatedAreaM2", e.target.value === "" ? null : Number(e.target.value))} />
        </Field>
        <Field label={t("opp.requestedFinish")}><Input value={(form.requestedFinish as string) ?? ""} onChange={(e) => set("requestedFinish", e.target.value)} placeholder="Βενετσιάνικο σοβά, μεταλλικό εφέ…" /></Field>
        <Field label={`${t("opp.estimatedValue")} €`}><Input type="number" min={0} value={(form.estimatedValue as string) ?? ""} onChange={(e) => set("estimatedValue", e.target.value === "" ? 0 : Number(e.target.value))} /></Field>
        <Field label={t("opp.probability")}>
          <Input type="number" min={0} max={100} value={(form.probability as number) ?? 30} onChange={(e) => set("probability", Number(e.target.value))} />
        </Field>
        <Field label={t("opp.source")}>
          <Select value={(form.source as string) ?? ""} onChange={(e) => set("source", e.target.value)} options={["WEBSITE", "REFERRAL", "INSTAGRAM", "FACEBOOK", "GOOGLE_SEARCH", "WALK_IN", "EXHIBITION", "PARTNER", "COLD_OUTREACH", "REPEAT_CUSTOMER", "OTHER"].map((s) => ({ value: s, label: t(`src.${s}`) }))} />
        </Field>
        <Field label={t("common.assignee")}>
          <Select value={(form.assignedUserId as string) ?? ""} onChange={(e) => set("assignedUserId", e.target.value || null)} placeholder={t("common.selectPlaceholder")} options={users.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))} />
        </Field>
        <Field label={t("opp.expectedDecision")}>
          <Input type="date" value={(form.expectedDecisionDate as string)?.slice(0, 10) ?? ""} onChange={(e) => set("expectedDecisionDate", e.target.value || null)} />
        </Field>
        <Field label={t("stage.NEGOTIATION") + " →"}>
          <Select value={(form.stage as string) ?? "NEW_LEAD"} onChange={(e) => set("stage", e.target.value)} options={ALL_STAGES.map((s) => ({ value: s, label: t(`stage.${s}`) }))} />
        </Field>
        <div className="md:col-span-2"><Field label={t("opp.nextAction")}><Input value={(form.nextAction as string) ?? ""} onChange={(e) => set("nextAction", e.target.value)} placeholder="Τηλεφωνική επικοινωνία για επιβεβαίωση επίσκεψης" /></Field></div>
        <Field label={t("opp.nextActionDate")}>
          <Input type="date" value={(form.nextActionDate as string)?.slice(0, 10) ?? ""} onChange={(e) => set("nextActionDate", e.target.value || null)} />
        </Field>
        {form.stage === "LOST" && (
          <Field label={t("opp.lossReason")}>
            <Select value={(form.lossReason as string) ?? ""} onChange={(e) => set("lossReason", e.target.value || null)} placeholder={t("common.selectPlaceholder")} options={["PRICE_TOO_HIGH", "TIMING", "CHOSE_COMPETITOR", "NO_BUDGET", "NOT_A_FIT", "WENT_SILENT", "PROJECT_CANCELLED", "OTHER_REASON"].map((l) => ({ value: l, label: t(`loss.${l}`) }))} />
          </Field>
        )}
        <div className="md:col-span-2"><Field label={t("common.description")}><Textarea rows={3} value={(form.description as string) ?? ""} onChange={(e) => set("description", e.target.value)} /></Field></div>
        {!readOnly && <div className="md:col-span-2 flex justify-end border-t border-line-soft pt-4">
          <Button type="submit" disabled={busy}>{busy ? t("common.saving") : t("common.save")}</Button>
        </div>}
        </fieldset>
      </form>
    </Modal>
  );
}
function t1(s: string) {
  return s;
}

export function PipelineBoard({ currentUserId, canEdit }: { currentUserId: string; canEdit: boolean }) {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [opps, setOpps] = useState<Opp[] | null>(null);
  const [q, setQ] = useState("");
  const [mine, setMine] = useState(false);
  const [stageFilter, setStageFilter] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Opp> | null>(null);
  const [presetContact, setPresetContact] = useState<string | undefined>();
  const [activityTarget, setActivityTarget] = useState<Opp | null>(null);
  const urlActionHandled = useRef(false);

  // URL params: open existing or create new
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("view") === "list") setView("list");
    if (sp.get("mine") === "1") setMine(true);
    if (sp.get("q")) setQ(sp.get("q") ?? "");
    const requestedStage = sp.get("stage");
    if (requestedStage && ALL_STAGES.includes(requestedStage as (typeof ALL_STAGES)[number])) {
      setStageFilter(requestedStage);
      setView("list");
    }
    if (sp.get("new") && canEdit) {
      setEditing(null);
      setPresetContact(sp.get("contact") ?? undefined);
      setFormOpen(true);
      urlActionHandled.current = true;
    }
  }, [canEdit]);

  useEffect(() => {
    if (urlActionHandled.current || !opps) return;
    const openId = new URLSearchParams(window.location.search).get("open");
    if (!openId) return;
    const match = opps.find((opportunity) => opportunity.id === openId);
    if (match) {
      setEditing(match);
      setFormOpen(true);
    }
    urlActionHandled.current = true;
  }, [opps]);

  const updateViewUrl = (updates: Record<string, string | null>) => {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(updates)) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  };

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ pageSize: "300" });
      if (q) params.set("q", q);
      const res = await api<{ items: Opp[] }>(`/api/opportunities?${params}`);
      setOpps(res.items);
    } catch {
      setOpps([]);
    }
  }, [q]);

  useEffect(() => {
    load();
  }, [load]);

  const moveCard = async (id: string, stage: string) => {
    if (!canEdit) return;
    setOpps((prev) => prev && prev.map((o) => (o.id === id ? { ...o, stage } : o)));
    try {
      await api(`/api/opportunities/${id}`, { method: "PATCH", body: { stage } });
      load();
    } catch (e) {
      toast(String((e as Error).message), "err");
      load();
    }
  };

  const byStage = useMemo(() => {
    const map: Record<string, Opp[]> = {};
    for (const s of ALL_STAGES) map[s] = [];
    for (const o of opps ?? []) (map[o.stage] ??= []).push(o);
    return map;
  }, [opps]);

  const filtered = (list: Opp[]) => list.filter((opportunity) =>
    (!mine || opportunity.assignedTo?.id === currentUserId) &&
    (!stageFilter || opportunity.stage === stageFilter)
  );

  const nextActionMeta = (o: Opp) => {
    if (!o.nextActionDate) return { label: o.nextAction ? "Χωρίς ημερομηνία" : "Χωρίς επόμενη ενέργεια", className: "text-amber-warm" };
    const date = new Date(o.nextActionDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(date);
    due.setHours(0, 0, 0, 0);
    const days = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (days < 0) return { label: `${Math.abs(days)}ημ. καθυστέρηση`, className: "text-rust" };
    if (days === 0) return { label: "Σήμερα", className: "text-rust" };
    if (days === 1) return { label: "Αύριο", className: "text-amber-warm" };
    return { label: date.toLocaleDateString("el-GR", { day: "numeric", month: "short" }), className: "text-ink-faint" };
  };

  const Card = ({ o }: { o: Opp }) => (
    <div
      draggable={canEdit}
      onDragStart={() => setDragId(o.id)}
      onDragEnd={() => { setDragId(null); setDragOverStage(null); }}
      onClick={() => { setEditing(o); setFormOpen(true); }}
      className={`kanban-card card p-3 mb-2 select-none ${canEdit ? "cursor-grab" : "cursor-default"} ${dragId === o.id ? "opacity-40" : ""}`}
    >
      <p className="text-[13px] font-semibold leading-snug">{o.title}</p>
      <p className="text-[11px] text-ink-faint mt-0.5">{o.contact.firstName} {o.contact.lastName}{o.city ? ` · ${o.city}` : ""}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="display text-[15px]">{fmtMoney(o.estimatedValue, lang, true)}</span>
        <span className="text-[10px] text-ink-faint bg-parchment rounded-full px-2 py-0.5">{o.probability}%</span>
      </div>
      {(o.nextAction || o.assignedTo) && (
        <div className="mt-2 pt-2 border-t border-line-soft space-y-1.5">
          <div className="flex items-center justify-between">
          <span className="text-[10.5px] text-clay truncate max-w-[70%]">{o.nextAction || "Ορισμός επόμενης ενέργειας"}</span>
          {o.assignedTo && <Avatar name={`${o.assignedTo.firstName} ${o.assignedTo.lastName}`} color={o.assignedTo.color} size={20} />}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[10.5px] font-semibold ${nextActionMeta(o).className}`}>{nextActionMeta(o).label}</span>
            {canEdit && <button type="button" className="text-[10.5px] font-semibold text-clay hover:underline" onClick={(event) => { event.stopPropagation(); setActivityTarget(o); }}>☎ Καταγραφή</button>}
          </div>
        </div>
      )}
      {canEdit && <select
        aria-label={t("common.status")}
        className="select mt-2 sm:hidden text-xs"
        value={o.stage}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          event.stopPropagation();
          moveCard(o.id, event.target.value);
        }}
      >
        {ALL_STAGES.map((stage) => <option key={stage} value={stage}>{t(`stage.${stage}`)}</option>)}
      </select>}
    </div>
  );

  const visibleOpportunities = filtered(Object.values(byStage).flat());
  const totalValue = visibleOpportunities.filter((o) => !["WON", "LOST"].includes(o.stage)).reduce((s, o) => s + Number(o.estimatedValue), 0);

  return (
    <div className="space-y-4">
      <OpportunityForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} initial={editing} presetContact={presetContact} readOnly={!canEdit} />
      <QuickActivityModal open={!!activityTarget} onClose={() => { setActivityTarget(null); load(); }} presetContactId={activityTarget?.contact.id} presetOpportunityId={activityTarget?.id} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64"><DebouncedSearch onSearch={(value) => { setQ(value); updateViewUrl({ q: value || null }); }} placeholder={`${t("common.search")}…`} /></div>
        <Select
          className="w-full sm:w-auto"
          value={stageFilter}
          onChange={(event) => {
            const next = event.target.value;
            setStageFilter(next);
            if (next) setView("list");
            updateViewUrl({ stage: next || null, view: next ? "list" : view === "list" ? "list" : null });
          }}
          placeholder={t("common.status")}
          options={ALL_STAGES.map((stage) => ({ value: stage, label: t(`stage.${stage}`) }))}
        />
        <Button
          variant={mine ? "secondary" : "ghost"}
          size="sm"
          aria-pressed={mine}
          onClick={() => {
            const next = !mine;
            setMine(next);
            updateViewUrl({ mine: next ? "1" : null });
          }}
        >Μόνα μου</Button>
        <div className="flex-1" />
        <span className="hidden sm:block text-xs text-ink-faint mr-2">Pipeline: <b className="text-ink">{Math.round(totalValue / 1000)}k €</b></span>
        <div className="flex rounded-lg overflow-hidden border border-line">
          <button onClick={() => { setView("kanban"); updateViewUrl({ view: null }); }} className={`px-3 py-1.5 text-[12px] font-medium ${view === "kanban" ? "bg-clay text-white" : "bg-surface"}`}>{t("pipeline.kanban")}</button>
          <button onClick={() => { setView("list"); updateViewUrl({ view: "list" }); }} className={`px-3 py-1.5 text-[12px] font-medium ${view === "list" ? "bg-clay text-white" : "bg-surface"}`}>{t("pipeline.list")}</button>
        </div>
        {canEdit && <Button onClick={() => { setEditing(null); setPresetContact(undefined); setFormOpen(true); }}>+ {t("opp.newOpportunity")}</Button>}
      </div>

      {!opps ? (
        <Spinner />
      ) : view === "kanban" ? (
        /* ── Kanban ── */
        <div className="overflow-x-auto pb-4 -mx-4 px-4">
          <div className="flex gap-3 w-max">
            {[...STAGES, ...CLOSED].map((stage) => {
              const items = filtered(byStage[stage] ?? []).sort((a, b) => a.position - b.position);
              const sum = items.reduce((s, o) => s + Number(o.estimatedValue), 0);
              return (
                <div
                  key={stage}
                  onDragOver={(e) => { if (!canEdit) return; e.preventDefault(); setDragOverStage(stage); }}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={() => {
                    if (dragId) moveCard(dragId, stage);
                    setDragOverStage(null);
                    setDragId(null);
                  }}
                  className={`kanban-col ${dragOverStage === stage ? "kanban-drop-active" : ""}`}
                >
                  <div className="flex items-baseline justify-between px-1 mb-2">
                    <p className={`text-[11px] font-bold uppercase tracking-wider ${["WON"].includes(stage) ? "text-olive" : ["LOST"].includes(stage) ? "text-rust" : "text-ink-faint"}`}>
                      {t(`stage.${stage}`)}
                    </p>
                    <span className="text-[10.5px] text-ink-faint">{items.length} · {Math.round(sum / 1000)}k</span>
                  </div>
                  <div className="min-h-[80px]">
                    {items.map((o) => <Card key={o.id} o={o} />)}
                    {items.length === 0 && <div className="h-16 border border-dashed border-line-soft rounded-xl" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── List ── */
        <div className="card overflow-x-auto">
          <table className="table-base min-w-[860px]">
            <thead>
              <tr>
                <th>{t("opp.title")}</th>
                <th>{t("opp.contact")}</th>
                <th>{t("pipeline.title").split(" ")[0]}</th>
                <th>{t("opp.estimatedValue")}</th>
                <th>%</th>
                <th>{t("opp.expectedDecision")}</th>
                <th>{t("opp.nextAction")}</th>
                <th>{t("common.status")}</th>
              </tr>
            </thead>
            <tbody>
              {visibleOpportunities.map((o) => (
                <tr key={o.id} className="cursor-pointer" onClick={() => { setEditing(o); setFormOpen(true); }}>
                  <td className="font-medium">{o.title}</td>
                  <td>{o.contact.firstName} {o.contact.lastName}</td>
                  <td>{o.city ?? t(`reg.${o.region}`)}</td>
                  <td className="whitespace-nowrap">{fmtMoney(o.estimatedValue, lang)}</td>
                  <td>{o.probability}%</td>
                  <td>{o.expectedDecisionDate ? new Date(o.expectedDecisionDate).toLocaleDateString("el-GR") : "—"}</td>
                  <td>
                    <p className="max-w-56 truncate">{o.nextAction || "—"}</p>
                    <span className={`text-[10.5px] font-semibold ${nextActionMeta(o).className}`}>{nextActionMeta(o).label}</span>
                  </td>
                  <td onClick={(event) => canEdit && event.stopPropagation()}>
                    {canEdit ? <Select className="min-w-44" value={o.stage} onChange={(event) => moveCard(o.id, event.target.value)} options={ALL_STAGES.map((stage) => ({ value: stage, label: t(`stage.${stage}`) }))} /> : <StatusBadge status={o.stage} label={t(`stage.${o.stage}`)} />}
                  </td>
                </tr>
              ))}
              {visibleOpportunities.length === 0 && (
                <tr><td colSpan={8}><EmptyState title={t("common.noData")} icon="⇉" /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
