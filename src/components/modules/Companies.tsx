"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { Button, Badge, Modal, Field, Input, Select, Textarea, TagsInput, EmptyState, DebouncedSearch, Pagination, Spinner, useConfirm, useToast } from "@/components/ui";
import { useI18n } from "@/i18n/LanguageProvider";

const BIZ = ["ARCHITECT", "INTERIOR_DESIGNER", "CONTRACTOR", "HOTEL", "RESTAURANT", "RETAIL_BUSINESS", "OFFICE", "PRIVATE_CUSTOMER", "OTHER_BUSINESS"];
const REGIONS = ["ATTICA", "PELOPONNESE", "STEREA_ELLADA", "THESSALY", "EPIRUS", "MACEDONIA", "THRACE", "IONIAN_ISLANDS", "AEGEAN_ISLANDS", "CRETE", "OTHER_REGION"];

export type CompanyRow = {
  id: string;
  name: string;
  businessType: string;
  vatNumber?: string | null;
  city?: string | null;
  region: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  tags: string[];
};

function CompanyForm({ open, onClose, onSaved, initial }: { open: boolean; onClose: () => void; onSaved: () => void; initial?: Partial<CompanyRow> & { id?: string; taxOffice?: string | null; street?: string | null; postalCode?: string | null; notes?: string | null } }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setForm({ businessType: "HOTEL", region: "ATTICA", tags: [], ...initial });
  }, [open, initial]);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (initial?.id) await api(`/api/companies/${initial.id}`, { method: "PATCH", body: form });
      else await api("/api/companies", { body: form });
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
    <Modal open={open} onClose={onClose} title={initial?.id ? t("common.edit") : t("company.newCompany")} wide>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label={`${t("company.name")} *`}><Input required value={(form.name as string) ?? ""} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label={t("company.businessType")}>
          <Select value={(form.businessType as string) ?? ""} onChange={(e) => set("businessType", e.target.value)} options={BIZ.map((b) => ({ value: b, label: t(`biz.${b}`) }))} />
        </Field>
        <Field label={t("company.vatNumber")}><Input value={(form.vatNumber as string) ?? ""} onChange={(e) => set("vatNumber", e.target.value)} placeholder="EL999999999" /></Field>
        <Field label={t("company.taxOffice")}><Input value={(form.taxOffice as string) ?? ""} onChange={(e) => set("taxOffice", e.target.value)} /></Field>
        <Field label={t("common.email")}><Input type="email" value={(form.email as string) ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label={t("common.phone")}><Input value={(form.phone as string) ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label={t("company.website")}><Input value={(form.website as string) ?? ""} onChange={(e) => set("website", e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("common.city")}><Input value={(form.city as string) ?? ""} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label={t("common.region")}>
            <Select value={(form.region as string) ?? ""} onChange={(e) => set("region", e.target.value)} options={REGIONS.map((r) => ({ value: r, label: t(`reg.${r}`) }))} />
          </Field>
        </div>
        <div className="md:col-span-2"><Field label={t("common.address")}><Input value={(form.street as string) ?? ""} onChange={(e) => set("street", e.target.value)} /></Field></div>
        <div className="md:col-span-2">
          <Field label={t("common.tags")}>
            <TagsInput value={(form.tags as string[]) ?? []} onChange={(v) => set("tags", v)} />
          </Field>
        </div>
        <div className="md:col-span-2"><Field label={t("common.notes")}><Textarea rows={2} value={(form.notes as string) ?? ""} onChange={(e) => set("notes", e.target.value)} /></Field></div>
        <div className="md:col-span-2 flex justify-end border-t border-line-soft pt-4">
          <Button type="submit" disabled={busy}>{busy ? t("common.saving") : t("common.save")}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function CompaniesTable() {
  const { t } = useI18n();
  const { confirm, dialog } = useConfirm();
  const { toast } = useToast();
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [biz, setBiz] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<CompanyRow> | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "25" });
      if (q) params.set("q", q);
      if (biz) params.set("businessType", biz);
      const res = await api<{ items: CompanyRow[]; total: number }>(`/api/companies?${params}`);
      setRows(res.items);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page, q, biz]);

   
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {dialog}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="w-full sm:w-64"><DebouncedSearch onSearch={(v) => { setPage(1); setQ(v); }} placeholder={`${t("common.search")}…`} /></div>
        <Select className="w-auto" value={biz} onChange={(e) => { setPage(1); setBiz(e.target.value); }} placeholder={t("company.businessType")} options={BIZ.map((b) => ({ value: b, label: t(`biz.${b}`) }))} />
        <div className="flex-1" />
        <Button onClick={() => { setEditing(undefined); setOpen(true); }}>+ {t("company.newCompany")}</Button>
      </div>

      <div className="card overflow-x-auto">
        <table className="table-base min-w-[640px]">
          <thead>
            <tr>
              <th>{t("company.name")}</th>
              <th>{t("company.businessType")}</th>
              <th>ΑΦΜ</th>
              <th>{t("common.phone")}</th>
              <th>{t("common.city")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><Spinner /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6}><EmptyState title={t("common.noData")} icon="⌂" /></td></tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/companies/${c.id}`} className="font-medium hover:text-clay">{c.name}</Link>
                    <span className="block text-[11px] text-ink-faint">{c.website ?? c.email}</span>
                  </td>
                  <td><Badge tone="slate">{t(`biz.${c.businessType}`)}</Badge></td>
                  <td>{c.vatNumber ?? "—"}</td>
                  <td>{c.phone ?? "—"}</td>
                  <td>{[c.city, t(`reg.${c.region}`)].filter((x) => x && !x.startsWith("reg.")).join(", ") || "—"}</td>
                  <td>
                    <div className="flex gap-1 justify-end opacity-60 hover:opacity-100">
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(c); setOpen(true); }}>{t("common.edit")}</Button>
                      <Button variant="danger" size="sm" onClick={async () => {
                        if (await confirm(t("common.confirmDelete"))) {
                          try { await api(`/api/companies/${c.id}`, { method: "DELETE" }); load(); } catch (e) { toast(String(e), "err"); }
                        }
                      }}>✕</Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pages={Math.ceil(total / 25)} onPage={setPage} />
      <CompanyForm open={open} onClose={() => setOpen(false)} onSaved={load} initial={editing} />
    </div>
  );
}
