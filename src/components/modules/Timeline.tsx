"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Button, Select, Input, Textarea, Badge } from "@/components/ui";
import { fmtDateTime, useI18n } from "@/i18n/LanguageProvider";

export type ActivityRec = {
  id: string;
  kind: string;
  direction?: string | null;
  subject?: string | null;
  body?: string | null;
  occurredAt: string;
  durationMin?: number | null;
  user?: { firstName: string; lastName: string } | null;
};

const KINDS = ["CALL", "EMAIL", "SMS", "MEETING_LOG", "NOTE"];

/** Chronological interaction timeline + "log interaction" form. */
export function ActivityTimeline({
  filters,
}: {
  filters: Record<string, string>;
}) {
  const { t, lang } = useI18n();
  const [items, setItems] = useState<ActivityRec[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [kind, setKind] = useState("CALL");
  const [direction, setDirection] = useState("out");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const query = new URLSearchParams(filters).toString();

  const load = () =>
    api<{ items: ActivityRec[] }>(`/api/activities?${query}&pageSize=100`)
      .then((r) => setItems(r.items))
      .catch(() => {});

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [query]);

  const save = async () => {
    if (!subject && !body) return;
    await api("/api/activities", {
      body: { ...filters, kind, direction, subject, body },
    });
    setSubject("");
    setBody("");
    setFormOpen(false);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="eyebrow">{t("common.timeline")}</p>
        <Button size="sm" variant={formOpen ? "secondary" : "primary"} onClick={() => setFormOpen(!formOpen)}>
          {formOpen ? t("common.cancel") : `+ ${t("activity.logInteraction")}`}
        </Button>
      </div>

      {formOpen && (
        <div className="card p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select value={kind} onChange={(e) => setKind(e.target.value)} options={KINDS.map((k) => ({ value: k, label: t(`akind.${k}`) }))} />
            <Select value={direction} onChange={(e) => setDirection(e.target.value)} options={[{ value: "out", label: t("activity.outgoing") }, { value: "in", label: t("activity.incoming") }]} />
          </div>
          <Input placeholder={t("activity.subject")} value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea placeholder="…" value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
          <div className="flex justify-end">
            <Button size="sm" onClick={save}>{t("common.save")}</Button>
          </div>
        </div>
      )}

      {items === null ? (
        <p className="text-sm text-ink-faint py-4">…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-ink-faint text-center py-6">{t("common.noData")}</p>
      ) : (
        <ol className="relative border-l border-line ml-3 space-y-5">
          {items.map((a) => (
            <li key={a.id} className="ml-5 relative">
              <span
                className={`absolute -left-[26px] top-1 w-3.5 h-3.5 rounded-full border-2 border-paper ${
                  a.kind === "CALL" ? "bg-slateblue" : a.kind === "EMAIL" ? "bg-amber-warm" : a.kind === "SYSTEM" ? "bg-ink-faint" : "bg-clay"
                }`}
              />
              <div className="flex flex-wrap items-baseline gap-2">
                <Badge tone={a.direction === "in" ? "slate" : "clay"}>
                  {t(`akind.${a.kind}`)}
                  {a.durationMin ? ` · ${a.durationMin}′` : ""}
                </Badge>
                <span className="text-[11px] text-ink-faint">{fmtDateTime(a.occurredAt, lang)}</span>
                {a.user && <span className="text-[11px] text-ink-faint">· {a.user.firstName}</span>}
              </div>
              {a.subject && <p className="text-[13px] font-medium mt-1">{a.subject}</p>}
              {a.body && <p className="text-[13px] text-ink-soft whitespace-pre-wrap mt-0.5">{a.body}</p>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Internal comments with @mentions */
export function Comments({ entityType, entityId }: { entityType: string; entityId: string }) {
  const { t } = useI18n();
  const [comments, setComments] = useState<{ id: string; body: string; createdAt: string; user?: { firstName: string; lastName: string; color?: string }; mentions: string[] }[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    api<{ items: typeof comments }>(`/api/comments?entityType=${entityType}&entityId=${entityId}`)
      .then((r) => setComments(r.items))
      .catch(() => {});
  }, [entityType, entityId]);

  const post = async () => {
    if (!draft.trim()) return;
    const mentions = Array.from(draft.matchAll(/@([\wéήίόάέώϊΐϋΰ]+[\s]?[\w]*)/gi)).map((m) => m[1]);
    await api("/api/comments", { body: { entityType, entityId, body: draft, mentions } });
    setDraft("");
    const r = await api<{ items: typeof comments }>(`/api/comments?entityType=${entityType}&entityId=${entityId}`);
    setComments(r.items);
  };

  return (
    <div>
      <p className="eyebrow mb-2">{t("common.comments")}</p>
      <p className="text-[10.5px] text-ink-faint mb-2">{t("comment.internalOnly")}</p>
      <div className="space-y-2 mb-3">
        {comments.map((c) => (
          <div key={c.id} className="bg-parchment/60 rounded-lg px-3.5 py-2.5">
            <p className="text-[12px] font-semibold">
              {c.user ? `${c.user.firstName} ${c.user.lastName}` : "?"}
              <span className="font-normal text-ink-faint ml-2">{fmtDateTime(c.createdAt)}</span>
            </p>
            <p className="text-[13px] mt-0.5 whitespace-pre-wrap">{c.body}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input placeholder={t("comment.placeholder")} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && post()} />
        <Button size="sm" onClick={post}>→</Button>
      </div>
    </div>
  );
}
