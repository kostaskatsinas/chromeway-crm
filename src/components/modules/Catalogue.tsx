"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Button, Badge, Modal, Field, Input, Select, Textarea, TagsInput, Checkbox, EmptyState, DebouncedSearch, Spinner, Tabs, useToast } from "@/components/ui";
import { useI18n, fmtMoney } from "@/i18n/LanguageProvider";

const CATS = ["VENETIAN_PLASTER", "MICROCEMENT", "METALLIC_EFFECT", "TEXTURED_PLASTER", "WOOD_EFFECT", "CONCRETE_EFFECT", "PATINA_ANTIQUE", "STENCIL_RELIEF", "GILDING_METAL_LEAF", "RUST_OXIDATION", "PROTECTIVE_COATING", "CUSTOM_CONSTRUCTION", "OTHER_FINISH"];
const GLOSSES = ["DEEP_MATTE", "MATTE", "SATIN", "SEMI_GLOSS", "GLOSS"];

type Finish = {
  id: string;
  code: string;
  nameEl: string;
  nameEn: string;
  category: string;
  technique?: string | null;
  applicationMethod?: string | null;
  suitableSurfaces: string[];
  materialSuppliers: string[];
  colorCombinations?: string | null;
  texture?: string | null;
  glossLevel: string;
  materialCostPerM2: string;
  suggestedPricePerM2: string;
  labourHoursPerM2: number;
  physicalSampleLocation?: string | null;
  active: boolean;
};

function FinishForm({ open, onClose, onSaved, initial }: { open: boolean; onClose: () => void; onSaved: () => void; initial?: Partial<Finish> | null }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setForm({ category: "VENETIAN_PLASTER", glossLevel: "MATTE", suitableSurfaces: [], materialSuppliers: [], active: true, labourHoursPerM2: 1, ...initial });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (initial?.id) await api(`/api/finishes/${initial.id}`, { method: "PATCH", body: form });
      else await api("/api/finishes", { body: form });
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
    <Modal open={open} onClose={onClose} title={initial?.id ? `${initial.code} — ${initial.nameEl}` : "Νέο φινίρισμα"} wide>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label={`${t("finish.code")} *`}><Input required value={(form.code as string) ?? ""} onChange={(e) => set("code", e.target.value)} placeholder="CW-VP-01" /></Field>
        <Field label={`${t("finish.nameEl")} *`}><Input required value={(form.nameEl as string) ?? ""} onChange={(e) => set("nameEl", e.target.value)} /></Field>
        <Field label={`${t("finish.nameEn")} *`}><Input required value={(form.nameEn as string) ?? ""} onChange={(e) => set("nameEn", e.target.value)} /></Field>
        <Field label={t("common.category")}>
          <Select value={(form.category as string) ?? ""} onChange={(e) => set("category", e.target.value)} options={CATS.map((c) => ({ value: c, label: t(`fcat.${c}`) }))} />
        </Field>
        <Field label={t("finish.technique")}><Input value={(form.technique as string) ?? ""} onChange={(e) => set("technique", e.target.value)} /></Field>
        <Field label={t("finish.applicationMethod")}><Input value={(form.applicationMethod as string) ?? ""} onChange={(e) => set("applicationMethod", e.target.value)} placeholder="Σπάτουλα / ρολό / πιστόλι" /></Field>
        <div className="md:col-span-2">
          <Field label={t("finish.suitableSurfaces")}>
            <TagsInput value={(form.suitableSurfaces as string[]) ?? []} onChange={(v) => set("suitableSurfaces", v)} placeholder="Τοιχοποιία, σκυρόδεμα, ξύλο…" />
          </Field>
        </div>
        <Field label={t("finish.suppliers")}>
          <TagsInput value={(form.materialSuppliers as string[]) ?? []} onChange={(v) => set("materialSuppliers", v)} />
        </Field>
        <Field label={t("finish.texture")}>
          <Input value={(form.texture as string) ?? ""} onChange={(e) => set("texture", e.target.value)} placeholder="Λεία / κοκκώδης / μεταξένια…" />
        </Field>
        <Field label={t("finish.glossLevel")}>
          <Select value={(form.glossLevel as string) ?? ""} onChange={(e) => set("glossLevel", e.target.value)} options={GLOSSES.map((g) => ({ value: g, label: t(`gloss.${g}`) }))} />
        </Field>
        <Field label={t("finish.colorCombinations")}>
          <Input value={(form.colorCombinations as string) ?? ""} onChange={(e) => set("colorCombinations", e.target.value)} placeholder="RAL 9001 + πατίνα κασσίτερου…" />
        </Field>
        <Field label={`${t("finish.materialCost")} €`}>
          <Input type="number" step="0.5" min={0} value={(form.materialCostPerM2 as string) ?? ""} onChange={(e) => set("materialCostPerM2", e.target.value === "" ? 0 : Number(e.target.value))} />
        </Field>
        <Field label={`${t("finish.suggestedPrice")} €`}>
          <Input type="number" step="0.5" min={0} value={(form.suggestedPricePerM2 as string) ?? ""} onChange={(e) => set("suggestedPricePerM2", e.target.value === "" ? 0 : Number(e.target.value))} />
        </Field>
        <Field label={`${t("finish.labourHours")}`}>
          <Input type="number" step="0.25" min={0} value={(form.labourHoursPerM2 as number) ?? 0} onChange={(e) => set("labourHoursPerM2", Number(e.target.value))} />
        </Field>
        <Field label={`${t("finish.layers")}`}>
          <Input type="number" min={1} max={12} value={(form.applicationLayers as number) ?? 3} onChange={(e) => set("applicationLayers", Number(e.target.value))} />
        </Field>
        <Field label={`${t("finish.dryingHours")}`}>
          <Input type="number" min={0} value={(form.dryingHoursBetweenCoats as number) ?? 6} onChange={(e) => set("dryingHoursBetweenCoats", Number(e.target.value))} />
        </Field>
        <Field label={t("finish.sampleLocation")}><Input value={(form.physicalSampleLocation as string) ?? ""} onChange={(e) => set("physicalSampleLocation", e.target.value)} placeholder="Βιτρίνα Α-2" /></Field>
        <div className="md:col-span-3"><Field label={t("finish.instructions")}><Textarea rows={3} value={(form.instructionsEl as string) ?? ""} onChange={(e) => set("instructionsEl", e.target.value)} /></Field></div>
        <div className="md:col-span-3 flex items-center justify-between border-t border-line-soft pt-4">
          <Checkbox checked={!!form.active} onChange={(e) => set("active", e.target.checked)} label="Ενεργό στον κατάλογο" />
          <Button type="submit" disabled={busy}>{busy ? t("common.saving") : t("common.save")}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function Catalogue() {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState<Finish[] | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Finish> | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ pageSize: "300" });
      if (q) params.set("q", q);
      if (cat) params.set("category", cat);
      if (!showArchived) params.set("active", "true");
      const res = await api<{ items: Finish[] }>(`/api/finishes?${params}`);
      setRows(res.items);
    } catch {
      setRows([]);
    }
  }, [q, cat, showArchived]);

   
  useEffect(() => { load(); }, [load]);

  const archive = async (f: Finish) => {
    try {
      await api(`/api/finishes/${f.id}`, { method: "PATCH", body: { active: !f.active } });
      load();
    } catch (e) {
      toast(String(e), "err");
    }
  };

  return (
    <div className="space-y-4">
      <FinishForm open={open} onClose={() => setOpen(false)} onSaved={load} initial={editing} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-64"><DebouncedSearch onSearch={setQ} placeholder={`${t("common.search")}…`} /></div>
        <Select className="w-auto" value={cat} onChange={(e) => setCat(e.target.value)} placeholder={t("common.category")} options={CATS.map((c) => ({ value: c, label: t(`fcat.${c}`) }))} />
        <Button variant="ghost" size="sm" onClick={() => setShowArchived(!showArchived)}>
          {showArchived ? "↩ Ενεργά" : `▤ ${t("finish.archived")}`}
        </Button>
        <div className="flex-1" />
        <Button onClick={() => { setEditing(null); setOpen(true); }}>+ Νέο φινίρισμα</Button>
      </div>

      {!rows ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title={t("common.noData")} icon="❖" hint="Χτίστε τον κατάλογο των φινιρισμάτων με τεχνικές προδιαγραφές και κόστος." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {rows.map((f) => (
            <div key={f.id} className={`card p-4 flex flex-col ${!f.active ? "opacity-60" : ""}`}>
              {/* Placeholder texture swatch derived from code hash */}
              <div
                className="h-20 rounded-lg mb-3 relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, hsl(${(hash(f.code) % 40) + 15}deg ${20 + (hash(f.code) >> 3) % 25}% ${45 + (hash(f.code) >> 6) % 20}%), hsl(${(hash(f.code) % 40) + 30}deg ${30 + (hash(f.code) >> 2) % 20}% ${60 + (hash(f.code) >> 8) % 15}%))`,
                }}
              >
                <span className="absolute bottom-1.5 left-2 text-[10px] font-bold tracking-widest text-white/90">{f.code}</span>
              </div>
              <p className="font-semibold text-[14px] leading-snug">{lang === "el" ? f.nameEl : f.nameEn || f.nameEl}</p>
              <p className="text-[11px] text-ink-faint mt-0.5">{t(`fcat.${f.category}`)} · {t(`gloss.${f.glossLevel}`)}</p>
              <p className="text-[11px] text-ink-soft mt-1.5 line-clamp-2">{f.technique}</p>
              <div className="mt-auto pt-3 border-t border-line-soft flex items-center justify-between">
                <span className="display text-[16px]">{fmtMoney(f.suggestedPricePerM2, lang)}<span className="text-[10px] text-ink-faint"> /m²</span></span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(f); setOpen(true); }}>{t("common.edit")}</Button>
                  <Button size="sm" variant="ghost" title={f.active ? t("finish.archive") : t("finish.restore")} onClick={() => archive(f)}>
                    {f.active ? "▤" : "↺"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/* ─────────────────── Samples tracking ─────────────────── */

type SampleRow = {
  id: string;
  status: string;
  productionCost?: string | number;
  priceCharged?: string | number;
  requestedDate?: string;
  deliveryDate?: string | null;
  feedback?: string | null;
  finish: { nameEl: string; nameEn: string; code: string };
  contact: { id: string; firstName: string; lastName: string };
  quotation?: { number: string } | null;
};

const SAMPLE_STATUSES = ["REQUESTED", "IN_PRODUCTION", "DELIVERED", "APPROVED", "REJECTED", "SUPERSEDED"];
const S_TONES: Record<string, "neutral" | "clay" | "olive" | "rust" | "amber" | "slate"> = {
  REQUESTED: "neutral",
  IN_PRODUCTION: "slate",
  DELIVERED: "amber",
  APPROVED: "olive",
  REJECTED: "rust",
  SUPERSEDED: "neutral",
};

function SampleForm({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, unknown>>({ status: "REQUESTED" });
  const [finishes, setFinishes] = useState<{ id: string; nameEl: string; code: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ items: typeof finishes }>("/api/finishes?pageSize=200").then((r) => setFinishes(r.items)).catch(() => {});
  }, []);

  useEffect(() => {
    if (open) setForm({ status: "REQUESTED", requestedDate: new Date().toISOString() });
  }, [open]);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/samples", { body: form });
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
    <Modal open={open} onClose={onClose} title={t("sample.newSample")}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Φινίρισμα *" required>
          <Select required value={(form.finishId as string) ?? ""} onChange={(e) => set("finishId", e.target.value)} options={finishes.map((f) => ({ value: f.id, label: `${f.code} · ${f.nameEl}` }))} />
        </Field>
        <Field label={`${t("opp.contact")} *`}>
          <ContactPickerLite value={(form.contactId as string) ?? ""} onChange={(v) => set("contactId", v)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("sample.sizeLabel")}><Input value={(form.sizeLabel as string) ?? ""} onChange={(e) => set("sizeLabel", e.target.value)} placeholder="20×30 cm" /></Field>
          <Field label={t("common.status")}>
            <Select value={(form.status as string) ?? ""} onChange={(e) => set("status", e.target.value)} options={SAMPLE_STATUSES.map((s) => ({ value: s, label: t(`sstatus.${s}`) }))} />
          </Field>
          <Field label={`${t("sample.productionCost")} €`}><Input type="number" min={0} step="0.5" value={(form.productionCost as string) ?? ""} onChange={(e) => set("productionCost", Number(e.target.value || 0))} /></Field>
          <Field label={`${t("sample.priceCharged")} €`}><Input type="number" min={0} step="0.5" value={(form.priceCharged as string) ?? ""} onChange={(e) => set("priceCharged", Number(e.target.value || 0))} /></Field>
        </div>
        <Field label={t("common.notes")}><Textarea rows={2} value={(form.notes as string) ?? ""} onChange={(e) => set("notes", e.target.value)} /></Field>
        <div className="flex justify-end"><Button type="submit" disabled={busy}>{busy ? t("common.saving") : t("common.save")}</Button></div>
      </form>
    </Modal>
  );
}

function ContactPickerLite({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [contacts, setContacts] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  useEffect(() => {
    api<{ items: typeof contacts }>("/api/contacts?pageSize=100").then((r) => setContacts(r.items)).catch(() => {});
  }, []);
  return <Select required value={value} onChange={(e) => onChange(e.target.value)} placeholder="— Επιλογή επαφής —" options={contacts.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }))} />;
}

export function SamplesTable() {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState<SampleRow[] | null>(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(() => {
    api<{ items: SampleRow[] }>("/api/samples?pageSize=100")
      .then((r) => setRows(r.items))
      .catch(() => setRows([]));
  }, []);

   
  useEffect(() => { load(); }, [load]);

  const advance = async (s: SampleRow, next: string) => {
    await api(`/api/samples/${s.id}`, { method: "PATCH", body: { status: next, ...(next === "APPROVED" ? { approvedAt: new Date().toISOString() } : {}) } });
    toast(t("common.savedOk"));
    load();
  };

  return (
    <div className="space-y-4">
      <SampleForm open={open} onClose={() => setOpen(false)} onSaved={load} />
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>+ {t("sample.newSample")}</Button>
      </div>
      {!rows ? (
        <Spinner />
      ) : rows.length === 0 ? (
        <EmptyState title="Κανένα δείγμα σε παραγωγή" icon="❏" hint="Καταγράψτε δείγματα που παράγετε για πελάτες και την ανταπόκρισή τους." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base min-w-[780px]">
            <thead>
              <tr>
                <th>Φινίρισμα</th>
                <th>{t("opp.contact")}</th>
                <th>{t("common.status")}</th>
                <th>{t("sample.deliveryDate")}</th>
                <th>{t("sample.feedback")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.finish.code} · {lang === "el" ? s.finish.nameEl : s.finish.nameEn || s.finish.nameEl}</td>
                  <td>
                    <a href={`/contacts/${s.contact.id}`} className="hover:text-clay underline-offset-2 hover:underline">{s.contact.firstName} {s.contact.lastName}</a>
                  </td>
                  <td>
                    <Badge tone={S_TONES[s.status]}>{t(`sstatus.${s.status}`)}</Badge>
                  </td>
                  <td>{s.deliveryDate ? new Date(s.deliveryDate).toLocaleDateString("el-GR") : "—"}</td>
                  <td className="max-w-[220px] truncate">{s.feedback ?? "—"}</td>
                  <td>
                    <div className="flex gap-1 justify-end">
                      {["APPROVED", "REJECTED"].includes(s.status) ? null : s.status !== "DELIVERED" ? (
                        <Button size="sm" variant="secondary" onClick={() => advance(s, "DELIVERED")}>Παράδοση</Button>
                      ) : (
                        <>
                          <Button size="sm" onClick={() => advance(s, "APPROVED")}>✓ Έγκριση</Button>
                          <Button size="sm" variant="danger" onClick={() => advance(s, "REJECTED")}>✕</Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Catalogue page wrapper with tabs */
export function CatalogueTabs() {
  const [tab, setTab] = useState("catalogue");
  return (
    <div className="space-y-4">
      <Tabs tabs={[{ key: "catalogue", label: "Κατάλογος φινιρισμάτων" }, { key: "samples", label: "Δείγματα πελατών" }]} active={tab} onChange={setTab} />
      {tab === "catalogue" ? <Catalogue /> : <SamplesTable />}
    </div>
  );
}
