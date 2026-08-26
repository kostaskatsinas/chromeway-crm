"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { Button, Badge, Modal, Field, Input, Select, Textarea, useToast } from "@/components/ui";
import { ContactPicker } from "@/components/modules/Contacts";
import { useI18n } from "@/i18n/LanguageProvider";

const EVENT_TYPES = ["SITE_VISIT_EVENT", "SAMPLE_PRODUCTION", "PROJECT_WORK", "DELIVERY", "CUSTOMER_MEETING", "PAYMENT_DEADLINE", "FOLLOW_UP_TASK", "INTERNAL_MEETING", "OTHER_EVENT"];

const TYPE_COLORS: Record<string, string> = {
  SITE_VISIT_EVENT: "#5b6b7a",
  SAMPLE_PRODUCTION: "#8a7968",
  PROJECT_WORK: "#9a5b36",
  DELIVERY: "#b08a3e",
  CUSTOMER_MEETING: "#5f7050",
  PAYMENT_DEADLINE: "#a34a32",
  FOLLOW_UP_TASK: "#c4b49a",
  INTERNAL_MEETING: "#7d6f61",
  OTHER_EVENT: "#a99e90",
};

type Ev = {
  id: string;
  title: string;
  type: string;
  start: string;
  end?: string | null;
  allDay?: boolean;
  location?: string | null;
  assignedUserId?: string | null;
  contactId?: string | null;
  projectId?: string | null;
  visitId?: string | null;
  recurrence?: string;
};

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CalendarView() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<Ev[] | null>(null);
  const [users, setUsers] = useState<{ id: string; firstName: string; lastName: string; color: string }[]>([]);
  const [filterUser, setFilterUser] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Ev> | Record<string, unknown> | null>(null);

  const range = useMemo(() => {
    const from = new Date(cursor);
    const to = new Date(cursor);
    if (view === "month") {
      from.setDate(1); from.setHours(0, 0, 0, 0);
      to.setMonth(to.getMonth() + 1); to.setDate(0); to.setHours(23, 59);
    } else if (view === "week") {
      const dow = (from.getDay() + 6) % 7;
      from.setDate(from.getDate() - dow); from.setHours(0, 0, 0, 0);
      to.setTime(from.getTime()); to.setDate(to.getDate() + 6); to.setHours(23, 59);
    } else {
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59);
    }
    return { from, to };
  }, [cursor, view]);

  const load = useCallback(async () => {
    try {
      const res = await api<{ items: Ev[] }>(`/api/events?pageSize=400&from=${range.from.toISOString().slice(0, 10)}&to=${range.to.toISOString().slice(0, 10)}`);
      setEvents(res.items);
    } catch {
      setEvents([]);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api<{ items: typeof users }>("/api/users").then((r) => setUsers(r.items)).catch(() => {});
  }, []);

  const visible = (events ?? []).filter((e) => !filterUser || e.assignedUserId === filterUser);

  // ── Conflict detection: same assignee overlapping in time ──
  function conflictsFor(candidateStart: Date, candidateEnd: Date, userId?: string | null, ignoreId?: string) {
    if (!userId) return [];
    return visible.filter((e) => {
      if (e.id === ignoreId || e.assignedUserId !== userId) return false;
      const s = new Date(e.start);
      const en = e.end ? new Date(e.end) : new Date(s.getTime() + 3600000);
      return s < candidateEnd && en > candidateStart;
    });
  }

  const shift = (dir: number) => {
    const d = new Date(cursor);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + 7 * dir);
    else d.setDate(d.getDate() + dir);
    setCursor(d);
  };

  const title =
    view === "month"
      ? cursor.toLocaleDateString("el-GR", { month: "long", year: "numeric" })
      : view === "week"
        ? `${range.from.toLocaleDateString("el-GR", { day: "numeric", month: "short" })} – ${range.to.toLocaleDateString("el-GR", { day: "numeric", month: "short" })}`
        : cursor.toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" });

  /* ── Month grid ── */
  const monthCells = useMemo(() => {
    const first = new Date(range.from);
    const dow = (first.getDay() + 6) % 7; // Monday first
    first.setDate(first.getDate() - dow);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(first);
      d.setDate(first.getDate() + i);
      return d;
    });
  }, [range]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(range.from);
    d.setDate(range.from.getDate() + i);
    return d;
  }), [range]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg overflow-hidden border border-line">
          <button onClick={() => setView("day")} className={`px-3 py-1.5 text-[12px] font-medium ${view === "day" ? "bg-clay text-white" : "bg-surface"}`}>{t("cal.day")}</button>
          <button onClick={() => setView("week")} className={`px-3 py-1.5 text-[12px] font-medium ${view === "week" ? "bg-clay text-white" : "bg-surface"}`}>{t("cal.week")}</button>
          <button onClick={() => setView("month")} className={`px-3 py-1.5 text-[12px] font-medium ${view === "month" ? "bg-clay text-white" : "bg-surface"}`}>{t("cal.month")}</button>
        </div>
        <Button variant="secondary" size="sm" onClick={() => shift(-1)}>‹</Button>
        <Button variant="secondary" size="sm" onClick={() => setCursor(new Date())}>{t("common.today")}</Button>
        <Button variant="secondary" size="sm" onClick={() => shift(1)}>›</Button>
        <p className="display text-xl ml-2 capitalize">{title}</p>
        <div className="flex-1" />
        <Select className="w-auto" value={filterUser} onChange={(e) => setFilterUser(e.target.value)} placeholder={t("common.all")} options={users.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))} />
        <Button onClick={() => { setEditing({ start: toLocalInput(cursor), type: "SITE_VISIT_EVENT" }); setFormOpen(true); }}>+ {t("cal.newEvent")}</Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {EVENT_TYPES.map((ty) => (
          <span key={ty} className="flex items-center gap-1.5 text-[10.5px] text-ink-faint">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: TYPE_COLORS[ty] }} />
            {t(`etype.${ty}`)}
          </span>
        ))}
      </div>

      {!events ? (
        <div className="card p-10"><div className="w-6 h-6 border-2 border-line border-t-clay rounded-full animate-spin mx-auto" /></div>
      ) : view === "month" ? (
        <div className="card p-3 overflow-hidden">
          <div className="grid grid-cols-7 gap-px bg-line-soft">
            {["Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ", "Κυρ"].map((d) => (
              <div key={d} className="bg-surface px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-ink-faint">{d}</div>
            ))}
            {monthCells.map((d, i) => {
              const inMonth = d.getMonth() === cursor.getMonth();
              const isToday = d.toDateString() === new Date().toDateString();
              const dayEvents = visible.filter((e) => new Date(e.start).toDateString() === d.toDateString());
              return (
                <div
                  key={i}
                  className={`bg-surface min-h-[92px] p-1.5 ${inMonth ? "" : "opacity-40"} hover:bg-parchment/60 transition-colors cursor-pointer`}
                  onDoubleClick={() => { setEditing({ start: toLocalInput(d), type: "SITE_VISIT_EVENT" }); setFormOpen(true); }}
                >
                  <p className={`text-[11px] mb-1 flex justify-between ${isToday ? "font-bold text-clay" : "text-ink-faint"}`}>
                    <span>{d.getDate()}</span>
                    {isToday && <span className="text-[9px] uppercase">σήμερα</span>}
                  </p>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((e) => (
                      <button
                        key={e.id}
                        onClick={(ev) => { ev.stopPropagation(); setEditing(e); setFormOpen(true); }}
                        className="block w-full text-left text-[10px] leading-tight truncate rounded px-1.5 py-1 text-white/95 hover:brightness-110"
                        style={{ background: TYPE_COLORS[e.type] ?? "#a99e90" }}
                        title={e.title}
                      >
                        {e.allDay ? "" : `${new Date(e.start).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })} `}
                        {e.title}
                      </button>
                    ))}
                    {dayEvents.length > 3 && <p className="text-[9.5px] text-ink-faint pl-1">+{dayEvents.length - 3} ακόμη</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : view === "week" ? (
        <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
          {weekDays.map((d) => {
            const dayEvents = visible.filter((e) => new Date(e.start).toDateString() === d.toDateString()).sort((a, b) => a.start.localeCompare(b.start));
            const isToday = d.toDateString() === new Date().toDateString();
            return (
              <div key={d.toISOString()} className={`card p-2 min-h-[180px] ${isToday ? "border-clay/50" : ""}`}>
                <p className={`text-[11px] font-bold mb-2 ${isToday ? "text-clay" : "text-ink-faint"}`}>
                  {d.toLocaleDateString("el-GR", { weekday: "short", day: "numeric" })}
                </p>
                <div className="space-y-1.5">
                  {dayEvents.map((e) => (
                    <EventChip key={e.id} ev={e} onClick={() => { setEditing(e); setFormOpen(true); }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card divide-y divide-line-soft">
          {(() => {
            const dayEvents = visible.filter((e) => new Date(e.start).toDateString() === cursor.toDateString()).sort((a, b) => a.start.localeCompare(b.start));
            if (dayEvents.length === 0)
              return (
                <div className="py-16 text-center text-ink-faint text-sm">
                  Κανένα συμβάν
                  <div className="mt-3"><Button size="sm" variant="secondary" onClick={() => { setEditing({ start: toLocalInput(cursor), type: "SITE_VISIT_EVENT" }); setFormOpen(true); }}>+ Προγραμματισμός</Button></div>
                </div>
              );
            return dayEvents.map((e) => {
              const clash = conflictsFor(new Date(e.start), e.end ? new Date(e.end) : new Date(new Date(e.start).getTime() + 3600000), e.assignedUserId, e.id);
              return (
                <div key={e.id} className="p-4 flex items-start gap-3">
                  <span className="w-1.5 self-stretch rounded-full shrink-0" style={{ background: TYPE_COLORS[e.type] ?? "#a99e90" }} />
                  <div className="min-w-0 flex-1">
                    <button className="text-left w-full group" onClick={() => { setEditing(e); setFormOpen(true); }}>
                      <p className="text-[14px] font-semibold group-hover:text-clay">{e.title}</p>
                      <p className="text-[12px] text-ink-faint mt-0.5">
                        {new Date(e.start).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}
                        {e.end ? ` – ${new Date(e.end).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}` : ""}
                        {e.location ? ` · 📍 ${e.location}` : ""}
                        {" · "}
                        {t(`etype.${e.type}`)}
                      </p>
                    </button>
                    {clash.length > 0 && (
                      <Badge tone="rust" className="mt-1.5">⚠ {t("cal.conflictWarning")}</Badge>
                    )}
                  </div>
                  {e.visitId && <a href={`/visits/${e.visitId}`} className="btn btn-secondary btn-sm shrink-0">Επίσκεψη ↗</a>}
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Event modal */}
      {formOpen && (
        <EventModal
          open={formOpen}
          onClose={() => setFormOpen(false)}
          initial={editing as never}
          onSaved={async () => {
            load();
            toast(t("common.savedOk"));
          }}
          conflictsFn={conflictsFor}
          users={users}
          onDelete={
            (editing as { id?: string })?.id
              ? async () => {
                  await api(`/api/events/${(editing as { id: string }).id}`, { method: "DELETE" });
                  setFormOpen(false);
                  load();
                }
              : undefined
          }
        />
      )}
    </div>
  );

  function EventChip({ ev, onClick }: { ev: Ev; onClick: () => void }) {
    return (
      <button onClick={onClick} className="block w-full text-left text-[11px] leading-snug rounded-md px-2 py-1.5 text-white/95 hover:brightness-110 transition-all" style={{ background: TYPE_COLORS[ev.type] ?? "#a99e90" }}>
        <b>{new Date(ev.start).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}</b>
        <span className="block truncate">{ev.title}</span>
      </button>
    );
  }
}

function EventModal({
  open,
  onClose,
  initial,
  onSaved,
  users,
  conflictsFn,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  initial: Partial<Ev>;
  onSaved: () => void;
  users: { id: string; firstName: string; lastName: string; color: string }[];
  conflictsFn: (s: Date, e: Date, uid?: string | null, ignoreId?: string) => unknown[];
  onDelete?: () => void;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const start = initial.start ? new Date(initial.start as string) : new Date();
    setForm({
      type: "SITE_VISIT_EVENT",
      reminderMinBefore: 60,
      recurrence: "NONE",
      recurrenceInterval: 1,
      ...initial,
      start: toLocalInput(start),
      end: initial.end ? toLocalInput(new Date(initial.end)) : toLocalInput(new Date(start.getTime() + 3600000)),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const clashes = (() => {
    if (!form.start || !form.end) return [];
    const s = new Date(form.start as string);
    const e = new Date(form.end as string);
    if (!(s < e)) return [];
    return conflictsFn(s, e, (form.assignedUserId as string) ?? null, initial.id);
  })();

  const submit = async () => {
    if (!form.title || !form.start) {
      toast(t("common.requiredField"), "err");
      return;
    }
    setBusy(true);
    try {
      const payload = { ...form, start: new Date(form.start as string).toISOString(), end: form.end ? new Date(form.end as string).toISOString() : null };
      if (initial.id) await api(`/api/events/${initial.id}`, { method: "PATCH", body: payload });
      else await api("/api/events", { body: payload });
      onSaved();
      onClose();
    } catch (err) {
      toast(String((err as Error).message), "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={initial.id ? t("common.edit") : t("cal.newEvent")}>
      <div className="space-y-4">
        <Field label={`${t("task.title")} *`}><Input value={(form.title as string) ?? ""} onChange={(e) => set("title", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`${t("common.from")} *`}><Input required type="datetime-local" value={(form.start as string) ?? ""} onChange={(e) => set("start", e.target.value)} /></Field>
          <Field label={`${t("common.to")} *`}><Input type="datetime-local" value={(form.end as string) ?? ""} onChange={(e) => set("end", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("common.type")}>
            <Select value={(form.type as string) ?? ""} onChange={(e) => set("type", e.target.value)} options={EVENT_TYPES.map((ty) => ({ value: ty, label: t(`etype.${ty}`) }))} />
          </Field>
          <Field label={t("common.assignee")}>
            <Select value={(form.assignedUserId as string) ?? ""} onChange={(e) => set("assignedUserId", e.target.value || null)} placeholder={t("common.selectPlaceholder")} options={users.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))} />
          </Field>
          <Field label={t("cal.recurrence")}>
            <Select value={(form.recurrence as string) ?? "NONE"} onChange={(e) => set("recurrence", e.target.value)} options={[{ value: "NONE", label: t("cal.recurrenceNone") }, { value: "DAILY", label: t("cal.daily") }, { value: "WEEKLY", label: t("cal.weekly") }, { value: "MONTHLY", label: t("cal.monthly") }]} />
          </Field>
          <Field label={t("cal.reminderMin")}><Input type="number" min={0} step={15} value={(form.reminderMinBefore as number) ?? 60} onChange={(e) => set("reminderMinBefore", Number(e.target.value))} /></Field>
        </div>
        <Field label={t("visit.purpose")}><Input value={(form.location as string) ?? ""} onChange={(e) => set("location", e.target.value)} placeholder="Τοποθεσία…" /></Field>
        <Field label={`${t("opp.contact")}`}>
          <ContactPicker value={(form.contactId as string) ?? ""} onChange={(v) => set("contactId", v || null)} />
        </Field>
        <Field label={t("common.notes")}><Textarea rows={2} value={(form.notes as string) ?? ""} onChange={(e) => set("notes", e.target.value)} /></Field>

        {clashes.length > 0 && (
          <div className="rounded-lg bg-rust-soft px-4 py-3 text-[12.5px] text-rust">
            ⚠ {t("cal.conflictWarning")}: {(clashes as { title: string }[]).map((c) => c.title).join(", ")}
          </div>
        )}

        <div className="flex justify-between pt-2 border-t border-line-soft">
          {onDelete ? <Button variant="danger" size="sm" onClick={onDelete}>{t("common.delete")}</Button> : <span />}
          <Button onClick={submit} disabled={busy}>{busy ? t("common.saving") : t("common.save")}</Button>
        </div>
      </div>
    </Modal>
  );
}
