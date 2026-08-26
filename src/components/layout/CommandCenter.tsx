"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Button, Checkbox, Field, Input, Modal, Select, Textarea, useToast } from "@/components/ui";
import { ContactPicker } from "@/components/modules/Contacts";

type Command = { href: string; label: string; icon: string; group: "navigation" | "create" };
type SearchHit = { type: string; id: string; title: string; sub?: string; href: string };

export function CommandCenter({
  open,
  onClose,
  commands,
  canLogActivity,
  onLogActivity,
}: {
  open: boolean;
  onClose: () => void;
  commands: Command[];
  canLogActivity: boolean;
  onLogActivity: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHits([]);
  }, [open]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setHits([]);
      return;
    }
    const timer = setTimeout(() => {
      api<{ hits: SearchHit[] }>(`/api/search?q=${encodeURIComponent(query.trim())}`)
        .then((response) => setHits(response.hits))
        .catch(() => setHits([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [open, query]);

  const localMatches = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("el");
    if (!normalized) return commands;
    return commands.filter((command) => command.label.toLocaleLowerCase("el").includes(normalized));
  }, [commands, query]);

  const closeForNavigation = () => {
    setQuery("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Μετάβαση ή δημιουργία" wide initialFocusRef={inputRef}>
      <div className="space-y-4">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden="true">⌕</span>
          <Input ref={inputRef} className="pl-8 h-11" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Αναζήτηση εγγραφών ή εντολών…" />
        </div>

        {!query && canLogActivity && (
          <button
            type="button"
            onClick={() => { onClose(); onLogActivity(); }}
            className="w-full flex items-center gap-3 rounded-lg border border-clay/25 bg-clay-soft/40 px-4 py-3 text-left hover:bg-clay-soft"
          >
            <span className="w-8 h-8 rounded-lg bg-clay text-white flex items-center justify-center" aria-hidden="true">☎</span>
            <span>
              <span className="block text-[13px] font-semibold">Καταγραφή επικοινωνίας</span>
              <span className="block text-[11px] text-ink-faint">Κλήση, email, SMS, συνάντηση ή σημείωση</span>
            </span>
            <span className="ml-auto text-[10px] text-ink-faint">Quick action</span>
          </button>
        )}

        <div className="max-h-[52vh] overflow-y-auto -mx-2 px-2 space-y-4">
          {localMatches.length > 0 && (
            <section>
              <p className="eyebrow px-2 mb-1">Εντολές</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {localMatches.map((command) => (
                  <Link key={`${command.group}-${command.href}`} href={command.href} onClick={closeForNavigation} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-parchment/70">
                    <span className="w-6 text-center text-clay" aria-hidden="true">{command.icon}</span>
                    <span className="text-[13px] font-medium">{command.label}</span>
                    <span className="ml-auto text-[10px] text-ink-faint">{command.group === "create" ? "Δημιουργία" : "Μετάβαση"}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {query.trim().length >= 2 && (
            <section>
              <p className="eyebrow px-2 mb-1">Εγγραφές</p>
              {hits.length === 0 ? (
                <p className="px-3 py-4 text-sm text-ink-faint">Δεν βρέθηκαν εγγραφές</p>
              ) : hits.map((hit) => (
                <Link key={`${hit.type}-${hit.id}`} href={hit.href} onClick={closeForNavigation} className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-parchment/70">
                  <span className="badge bg-parchment text-ink-soft w-24 justify-center">{hit.type}</span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium truncate">{hit.title}</span>
                    {hit.sub && <span className="block text-[11px] text-ink-faint truncate">{hit.sub}</span>}
                  </span>
                </Link>
              ))}
            </section>
          )}
        </div>

        <div className="flex justify-between border-t border-line-soft pt-3 text-[10.5px] text-ink-faint">
          <span>Cmd/Ctrl+K για άνοιγμα</span>
          <span>Esc για κλείσιμο</span>
        </div>
      </div>
    </Modal>
  );
}

export function QuickActivityModal({ open, onClose, presetContactId = "", presetOpportunityId = "" }: { open: boolean; onClose: () => void; presetContactId?: string; presetOpportunityId?: string }) {
  const { toast } = useToast();
  const subjectRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ kind: "CALL", direction: "out", contactId: "", opportunityId: "", subject: "", body: "", durationMin: 5, createFollowUp: true, followUpTitle: "", followUpDate: "" });

  useEffect(() => {
    if (open) {
      const due = new Date();
      due.setDate(due.getDate() + 2);
      setForm({ kind: "CALL", direction: "out", contactId: presetContactId, opportunityId: presetOpportunityId, subject: "", body: "", durationMin: 5, createFollowUp: true, followUpTitle: "", followUpDate: due.toISOString().slice(0, 10) });
    }
  }, [open, presetContactId, presetOpportunityId]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api("/api/activities/quick-log", {
        body: {
          kind: form.kind,
          subject: form.subject,
          body: form.body,
          contactId: form.contactId || null,
          opportunityId: form.opportunityId || null,
          direction: form.kind === "NOTE" ? null : form.direction,
          durationMin: form.kind === "CALL" || form.kind === "MEETING_LOG" ? form.durationMin : null,
          occurredAt: new Date().toISOString(),
          followUp: form.createFollowUp ? {
            title: form.followUpTitle || `Follow-up: ${form.subject}`,
            dueDate: form.followUpDate,
            priority: "MEDIUM",
          } : null,
        },
      });
      toast(form.createFollowUp ? "Η επικοινωνία και το follow-up καταγράφηκαν" : "Η επικοινωνία καταγράφηκε");
      onClose();
    } catch (error) {
      toast(String((error as Error).message), "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Γρήγορη καταγραφή επικοινωνίας" initialFocusRef={subjectRef}>
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Τύπος">
            <Select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })} options={[
              { value: "CALL", label: "Κλήση" }, { value: "EMAIL", label: "Email" }, { value: "SMS", label: "SMS" },
              { value: "MEETING_LOG", label: "Συνάντηση" }, { value: "NOTE", label: "Σημείωση" },
            ]} />
          </Field>
          {form.kind !== "NOTE" && <Field label="Κατεύθυνση"><Select value={form.direction} onChange={(event) => setForm({ ...form, direction: event.target.value })} options={[{ value: "out", label: "Εξερχόμενη" }, { value: "in", label: "Εισερχόμενη" }]} /></Field>}
        </div>
        <Field label="Επαφή"><ContactPicker value={form.contactId} onChange={(contactId) => setForm({ ...form, contactId })} /></Field>
        <Field label="Θέμα *" required><Input ref={subjectRef} required value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} placeholder="Τι συζητήθηκε ή συμφωνήθηκε;" /></Field>
        {(form.kind === "CALL" || form.kind === "MEETING_LOG") && <Field label="Διάρκεια (λεπτά)"><Input type="number" min={1} max={480} value={form.durationMin} onChange={(event) => setForm({ ...form, durationMin: Number(event.target.value) })} /></Field>}
        <Field label="Σημειώσεις"><Textarea rows={3} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="Αποτέλεσμα, επόμενη ενέργεια, δεσμεύσεις…" /></Field>
        <div className="rounded-xl border border-clay/25 bg-clay-soft/30 p-3 space-y-3">
          <Checkbox checked={form.createFollowUp} onChange={(event) => setForm({ ...form, createFollowUp: event.target.checked })} label="Δημιουργία follow-up εργασίας" />
          {form.createFollowUp && <div className="grid grid-cols-1 sm:grid-cols-[1fr_9rem] gap-3">
            <Field label="Επόμενη ενέργεια"><Input value={form.followUpTitle} onChange={(event) => setForm({ ...form, followUpTitle: event.target.value })} placeholder={form.subject ? `Follow-up: ${form.subject}` : "π.χ. Αποστολή δειγμάτων"} /></Field>
            <Field label="Ημερομηνία *" required><Input type="date" required value={form.followUpDate} onChange={(event) => setForm({ ...form, followUpDate: event.target.value })} /></Field>
          </div>}
          <p className="text-[11px] text-ink-faint">Η εργασία ανατίθεται αυτόματα σε εσάς και εμφανίζεται στο My Work.</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-line-soft pt-3">
          <Button type="button" variant="secondary" onClick={onClose}>Ακύρωση</Button>
          <Button type="submit" disabled={busy}>{busy ? "Καταγραφή…" : "Καταγραφή"}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function ContactQuickActivity({ contactId }: { contactId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>☎ Καταγραφή</Button>
      <QuickActivityModal open={open} onClose={() => setOpen(false)} presetContactId={contactId} />
    </>
  );
}
