"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Button, Field, Input, Select, Textarea, useToast } from "@/components/ui";
import { useI18n } from "@/i18n/LanguageProvider";

type Measurement = {
  id?: string;
  areaName: string;
  surfaceType?: string | null;
  material?: string | null;
  lengthM?: number | null;
  widthM?: number | null;
  heightM?: number | null;
  areaM2?: number | null;
  condition?: string | null;
  prepRequired?: string | null;
  notes?: string | null;
};

const SURFACES = ["wall", "floor", "ceiling", "column", "furniture", "facade", "otherSurface"];

function blank(): Measurement {
  return { areaName: "", surfaceType: "wall" };
}

export function MeasurementsEditor({ visitId, initial }: { visitId: string; initial: Measurement[] }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState<Measurement[]>(initial.length ? initial : []);
  const [busy, setBusy] = useState(false);

  const update = (i: number, k: keyof Measurement, v: unknown) => {
    setRows((rs) => {
      const next = [...rs];
      next[i] = { ...next[i], [k]: v } as Measurement;
      // auto-compute m²
      const r = next[i];
      if (k === "lengthM" || k === "widthM" || k === "heightM") {
        const l = Number(r.lengthM) || 0;
        const w = Number(r.widthM) || 0;
        const h = Number(r.heightM) || 0;
        if (l && w) r.areaM2 = Math.round(l * w * 100) / 100;          // floor
        else if (l && h) r.areaM2 = Math.round(l * h * 100) / 100;      // wall run
        else r.areaM2 = null;
      }
      return next;
    });
  };

  const saveAll = async () => {
    setBusy(true);
    try {
      await api(`/api/visits/${visitId}/measurements`, { body: { measurements: rows.filter((r) => r.areaName.trim()) } });
      toast(t("common.savedOk"));
    } catch (e) {
      toast(String((e as Error).message), "err");
    } finally {
      setBusy(false);
    }
  };

  const totalArea = rows.reduce((s, r) => s + (Number(r.areaM2) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="eyebrow">{t("visit.measurements")}</p>
        <span className={`text-[12px] font-semibold ${totalArea > 0 ? "text-clay" : "text-ink-faint"}`}>
          Σύνολο: {Math.round(totalArea * 10) / 10} m²
        </span>
      </div>

      {rows.map((r, i) => (
        <div key={r.id ?? `new-${i}`} className="card p-4 space-y-3 bg-parchment/40">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Field label={t("visit.areaName")} required>
              <Input value={r.areaName} onChange={(e) => update(i, "areaName", e.target.value)} placeholder="Καθιστικό / Τοίχος Α…" />
            </Field>
            <Field label={t("visit.surfaceType")}>
              <Select value={r.surfaceType ?? ""} onChange={(e) => update(i, "surfaceType", e.target.value)} placeholder="—" options={SURFACES.map((s) => ({ value: s, label: t(`surface.${s}`) }))} />
            </Field>
            <Field label={t("visit.material")}>
              <Input value={r.material ?? ""} onChange={(e) => update(i, "material", e.target.value)} placeholder="Γυψοσανίδα, σκυρόδεμα…" />
            </Field>
            <Field label={t("visit.areaM2")}>
              <Input type="number" step="0.01" value={r.areaM2 ?? ""} onChange={(e) => update(i, "areaM2", e.target.value === "" ? null : Number(e.target.value))} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <Field label={t("visit.length")}>
              <Input inputMode="decimal" type="number" step="0.01" value={r.lengthM ?? ""} onChange={(e) => update(i, "lengthM", e.target.value === "" ? null : Number(e.target.value))} />
            </Field>
            <Field label={t("visit.width")}>
              <Input inputMode="decimal" type="number" step="0.01" value={r.widthM ?? ""} onChange={(e) => update(i, "widthM", e.target.value === "" ? null : Number(e.target.value))} />
            </Field>
            <Field label={t("visit.height")}>
              <Input inputMode="decimal" type="number" step="0.01" value={r.heightM ?? ""} onChange={(e) => update(i, "heightM", e.target.value === "" ? null : Number(e.target.value))} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Field label={t("visit.condition")}>
              <Input value={r.condition ?? ""} onChange={(e) => update(i, "condition", e.target.value)} placeholder="Σκασμένος σοβάς, υγρασία…" />
            </Field>
            <Field label={t("visit.prepRequired")}>
              <Input value={r.prepRequired ?? ""} onChange={(e) => update(i, "prepRequired", e.target.value)} placeholder="Αστάρωση, τρίψιμο, αστάρι…" />
            </Field>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Input className="flex-1" value={r.notes ?? ""} onChange={(e) => update(i, "notes", e.target.value)} placeholder={`${t("common.notes")}…`} />
            <Button variant="danger" size="sm" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}>✕</Button>
          </div>
        </div>
      ))}

      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => setRows((rs) => [...rs, blank()])}>+ {t("visit.addMeasurement")}</Button>
        {rows.length > 0 && (
          <Button onClick={saveAll} disabled={busy}>{busy ? t("common.saving") : t("common.save")}</Button>
        )}
      </div>
    </div>
  );
}

/** Editable field notes block */
export function VisitNotes({ visit }: { visit: { id: string; accessNotes?: string | null; workingConditions?: string | null; customerRequirements?: string | null; generalNotes?: string | null } }) {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState(visit);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await api(`/api/visits/${visit.id}`, { method: "PATCH", body: form });
      toast(t("common.savedOk"));
      router.refresh();
    } catch (e) {
      toast(String((e as Error).message), "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="eyebrow">Συνθήκες & απαιτήσεις</p>
      <Field label={t("visit.accessNotes")}>
        <Textarea rows={2} value={form.accessNotes ?? ""} onChange={(e) => setForm({ ...form, accessNotes: e.target.value })} />
      </Field>
      <Field label={t("visit.workingConditions")}>
        <Textarea rows={2} value={form.workingConditions ?? ""} onChange={(e) => setForm({ ...form, workingConditions: e.target.value })} placeholder="Ρεύμα, νερό, θόρυβος, φωτισμός…" />
      </Field>
      <Field label={t("visit.customerRequirements")}>
        <Textarea rows={2} value={form.customerRequirements ?? ""} onChange={(e) => setForm({ ...form, customerRequirements: e.target.value })} />
      </Field>
      <Field label={t("visit.generalNotes")}>
        <Textarea rows={3} value={form.generalNotes ?? ""} onChange={(e) => setForm({ ...form, generalNotes: e.target.value })} />
      </Field>
      <Button size="sm" onClick={save} disabled={busy}>{busy ? t("common.saving") : t("common.save")}</Button>
    </div>
  );
}

/** Status action bar */
export function VisitActions({ id, status }: { id: string; status: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const setStatus = async (next: string) => {
    setBusy(true);
    try {
      await api(`/api/visits/${id}`, { method: "PATCH", body: { status: next, ...(next === "COMPLETED" ? {} : {}) } });
      toast(t("common.savedOk"));
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {status === "SCHEDULED" && (
        <>
          <Button size="sm" disabled={busy} onClick={() => setStatus("COMPLETED")}>✓ {t("visit.completeVisit")}</Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => setStatus("CANCELLED")}>{t("visit.status.CANCELLED")}</Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => setStatus("NO_SHOW")}>{t("visit.status.NO_SHOW")}</Button>
        </>
      )}
      {status !== "SCHEDULED" && (
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => setStatus("SCHEDULED")}>↺ {t("visit.status.SCHEDULED")}</Button>
      )}
    </div>
  );
}
