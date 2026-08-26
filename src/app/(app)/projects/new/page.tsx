"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/client";
import { Button, Badge, Field, Input, Select, Textarea } from "@/components/ui";
import { ContactPicker } from "@/components/modules/Contacts";
import { useI18n } from "@/i18n/LanguageProvider";

type AcceptedQuote = {
  id: string;
  number: string;
  projectName: string;
  contactId: string;
  totalGross: string;
};

export default function NewProjectPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [acceptedQuotes, setAcceptedQuotes] = useState<AcceptedQuote[]>([]);
  const [users, setUsers] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [form, setForm] = useState<Record<string, unknown>>({ status: "PLANNING", region: "ATTICA" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ items: AcceptedQuote[] }>("/api/quotations?status=ACCEPTED").then((r) => setAcceptedQuotes(r.items)).catch(() => {});
    api<{ items: typeof users }>("/api/users").then((r) => setUsers(r.items)).catch(() => {});
  }, []);

  const pickQuote = (quoteId: string) => {
    const q = acceptedQuotes.find((x) => x.id === quoteId);
    if (!q) return;
    setForm((f) => ({
      ...f,
      quotationId: q.id,
      name: f.name || q.projectName,
      contactId: q.contactId,
      contractValue: Number(q.totalGross),
    }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const created = await api<{ id: string }>("/api/projects", { body: form });
      router.push(`/projects/${created.id}`);
    } finally {
      setBusy(false);
    }
  };

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="display text-3xl">Νέο έργο</h1>
        <Link href="/projects" className="btn btn-ghost btn-sm">{t("common.back")}</Link>
      </div>

      {acceptedQuotes.length > 0 && (
        <div className="card p-4 bg-clay-soft/40 border-clay/20">
          <p className="eyebrow mb-2">Γρήγορη δημιουργία από αποδεκτή προσφορά</p>
          <Select
            value={(form.quotationId as string) ?? ""}
            onChange={(e) => pickQuote(e.target.value)}
            placeholder="— Επιλογή αποδεκτής προσφοράς —"
            options={acceptedQuotes.map((q) => ({ value: q.id, label: `${q.number} · ${q.projectName}` }))}
          />
        </div>
      )}

      <form onSubmit={submit} className="card p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Field label={`${t("common.name")} *`} required><Input required value={(form.name as string) ?? ""} onChange={(e) => set("name", e.target.value)} /></Field>
        </div>
        <div className="sm:col-span-2">
          <Field label={`${t("opp.contact")} *`}>
            <ContactPicker value={(form.contactId as string) ?? ""} onChange={(v) => set("contactId", v)} />
          </Field>
        </div>
        <Field label={t("project.manager")}>
          <Select value={(form.managerUserId as string) ?? ""} onChange={(e) => set("managerUserId", e.target.value || null)} placeholder={t("common.selectPlaceholder")} options={users.map((u) => ({ value: u.id, label: `${u.firstName} ${u.lastName}` }))} />
        </Field>
        <Field label={`${t("project.contractValue")} €`}>
          <Input type="number" min={0} value={(form.contractValue as number) ?? ""} onChange={(e) => set("contractValue", Number(e.target.value))} />
        </Field>
        <Field label={`${t("project.estimatedCost")} €`}>
          <Input type="number" min={0} value={(form.estimatedCost as number) ?? ""} onChange={(e) => set("estimatedCost", Number(e.target.value))} />
        </Field>
        <Field label={`${t("project.estimatedHours")}`}>
          <Input type="number" min={0} value={(form.estimatedHours as number) ?? ""} onChange={(e) => set("estimatedHours", Number(e.target.value))} />
        </Field>
        <Field label={t("project.startDate")}><Input type="date" value={(form.startDate as string)?.slice(0, 10) ?? ""} onChange={(e) => set("startDate", e.target.value || null)} /></Field>
        <Field label={t("project.plannedEnd")}><Input type="date" value={(form.plannedEndDate as string)?.slice(0, 10) ?? ""} onChange={(e) => set("plannedEndDate", e.target.value || null)} /></Field>
        <Field label={t("common.city")}><Input value={(form.city as string) ?? ""} onChange={(e) => set("city", e.target.value)} /></Field>
        <Field label={t("common.region")}>
          <Select value={(form.region as string) ?? ""} onChange={(e) => set("region", e.target.value)} options={["ATTICA", "PELOPONNESE", "STEREA_ELLADA", "THESSALY", "EPIRUS", "MACEDONIA", "THRACE", "IONIAN_ISLANDS", "AEGEAN_ISLANDS", "CRETE", "OTHER_REGION"].map((r) => ({ value: r, label: t(`reg.${r}`) }))} />
        </Field>
        <div className="sm:col-span-2"><Field label={t("project.scope")}><Textarea rows={3} value={(form.scopeDescription as string) ?? ""} onChange={(e) => set("scopeDescription", e.target.value)} /></Field></div>
        <div className="sm:col-span-2 flex items-center justify-between">
          <Badge>Ο κωδικός έργου θα δημιουργηθεί αυτόματα (CW-P-…)</Badge>
          <Button type="submit" disabled={busy}>{busy ? t("common.saving") : t("common.save")}</Button>
        </div>
      </form>
    </div>
  );
}
