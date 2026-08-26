"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Button, Badge, Modal, Field, Input, Select, Textarea, Checkbox, Spinner, Avatar, useToast } from "@/components/ui";
import { useI18n } from "@/i18n/LanguageProvider";

export type TaskRow = {
  id: string;
  title: string;
  description?: string | null;
  milestone: boolean;
  status: string;
  priority: string;
  dueDate?: string | null;
  position: number;
  projectId?: string | null;
  assigneeUserId?: string | null;
  dependsOnTaskId?: string | null;
  assignee?: { id: string; firstName: string; lastName: string; color: string } | null;
  project?: { code: string; name: string } | null;
};

const COLUMNS = [
  { key: "TODO", tone: "" },
  { key: "IN_PROGRESS_TASK", tone: "" },
  { key: "DONE", tone: "" },
] as const;

const PRIO_TONES: Record<string, "neutral" | "amber" | "rust" | "clay"> = {
  LOW: "neutral",
  MEDIUM: "clay",
  HIGH: "amber",
  URGENT: "rust",
};

export function TaskBoard({
  fixedProjectId,
  compact,
  currentUserId,
  canEdit = true,
}: {
  fixedProjectId?: string;
  compact?: boolean;
  currentUserId?: string;
  canEdit?: boolean;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<TaskRow[] | null>(null);
  const [users, setUsers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragCol, setDragCol] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<TaskRow> | null>(null);
  const [query, setQuery] = useState("");
  const [mine, setMine] = useState(false);
  const [priority, setPriority] = useState("");
  const [assigneeId, setAssigneeId] = useState("");

  useEffect(() => {
    if (fixedProjectId) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("mine") === "1") setMine(true);
    if (params.get("priority")) setPriority(params.get("priority") ?? "");
    if (params.get("assignee")) setAssigneeId(params.get("assignee") ?? "");
  }, [fixedProjectId]);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ pageSize: "300" });
      if (fixedProjectId) params.set("projectId", fixedProjectId);
      else params.set("status", "");
      const res = await api<{ items: TaskRow[] }>(`/api/tasks?${params}`);
      setTasks(res.items);
    } catch {
      setTasks([]);
    }
  }, [fixedProjectId]);

  useEffect(() => {
    load();
    api<{ items: typeof users }>("/api/users").then((r) => setUsers(r.items)).catch(() => {});
     
  }, [load]);

  const move = async (id: string, status: string) => {
    if (!canEdit) return;
    setTasks((prev) => prev && prev.map((x) => (x.id === id ? { ...x, status } : x)));
    try {
      await api(`/api/tasks/${id}`, { method: "PATCH", body: { status } });
      load();
    } catch (e) {
      toast(String(e), "err");
      load();
    }
  };

  const filteredTasks = (tasks ?? []).filter((task) => {
    const matchesQuery = !query || `${task.title} ${task.description ?? ""} ${task.project?.code ?? ""}`.toLocaleLowerCase("el").includes(query.toLocaleLowerCase("el"));
    return matchesQuery && (!mine || task.assigneeUserId === currentUserId) && (!priority || task.priority === priority) && (!assigneeId || task.assigneeUserId === assigneeId);
  });

  const updateUrl = (updates: Record<string, string | null>) => {
    if (fixedProjectId) return;
    const url = new URL(window.location.href);
    Object.entries(updates).forEach(([key, value]) => value ? url.searchParams.set(key, value) : url.searchParams.delete(key));
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {!fixedProjectId && <>
          <Input className="w-full sm:!w-64" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Αναζήτηση εργασιών…" />
          {currentUserId && <Button variant={mine ? "secondary" : "ghost"} size="sm" aria-pressed={mine} onClick={() => { const next = !mine; setMine(next); updateUrl({ mine: next ? "1" : null }); }}>Μόνο δικές μου</Button>}
          <Select className="!w-auto" value={priority} onChange={(event) => { setPriority(event.target.value); updateUrl({ priority: event.target.value || null }); }} placeholder="Προτεραιότητα" options={["LOW", "MEDIUM", "HIGH", "URGENT"].map((value) => ({ value, label: t(`prio.${value}`) }))} />
          <Select className="!w-auto" value={assigneeId} onChange={(event) => { setAssigneeId(event.target.value); updateUrl({ assignee: event.target.value || null }); }} placeholder="Υπεύθυνος" options={users.map((user) => ({ value: user.id, label: `${user.firstName} ${user.lastName}` }))} />
        </>}
        <div className="flex-1" />
        {canEdit && <Button size={compact ? "sm" : undefined} onClick={() => { setEditing(null); setFormOpen(true); }}>+ Εργασία</Button>}
      </div>
      {canEdit && <TaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        initial={editing ?? undefined}
        presetProjectId={fixedProjectId}
        users={users}
        allTasks={tasks ?? []}
      />}

      {!tasks ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {COLUMNS.map(({ key }) => {
            const items = filteredTasks.filter((x) => x.status === key).sort((a, b) => a.position - b.position);
            return (
              <div
                key={key}
                onDragOver={(e) => { if (!canEdit) return; e.preventDefault(); setDragCol(key); }}
                onDragLeave={() => setDragCol(null)}
                onDrop={() => { if (dragId) move(dragId, key); setDragCol(null); setDragId(null); }}
                className={`rounded-xl p-2 min-h-[120px] ${dragCol === key ? "kanban-drop-active" : "bg-parchment/50"}`}
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint px-1 mb-2 flex justify-between">
                  <span>{t(`tstatus.${key}`)}</span>
                  <span>{items.length}</span>
                </p>
                {items.map((task) => (
                  <div
                    key={task.id}
                    draggable={canEdit}
                    onDragStart={() => setDragId(task.id)}
                    onClick={() => { if (canEdit) { setEditing(task); setFormOpen(true); } }}
                    className={`kanban-card card relative group p-3 mb-2 select-none ${canEdit ? "cursor-grab" : "cursor-default"} ${dragId === task.id ? "opacity-40" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-medium leading-snug">{task.title}</p>
                      {task.milestone && <Badge tone="clay">◆</Badge>}
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-line-soft">
                      <span className="flex items-center gap-1.5">
                        <Badge tone={PRIO_TONES[task.priority]}>{t(`prio.${task.priority}`)}</Badge>
                        {task.dueDate && (
                          <span className={`text-[10.5px] ${new Date(task.dueDate) < new Date() && task.status !== "DONE" ? "text-rust font-semibold" : "text-ink-faint"}`}>
                            {new Date(task.dueDate).toLocaleDateString("el-GR", { day: "numeric", month: "short" })}
                          </span>
                        )}
                        {!fixedProjectId && task.project && (
                          <span className="text-[10px] text-clay">{task.project.code}</span>
                        )}
                      </span>
                      {task.assignee && <Avatar name={`${task.assignee.firstName} ${task.assignee.lastName}`} color={task.assignee.color} size={20} />}
                    </div>
                    {canEdit && <div className="flex gap-2 mt-2 sm:hidden" onClick={(event) => event.stopPropagation()}>
                      <Select className="text-xs" value={task.status} onChange={(event) => move(task.id, event.target.value)} options={COLUMNS.map((column) => ({ value: column.key, label: t(`tstatus.${column.key}`) }))} />
                    </div>}
                    {canEdit && task.status !== "DONE" && <button type="button" aria-label={`Ολοκλήρωση ${task.title}`} className="hidden sm:block absolute top-2 right-2 w-7 h-7 rounded-full border border-line bg-surface text-ink-faint hover:border-olive hover:text-olive opacity-0 group-hover:opacity-100" onClick={(event) => { event.stopPropagation(); move(task.id, "DONE"); }}>✓</button>}
                  </div>
                ))}
                {items.length === 0 && <div className="h-10 border border-dashed border-line rounded-lg" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TaskForm({
  open,
  onClose,
  onSaved,
  initial,
  presetProjectId,
  users,
  allTasks,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: Partial<TaskRow>;
  presetProjectId?: string;
  users: { id: string; firstName: string; lastName: string }[];
  allTasks: TaskRow[];
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [projects, setProjects] = useState<{ id: string; code: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!presetProjectId) api<{ items: typeof projects }>("/api/projects?pageSize=200").then((r) => setProjects(r.items)).catch(() => {});
  }, [presetProjectId]);

  useEffect(() => {
    if (open)
      setForm({
        status: "TODO",
        priority: "MEDIUM",
        milestone: false,
        ...(initial ?? {}),
        ...(presetProjectId ? { projectId: presetProjectId } : {}),
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (initial?.id) await api(`/api/tasks/${initial.id}`, { method: "PATCH", body: form });
      else await api("/api/tasks", { body: form });
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
    <Modal open={open} onClose={onClose} title={initial?.id ? t("common.edit") : "Νέα εργασία"}>
      <form onSubmit={submit} className="space-y-4">
        <Field label={`${t("task.title")} *`}>
          <Input required value={(form.title as string) ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="π.χ. Αστάρωση τοίχων ισογείου" />
        </Field>
        {!presetProjectId && (
          <Field label="Έργο">
            <Select value={(form.projectId as string) ?? ""} onChange={(e) => set("projectId", e.target.value || null)} placeholder={t("common.selectPlaceholder")} options={projects.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))} />
          </Field>
        )}
        <Field label={t("common.description")}>
          <Textarea rows={2} value={(form.description as string) ?? ""} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("common.status")}>
            <Select value={(form.status as string) ?? ""} onChange={(e) => set("status", e.target.value)} options={["TODO", "IN_PROGRESS_TASK", "DONE", "CANCELLED"].map((s) => ({ value: s, label: t(`tstatus.${s}`) }))} />
          </Field>
          <Field label={t("common.priority")}>
            <Select value={(form.priority as string) ?? ""} onChange={(e) => set("priority", e.target.value)} options={["LOW", "MEDIUM", "HIGH", "URGENT"].map((s) => ({ value: s, label: t(`prio.${s}`) }))} />
          </Field>
          <Field label={t("common.assignee")}>
            <Select value={(form.assigneeUserId as string) ?? ""} onChange={(e) => set("assigneeUserId", e.target.value || null)} placeholder={t("common.selectPlaceholder")} options={users.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))} />
          </Field>
          <Field label={t("common.dueDate")}>
            <Input type="date" value={(form.dueDate as string)?.slice(0, 10) ?? ""} onChange={(e) => set("dueDate", e.target.value || null)} />
          </Field>
          <Field label={t("task.dependsOn")}>
            <Select
              value={(form.dependsOnTaskId as string) ?? ""}
              onChange={(e) => set("dependsOnTaskId", e.target.value || null)}
              placeholder="—"
              options={allTasks.filter((x) => x.id !== initial?.id).map((x) => ({ value: x.id, label: x.title.slice(0, 40) }))}
            />
          </Field>
          <div className="flex items-end pb-1">
            <Checkbox checked={!!form.milestone} onChange={(e) => set("milestone", e.target.checked)} label={t("task.milestone")} />
          </div>
        </div>
        <div className="flex justify-end"><Button type="submit" disabled={busy}>{busy ? t("common.saving") : t("common.save")}</Button></div>
      </form>
    </Modal>
  );
}
