"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Button, StatusBadge, Modal, Field, Input, Select, Textarea, EmptyState, DebouncedSearch, Spinner, useToast } from "@/components/ui";
import { ContactPicker } from "@/components/modules/Contacts";
import { useI18n } from "@/i18n/LanguageProvider";

export function VisitForm({ open, onClose, onSaved, initial, presetOpportunity }: { open: boolean; onClose: () => void; onSaved: () => void; initial?: Record<string, unknown> | null; presetOpportunity?: { id: string; contactId: string; title?: string } }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [users, setUsers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ items: typeof users }>("/api/users").then((r) => setUsers(r.items)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    setForm({
      scheduledAt: toLocalInput(now),
      durationMin: 60,
      status: "SCHEDULED",
      ...(initial ?? {}),
      ...(presetOpportunity ? { opportunityId: presetOpportunity.id, contactId: presetOpportunity.contactId, title: `Επίσκεψη: ${presetOpportunity.title ?? ""}` } : {}),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, scheduledAt: form.scheduledAt ? new Date(form.scheduledAt as string).toISOString() : undefined };
      if (initial?.id) await api(`/api/visits/${initial.id}`, { method: "PATCH", body: payload });
      else await api("/api/visits", { body: payload });
      toast(t("common.savedOk"));
      onSaved();
      onClose();
    } catch (err) {
      toast(String((err as Error).message), "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t("visit.newVisit")} wide>
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Field label={`${t("common.name")} *`}>
            <Input required value={(form.title as string) ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="π.χ. Μέτρηση διαμερίσματος Κολωνάκι" />
          </Field>
        </div>
        <Field label={`${t("opp.contact")} *`}>
          <ContactPicker value={(form.contactId as string) ?? ""} onChange={(v) => set("contactId", v)} />
        </Field>
        <Field label={`${t("visit.scheduledAt")} *`}>
          <Input required type="datetime-local" value={(form.scheduledAt as string) ?? ""} onChange={(e) => set("scheduledAt", e.target.value)} />
        </Field>
        <Field label={t("visit.duration")}>
          <Input type="number" min={15} step={15} value={(form.durationMin as number) ?? 60} onChange={(e) => set("durationMin", Number(e.target.value))} />
        </Field>
        <Field label={t("common.assignee")}>
          <Select value={(form.assignedUserId as string) ?? ""} onChange={(e) => set("assignedUserId", e.target.value || null)} placeholder={t("common.selectPlaceholder")} options={users.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))} />
        </Field>
        <div className="sm:col-span-2"><Field label={t("common.address")}><Input value={(form.address as string) ?? ""} onChange={(e) => set("address", e.target.value)} /></Field></div>
        <Field label={t("common.city")}><Input value={(form.city as string) ?? ""} onChange={(e) => set("city", e.target.value)} /></Field>
        <Field label={t("visit.purpose")}><Input value={(form.purpose as string) ?? ""} onChange={(e) => set("purpose", e.target.value)} placeholder="Αποτύπωση, έλεγχος υποστρώματος…" /></Field>
        <div className="sm:col-span-2"><Field label={t("visit.accessNotes")}><Textarea rows={2} value={(form.accessNotes as string) ?? ""} onChange={(e) => set("accessNotes", e.target.value)} placeholder="Θόρυβος, ασανσέρ, ώρες πρόσβασης, πάρκινγκ…" /></Field></div>
        <div className="sm:col-span-2 flex justify-end border-t border-line-soft pt-4">
          <Button type="submit" disabled={busy}>{busy ? t("common.saving") : t("common.save")}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function VisitsTable() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState<VisitRow[] | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const requestedStatus = new URLSearchParams(window.location.search).get("status");
    if (requestedStatus) setStatus(requestedStatus);
  }, []);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ pageSize: "100" });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    try {
      const res = await api<{ items: VisitRow[] }>(`/api/visits?${params}`);
      res.items.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
      setRows(res.items);
    } catch {
      setRows([]);
    }
  }, [q, status]);

   
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <VisitForm open={open} onClose={() => setOpen(false)} onSaved={load} initial={editing} />
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64"><DebouncedSearch onSearch={setQ} placeholder={`${t("common.search")}…`} /></div>
        <Select className="w-auto" value={status} onChange={(e) => {
          const next = e.target.value;
          setStatus(next);
          const url = new URL(window.location.href);
          if (next) url.searchParams.set("status", next);
          else url.searchParams.delete("status");
          window.history.replaceState({}, "", `${url.pathname}${url.search}`);
        }} placeholder={t("common.status")} options={["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"].map((s) => ({ value: s, label: t(`visit.status.${s}`) }))} />
        <div className="flex-1" />
        <Button onClick={() => { setEditing(null); setOpen(true); }}>+ {t("visit.newVisit")}</Button>
      </div>

      {!rows ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title="Καμία επισκεψη" icon="⌖" hint="Προγραμματίστε την πρώτη επίσκεψη χώρου για αποτύπωση και μετρήσεις." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map((v) => (
            <Link key={v.id} href={`/visits/${v.id}`} className="card p-4 hover:shadow-pop transition-shadow block">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="font-semibold text-[14px] leading-snug">{v.title}</p>
                <StatusBadge status={v.status} label={t(`visit.status.${v.status}`)} className="shrink-0" />
              </div>
              <p className="text-[12px] text-ink-soft">
                🗓 {new Date(v.scheduledAt).toLocaleString("el-GR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                {" · "}{v.durationMin}′
              </p>
              <p className="text-[12px] text-ink-soft mt-0.5">☺ {v.contact.firstName} {v.contact.lastName}{v.city ? ` · ${v.city}` : ""}</p>
              <div className="flex justify-between items-center mt-3 pt-2 border-t border-line-soft text-[11px] text-ink-faint">
                <span>{(v as unknown as { _count?: { measurements?: number } })._count?.measurements ?? 0} μετρήσεις</span>
                {v.assignedTo && <span>{v.assignedTo.firstName}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
      {/* keep toast import used */}
      <span hidden onClick={() => toast("")} />
    </div>
  );
}

export type VisitRow = {
  id: string;
  title: string;
  scheduledAt: string;
  durationMin: number;
  status: string;
  city?: string | null;
  address?: string | null;
  measurementsCount?: number;
  contact: { firstName: string; lastName: string };
  assignedTo?: { firstName: string; lastName: string } | null;
};
