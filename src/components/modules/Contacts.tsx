"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Button, Badge, Modal, Field, Input, Select, Textarea, Checkbox, TagsInput, EmptyState, DebouncedSearch, Pagination, Spinner, Avatar, useConfirm, useToast } from "@/components/ui";
import { useI18n } from "@/i18n/LanguageProvider";
import { BulkActionBar, TableViewControls, useTablePreferences, type TableColumn } from "@/components/DataTableControls";
import { downloadCsv } from "@/lib/client-csv";

export type ContactRow = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  city?: string | null;
  region: string;
  businessType: string;
  leadSource: string;
  gdprConsent: boolean;
  tags: string[];
  company?: { id: string; name: string } | null;
};

const BIZ = ["PRIVATE_CUSTOMER", "ARCHITECT", "INTERIOR_DESIGNER", "CONTRACTOR", "HOTEL", "RESTAURANT", "RETAIL_BUSINESS", "OFFICE", "OTHER_BUSINESS"];
const SOURCES = ["WEBSITE", "REFERRAL", "INSTAGRAM", "FACEBOOK", "GOOGLE_SEARCH", "WALK_IN", "EXHIBITION", "PARTNER", "COLD_OUTREACH", "REPEAT_CUSTOMER", "OTHER"];
const REGIONS = ["ATTICA", "PELOPONNESE", "STEREA_ELLADA", "THESSALY", "EPIRUS", "MACEDONIA", "THRACE", "IONIAN_ISLANDS", "AEGEAN_ISLANDS", "CRETE", "OTHER_REGION"];
const CONTACT_COLUMNS: TableColumn[] = [
  { key: "name", label: "Όνομα", locked: true },
  { key: "businessType", label: "Τύπος" },
  { key: "company", label: "Επιχείρηση" },
  { key: "phone", label: "Τηλέφωνο" },
  { key: "city", label: "Πόλη / περιοχή" },
  { key: "tags", label: "Ετικέτες" },
  { key: "gdpr", label: "GDPR" },
  { key: "actions", label: "Ενέργειες", locked: true },
];

export function ContactForm({
  open,
  onClose,
  onSaved,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: Partial<ContactRow> & { id?: string; notes?: string | null; postalCode?: string | null; street?: string | null; preferredLanguage?: string; marketingOptIn?: boolean; companyId?: string | null; position?: string | null };
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        businessType: "PRIVATE_CUSTOMER",
        leadSource: "REFERRAL",
        region: "ATTICA",
        preferredLanguage: "el",
        gdprConsent: false,
        marketingOptIn: false,
        tags: [],
        ...initial,
      });
    }
  }, [open, initial]);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (initial?.id) await api(`/api/contacts/${initial.id}`, { method: "PATCH", body: form });
      else await api("/api/contacts", { body: form });
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
    <Modal open={open} onClose={onClose} title={initial?.id ? t("common.edit") : t("contact.newContact")} wide>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label={`${t("contact.firstName")} *`}>
          <Input required value={(form.firstName as string) ?? ""} onChange={(e) => set("firstName", e.target.value)} />
        </Field>
        <Field label={`${t("contact.lastName")} *`}>
          <Input required value={(form.lastName as string) ?? ""} onChange={(e) => set("lastName", e.target.value)} />
        </Field>
        <Field label={t("common.email")}>
          <Input type="email" value={(form.email as string) ?? ""} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label={t("common.phone")}>
          <Input value={(form.phone as string) ?? ""} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label={t("common.mobile")}>
          <Input value={(form.mobile as string) ?? ""} onChange={(e) => set("mobile", e.target.value)} />
        </Field>
        <Field label={t("contact.position")}>
          <Input value={(form.position as string) ?? ""} onChange={(e) => set("position", e.target.value)} />
        </Field>
        <Field label={t("company.businessType")}>
          <Select value={(form.businessType as string) ?? ""} onChange={(e) => set("businessType", e.target.value)} options={BIZ.map((b) => ({ value: b, label: t(`biz.${b}`) }))} />
        </Field>
        <Field label={t("contact.source")}>
          <Select value={(form.leadSource as string) ?? ""} onChange={(e) => set("leadSource", e.target.value)} options={SOURCES.map((s) => ({ value: s, label: t(`src.${s}`) }))} />
        </Field>
        <Field label={t("contact.company")}>
          <CompanyPicker value={(form.companyId as string) ?? ""} onChange={(v) => set("companyId", v || null)} />
        </Field>
        <Field label={t("common.address")}>
          <Input value={(form.street as string) ?? ""} onChange={(e) => set("street", e.target.value)} />
        </Field>
        <Field label={t("common.city")}>
          <Input value={(form.city as string) ?? ""} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("common.postalCode")}>
            <Input value={(form.postalCode as string) ?? ""} onChange={(e) => set("postalCode", e.target.value)} />
          </Field>
          <Field label={t("common.region")}>
            <Select value={(form.region as string) ?? ""} onChange={(e) => set("region", e.target.value)} options={REGIONS.map((r) => ({ value: r, label: t(`reg.${r}`) }))} />
          </Field>
        </div>
        <Field label={t("contact.preferredLanguage")}>
          <Select value={(form.preferredLanguage as string) ?? "el"} onChange={(e) => set("preferredLanguage", e.target.value)} options={[{ value: "el", label: "Ελληνικά" }, { value: "en", label: "English" }]} />
        </Field>
        <Field label={t("common.tags")}>
          <TagsInput value={(form.tags as string[]) ?? []} onChange={(v) => set("tags", v)} placeholder="VIP, Αθήνα…" />
        </Field>
        <div className="md:col-span-2">
          <Field label={t("common.notes")}>
            <Textarea value={(form.notes as string) ?? ""} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </Field>
        </div>
        <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
          <div className="flex flex-col gap-2">
            <Checkbox checked={!!form.gdprConsent} onChange={(e) => set("gdprConsent", e.target.checked)} label={t("contact.gdprConsent")} />
            <Checkbox checked={!!form.marketingOptIn} onChange={(e) => set("marketingOptIn", e.target.checked)} label={t("contact.marketingOptIn")} />
          </div>
          <Button type="submit" disabled={busy}>{busy ? t("common.saving") : t("common.save")}</Button>
        </div>
      </form>
    </Modal>
  );
}

function CompanyPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    api<{ items: { id: string; name: string }[] }>(`/api/companies?pageSize=200${q ? `&q=${encodeURIComponent(q)}` : ""}`)
      .then((r) => setCompanies(r.items))
      .catch(() => {});
  }, [q]);
  return (
    <div className="space-y-1">
      <Input placeholder="Φίλτρο επιχειρήσεων…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-1" />
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t0()}
        options={companies.map((c) => ({ value: c.id, label: c.name }))}
      />
    </div>
  );
}
function t0() {
  return "— Χωρίς —";
}

export function ContactsTable({ canEdit, canDelete }: { canEdit: boolean; canDelete: boolean }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [biz, setBiz] = useState("");
  const [region, setRegion] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<ContactRow> | undefined>();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const table = useTablePreferences("crm.contacts.table", CONTACT_COLUMNS);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "25" });
      if (q) params.set("q", q);
      if (biz) params.set("businessType", biz);
      if (region) params.set("region", region);
      const res = await api<{ items: ContactRow[]; total: number }>(`/api/contacts?${params}`);
      setRows(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page, q, biz, region]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const available = new Set(rows.map((row) => row.id));
    setSelected((current) => new Set([...current].filter((id) => available.has(id))));
  }, [rows]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      setEditing(undefined);
      setFormOpen(true);
    }
  }, []);

  const remove = async (id: string) => {
    if (!(await confirm(t("common.confirmDelete")))) return;
    try {
      await api(`/api/contacts/${id}`, { method: "DELETE" });
      toast(t("common.savedOk"));
      load();
    } catch (e) {
      toast(String((e as Error).message), "err");
    }
  };

  const pages = Math.ceil(total / 25);
  const allVisibleSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));
  const selectedRows = rows.filter((row) => selected.has(row.id));
  return (
    <div className="space-y-4">
      {dialog}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="w-full sm:w-64">
          <DebouncedSearch onSearch={(v) => { setPage(1); setQ(v); }} placeholder={`${t("common.search")}…`} />
        </div>
        <Select
          className="w-auto"
          value={biz}
          onChange={(e) => { setPage(1); setBiz(e.target.value); }}
          placeholder={t("company.businessType")}
          options={BIZ.map((b) => ({ value: b, label: t(`biz.${b}`) }))}
        />
        <Select
          className="w-auto"
          value={region}
          onChange={(e) => { setPage(1); setRegion(e.target.value); }}
          placeholder={t("common.region")}
          options={REGIONS.map((r) => ({ value: r, label: t(`reg.${r}`) }))}
        />
        <div className="flex-1" />
        <TableViewControls columns={CONTACT_COLUMNS} visible={table.visible} onToggleColumn={table.toggleColumn} density={table.density} onDensity={table.setDensity} />
        {canEdit && <Button onClick={() => { setEditing(undefined); setFormOpen(true); }}>+ {t("contact.newContact")}</Button>}
      </div>

      <BulkActionBar count={selected.size} onClear={() => setSelected(new Set())}>
        <Button variant="secondary" size="sm" onClick={() => downloadCsv("contacts-selected.csv", [
          ["Όνομα", "Email", "Τηλέφωνο", "Επιχείρηση", "Πόλη", "Περιοχή", "GDPR"],
          ...selectedRows.map((contact) => [
            `${contact.firstName} ${contact.lastName}`,
            contact.email ?? "",
            contact.mobile ?? contact.phone ?? "",
            contact.company?.name ?? "",
            contact.city ?? "",
            t(`reg.${contact.region}`),
            contact.gdprConsent ? "Ναι" : "Όχι",
          ]),
        ])}>⇩ Εξαγωγή CSV</Button>
      </BulkActionBar>

      <div className="card overflow-x-auto">
        <table className={`table-base min-w-[760px] ${table.density === "compact" ? "table-compact" : ""}`}>
          <thead>
            <tr>
              <th className="w-10"><input type="checkbox" aria-label="Επιλογή όλων των επαφών της σελίδας" checked={allVisibleSelected} onChange={(event) => setSelected(event.target.checked ? new Set(rows.map((row) => row.id)) : new Set())} className="accent-[var(--color-clay)]" /></th>
              {table.isVisible("name") && <th>{t("common.name")}</th>}
              {table.isVisible("businessType") && <th>{t("company.businessType")}</th>}
              {table.isVisible("company") && <th>{t("contact.company")}</th>}
              {table.isVisible("phone") && <th>{t("common.phone")}</th>}
              {table.isVisible("city") && <th>{t("common.city")}</th>}
              {table.isVisible("tags") && <th>{t("common.tags")}</th>}
              {table.isVisible("gdpr") && <th>GDPR</th>}
              {table.isVisible("actions") && (canEdit || canDelete) && <th />}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={table.visible.length + 1}><Spinner /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={table.visible.length + 1}><EmptyState title={t("common.noData")} icon="☺" /></td></tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className={selected.has(c.id) ? "row-selected" : ""}>
                  <td><input type="checkbox" aria-label={`Επιλογή ${c.firstName} ${c.lastName}`} checked={selected.has(c.id)} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(c.id); else next.delete(c.id); return next; })} className="accent-[var(--color-clay)]" /></td>
                  {table.isVisible("name") && <td>
                    <Link href={`/contacts/${c.id}`} className="flex items-center gap-2.5 group">
                      <Avatar name={`${c.firstName} ${c.lastName}`} size={28} color="#8a7968" />
                      <span>
                        <span className="block font-medium group-hover:text-clay">{c.firstName} {c.lastName}</span>
                        <span className="block text-[11px] text-ink-faint">{c.email}</span>
                      </span>
                    </Link>
                  </td>}
                  {table.isVisible("businessType") && <td><Badge tone={c.businessType === "PRIVATE_CUSTOMER" ? "neutral" : "slate"}>{t(`biz.${c.businessType}`)}</Badge></td>}
                  {table.isVisible("company") && <td>{c.company?.name ?? "—"}</td>}
                  {table.isVisible("phone") && <td className="whitespace-nowrap">{c.mobile ?? c.phone ?? "—"}</td>}
                  {table.isVisible("city") && <td>{[c.city, t(`reg.${c.region}`)].filter(Boolean).join(" · ")}</td>}
                  {table.isVisible("tags") && <td>
                    <span className="flex gap-1 flex-wrap max-w-[140px]">
                      {(c.tags ?? []).slice(0, 2).map((tag) => <Badge key={tag} tone="clay">{tag}</Badge>)}
                    </span>
                  </td>}
                  {table.isVisible("gdpr") && <td>{c.gdprConsent ? <Badge tone="olive">✓</Badge> : <Badge tone="rust">✗</Badge>}</td>}
                  {table.isVisible("actions") && (canEdit || canDelete) && <td>
                    <div className="flex gap-1 justify-end opacity-60 hover:opacity-100">
                      {canEdit && <Button variant="ghost" size="sm" onClick={() => { setEditing(c); setFormOpen(true); }}>{t("common.edit")}</Button>}
                      {canDelete && <Button variant="danger" size="sm" onClick={() => remove(c.id)}>✕</Button>}
                    </div>
                  </td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={pages} onPage={setPage} />

      {canEdit && <ContactForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={load} initial={editing} />}
    </div>
  );
}

/** Compact contact picker used across modules */
export function ContactPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [contacts, setContacts] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    api<{ items: { id: string; firstName: string; lastName: string }[] }>(`/api/contacts?pageSize=100${q ? `&q=${encodeURIComponent(q)}` : ""}`)
      .then((r) => setContacts(r.items))
      .catch(() => {});
  }, [q]);
  return (
    <div className="space-y-1">
      <Input placeholder={`${t1()}…`} value={q} onChange={(e) => setQ(e.target.value)} className="mb-1" />
      <Select value={value} onChange={(e) => onChange(e.target.value)} required placeholder="— Επιλογή επαφής —" options={contacts.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }))} />
    </div>
  );
}
function t1() {
  return "Αναζήτηση επαφής";
}
