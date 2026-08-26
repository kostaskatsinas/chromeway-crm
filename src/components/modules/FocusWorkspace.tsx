"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Badge, Button, EmptyState, StatusBadge, useToast } from "@/components/ui";

export type FocusItem = {
  id: string;
  kind: "task" | "opportunity" | "visit" | "quotation" | "project" | "invoice";
  title: string;
  context: string;
  dueAt?: string | null;
  urgency: "critical" | "high" | "medium" | "normal";
  href: string;
  status: string;
  completable?: boolean;
};

const KIND_META: Record<FocusItem["kind"], { label: string; icon: string }> = {
  task: { label: "Εργασία", icon: "✓" },
  opportunity: { label: "Ευκαιρία", icon: "⇉" },
  visit: { label: "Επίσκεψη", icon: "⌖" },
  quotation: { label: "Προσφορά", icon: "▤" },
  project: { label: "Έργο", icon: "▦" },
  invoice: { label: "Τιμολόγιο", icon: "€" },
};

function isSameDay(value: string | null | undefined, date: Date) {
  if (!value) return false;
  const target = new Date(value);
  return target.getFullYear() === date.getFullYear() && target.getMonth() === date.getMonth() && target.getDate() === date.getDate();
}

function dueLabel(value: string | null | undefined, now: Date) {
  if (!value) return "Χωρίς ημερομηνία";
  const date = new Date(value);
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / 86400000);
  if (diffDays < 0) return `${Math.abs(diffDays)}ημ. καθυστέρηση`;
  if (diffDays === 0) return "Σήμερα";
  if (diffDays === 1) return "Αύριο";
  return date.toLocaleDateString("el-GR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function FocusWorkspace({ userName, initialItems, nowIso }: { userName: string; initialItems: FocusItem[]; nowIso: string }) {
  const { toast } = useToast();
  const [items, setItems] = useState(initialItems);
  const [scope, setScope] = useState<"all" | "today" | "overdue">("all");
  const [kind, setKind] = useState<FocusItem["kind"] | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const today = useMemo(() => new Date(nowIso), [nowIso]);

  const filtered = useMemo(() => items.filter((item) => {
    if (kind !== "all" && item.kind !== kind) return false;
    if (scope === "overdue" && item.urgency !== "critical") return false;
    if (scope === "today" && !isSameDay(item.dueAt, today)) return false;
    return true;
  }), [items, kind, scope, today]);

  const counts = {
    overdue: items.filter((item) => item.urgency === "critical").length,
    today: items.filter((item) => isSameDay(item.dueAt, today)).length,
    noDate: items.filter((item) => !item.dueAt).length,
  };

  const completeTask = async (item: FocusItem) => {
    setBusyId(item.id);
    try {
      await api(`/api/tasks/${item.id}`, { method: "PATCH", body: { status: "DONE" } });
      setItems((current) => current.filter((candidate) => !(candidate.kind === "task" && candidate.id === item.id)));
      toast("Η εργασία ολοκληρώθηκε");
    } catch (error) {
      toast(String((error as Error).message), "err");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Προσωπικός χώρος εργασίας</p>
          <h1 className="display text-4xl mt-1">{userName}, τι χρειάζεται προσοχή</h1>
          <p className="text-[13px] text-ink-faint mt-1">Εργασίες, follow-ups, επισκέψεις και εκκρεμότητες σε μία σειρά προτεραιότητας.</p>
        </div>
        <Link href="/calendar" className="btn btn-secondary">Άνοιγμα ημερολογίου</Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
        <button className={`card p-4 text-left ${scope === "overdue" ? "ring-2 ring-rust" : ""}`} onClick={() => setScope(scope === "overdue" ? "all" : "overdue")}>
          <p className="eyebrow">Εκπρόθεσμα</p><p className="display text-2xl text-rust mt-1">{counts.overdue}</p>
        </button>
        <button className={`card p-4 text-left ${scope === "today" ? "ring-2 ring-clay" : ""}`} onClick={() => setScope(scope === "today" ? "all" : "today")}>
          <p className="eyebrow">Σήμερα</p><p className="display text-2xl mt-1">{counts.today}</p>
        </button>
        <div className="card p-4"><p className="eyebrow">Χωρίς ημερομηνία</p><p className="display text-2xl text-amber-warm mt-1">{counts.noDate}</p></div>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Φίλτρο τύπου εργασίας">
        <Button size="sm" variant={kind === "all" ? "secondary" : "ghost"} onClick={() => setKind("all")}>Όλα · {items.length}</Button>
        {(Object.keys(KIND_META) as FocusItem["kind"][]).map((itemKind) => {
          const count = items.filter((item) => item.kind === itemKind).length;
          if (!count) return null;
          return <Button key={itemKind} size="sm" variant={kind === itemKind ? "secondary" : "ghost"} onClick={() => setKind(itemKind)}>{KIND_META[itemKind].icon} {KIND_META[itemKind].label} · {count}</Button>;
        })}
      </div>

      {filtered.length === 0 ? <EmptyState icon="✓" title="Η ουρά είναι καθαρή" hint="Δεν υπάρχουν εκκρεμότητες για το επιλεγμένο φίλτρο." /> : (
        <ol className="space-y-2 max-w-5xl">
          {filtered.map((item) => {
            const meta = KIND_META[item.kind];
            return (
              <li key={`${item.kind}-${item.id}`} className={`card p-4 flex flex-col sm:flex-row sm:items-center gap-3 border-l-4 ${item.urgency === "critical" ? "border-l-rust" : item.urgency === "high" ? "border-l-amber-warm" : item.urgency === "medium" ? "border-l-clay" : "border-l-line"}`}>
                <span className="w-9 h-9 rounded-lg bg-parchment flex items-center justify-center text-clay shrink-0" aria-hidden="true">{meta.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{meta.label}</Badge>
                    <StatusBadge status={item.status} />
                    <span className={`text-[11px] font-semibold ${item.urgency === "critical" ? "text-rust" : item.urgency === "high" ? "text-amber-warm" : "text-ink-faint"}`}>{dueLabel(item.dueAt, today)}</span>
                  </div>
                  <p className="text-[14px] font-semibold mt-1.5">{item.title}</p>
                  <p className="text-[11.5px] text-ink-faint truncate mt-0.5">{item.context}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {item.kind === "task" && item.completable && <Button size="sm" variant="secondary" disabled={busyId === item.id} onClick={() => completeTask(item)}>✓ Ολοκλήρωση</Button>}
                  <Link href={item.href} className="btn btn-primary btn-sm">Άνοιγμα</Link>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
