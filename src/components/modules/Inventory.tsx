"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Button, Badge, Modal, Field, Input, Select, Textarea, Tabs, EmptyState, DebouncedSearch, Spinner, useToast } from "@/components/ui";
import { useI18n } from "@/i18n/LanguageProvider";

const UNITS = ["KG", "LITER", "PIECE", "SQM", "LINEAR_M", "HOUR", "DAY", "LOT"];

type Material = {
  id: string;
  code: string;
  nameEl: string;
  nameEn?: string | null;
  category?: string | null;
  unit: string;
  currentStock: number;
  minStock: number;
  lastPurchasePrice: string;
  avgPurchasePrice: string;
  batchTracking: boolean;
  active: boolean;
  supplier?: { id: string; name: string } | null;
};
type Supplier = { id: string; name: string; contactName?: string | null; phone?: string | null; email?: string | null };
type Purchase = {
  id: string;
  number?: never;
  date: string;
  invoiceNumber?: string | null;
  total: string;
  supplier?: { name: string } | null;
  items: { quantity: number; unitPrice: string; material: { code: string; nameEl: string; unit: string } }[];
};

function MaterialForm({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, unknown>>({ unit: "KG", active: true });
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<{ items: Supplier[] }>("/api/suppliers?pageSize=100").then((r) => setSuppliers(r.items)).catch(() => {});
  }, []);
  useEffect(() => {
    if (open) setForm({ unit: "KG", active: true });
  }, [open]);
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal open={open} onClose={onClose} title="Νέο υλικό">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await api("/api/materials", { body: form });
            toast(t("common.savedOk"));
            onSaved();
            onClose();
          } catch (err) {
            toast(String(err), "err");
          } finally {
            setBusy(false);
          }
        }}
        className="grid grid-cols-2 gap-3"
      >
        <Field label={`${t("material.code")} *`}><Input required value={(form.code as string) ?? ""} onChange={(e) => set("code", e.target.value)} placeholder="MT-0001" /></Field>
        <Field label="Ονομασία (EL) *"><Input required value={(form.nameEl as string) ?? ""} onChange={(e) => set("nameEl", e.target.value)} /></Field>
        <Field label="Κατηγορία"><Input value={(form.category as string) ?? ""} onChange={(e) => set("category", e.target.value)} placeholder="Σοβάδες, χρωστικές…" /></Field>
        <Field label={t("material.unit")}><Select value={(form.unit as string) ?? ""} onChange={(e) => set("unit", e.target.value)} options={UNITS.map((u) => ({ value: u, label: t(`unit.${u}`) }))} /></Field>
        <Field label={t("inv.suppliers")}>
          <Select value={(form.supplierId as string) ?? ""} onChange={(e) => set("supplierId", e.target.value || null)} placeholder="—" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("material.minStock")}><Input type="number" min={0} value={(form.minStock as number) ?? ""} onChange={(e) => set("minStock", Number(e.target.value))} /></Field>
          <div className="flex items-end pb-1">
            <label className="inline-flex items-center gap-2 text-[13px] cursor-pointer">
              <input type="checkbox" className="accent-[var(--color-clay)] w-4 h-4" checked={!!form.batchTracking} onChange={(e) => set("batchTracking", e.target.checked)} />
              {t("material.batchTracking")}
            </label>
          </div>
        </div>
        <div className="col-span-2 flex justify-end"><Button type="submit" disabled={busy}>{busy ? "…" : t("common.save")}</Button></div>
      </form>
    </Modal>
  );
}

function SupplierForm({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, unknown>>({});
  useEffect(() => {
    if (open) setForm({});
  }, [open]);
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal open={open} onClose={onClose} title="Νέος προμηθευτής">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api("/api/suppliers", { body: form });
            toast(t("common.savedOk"));
            onSaved();
            onClose();
          } catch (err) {
            toast(String(err), "err");
          }
        }}
        className="grid grid-cols-2 gap-3"
      >
        <div className="col-span-2"><Field label="Επωνυμία *" required><Input required value={(form.name as string) ?? ""} onChange={(e) => set("name", e.target.value)} /></Field></div>
        <Field label={t("supplier.contactName")}><Input value={(form.contactName as string) ?? ""} onChange={(e) => set("contactName", e.target.value)} /></Field>
        <Field label={t("common.phone")}><Input value={(form.phone as string) ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label={t("common.email")}><Input type="email" value={(form.email as string) ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="ΑΦΜ"><Input value={(form.vatNumber as string) ?? ""} onChange={(e) => set("vatNumber", e.target.value)} /></Field>
        <div className="col-span-2 flex justify-end"><Button type="submit">{t("common.save")}</Button></div>
      </form>
    </Modal>
  );
}

function PurchaseForm({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [header, setHeader] = useState({ date: new Date().toISOString().slice(0, 10), invoiceNumber: "", supplierId: "" });
  const [lines, setLines] = useState([{ materialId: "", quantity: 0, unitPrice: 0, batchNo: "" }]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ items: Material[] }>("/api/materials?pageSize=200").then((r) => setMaterials(r.items)).catch(() => {});
    api<{ items: Supplier[] }>("/api/suppliers?pageSize=100").then((r) => setSuppliers(r.items)).catch(() => {});
  }, []);

  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  return (
    <Modal open={open} onClose={onClose} title="Νέα αγορά" wide>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label={t("common.date")}><Input type="date" value={header.date} onChange={(e) => setHeader({ ...header, date: e.target.value })} /></Field>
          <Field label={t("purchase.invoiceNumber")}><Input value={header.invoiceNumber} onChange={(e) => setHeader({ ...header, invoiceNumber: e.target.value })} /></Field>
          <Field label={t("inv.suppliers")}>
            <Select value={header.supplierId} onChange={(e) => setHeader({ ...header, supplierId: e.target.value })} placeholder="—" options={suppliers.map((s) => ({ value: s.id, label: s.name }))} />
          </Field>
        </div>

        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_80px_90px_90px_28px] gap-2 items-center">
              <Select
                value={l.materialId}
                onChange={(e) => {
                  const mat = materials.find((m) => m.id === e.target.value);
                  const next = [...lines];
                  next[i] = { ...next[i], materialId: e.target.value, unitPrice: mat ? Number(mat.lastPurchasePrice) : 0 };
                  setLines(next);
                }}
                placeholder="— Υλικό —"
                options={materials.map((m) => ({ value: m.id, label: `${m.code} · ${m.nameEl}` }))}
              />
              <Input type="number" step="0.01" min={0} value={l.quantity || ""} onChange={(e) => { const n = [...lines]; n[i] = { ...n[i], quantity: Number(e.target.value) }; setLines(n); }} placeholder="Ποσ." />
              <Input type="number" step="0.01" min={0} value={l.unitPrice || ""} onChange={(e) => { const n = [...lines]; n[i] = { ...n[i], unitPrice: Number(e.target.value) }; setLines(n); }} placeholder="€/μον." />
              <Input value={l.batchNo} onChange={(e) => { const n = [...lines]; n[i] = { ...n[i], batchNo: e.target.value }; setLines(n); }} placeholder="Lot" />
              <Button variant="danger" size="sm" className="!px-2" onClick={() => setLines(lines.filter((_, j) => j !== i))}>✕</Button>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={() => setLines([...lines, { materialId: "", quantity: 0, unitPrice: 0, batchNo: "" }])}>+ {t("purchase.addItemLine")}</Button>
        </div>

        <div className="flex items-center justify-between border-t border-line-soft pt-3">
          <span className="text-[13px]">Σύνολο αγοράς: <b className="display text-lg">{total.toLocaleString("el-GR")} €</b></span>
          <Button
            disabled={busy}
            onClick={async () => {
              if (lines.some((l) => !l.materialId || l.quantity <= 0)) {
                toast("Συμπληρώστε υλικά και ποσότητες", "err");
                return;
              }
              setBusy(true);
              try {
                await api("/api/purchases", { body: { ...header, supplierId: header.supplierId || null, items: lines.filter((l) => l.materialId && l.quantity > 0) } });
                toast(t("common.savedOk") + " — το απόθεμα ενημερώθηκε");
                onSaved();
                onClose();
                setLines([{ materialId: "", quantity: 0, unitPrice: 0, batchNo: "" }]);
              } catch (e) {
                toast(String(e), "err");
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "…" : `${t("common.save")} & Ενημέρωση αποθέματος`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function InventoryTabs() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [tab, setTab] = useState("materials");
  const [materials, setMaterials] = useState<Material[] | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [q, setQ] = useState("");
  const [matOpen, setMatOpen] = useState(false);
  const [supOpen, setSupOpen] = useState(false);
  const [purOpen, setPurOpen] = useState(false);
  const [moveFor, setMoveFor] = useState<Material | null>(null);

  const loadMaterials = useCallback(async () => {
    try {
      const params = new URLSearchParams({ pageSize: "300" });
      if (q) params.set("q", q);
      const res = await api<{ items: Material[] }>(`/api/materials?${params}`);
      setMaterials(res.items);
    } catch {
      setMaterials([]);
    }
  }, [q]);

  const loadAll = useCallback(() => {
    loadMaterials();
    api<{ items: Supplier[] }>("/api/suppliers?pageSize=200").then((r) => setSuppliers(r.items)).catch(() => {});
    fetch("/api/purchases").then((r) => r.json()).then((j) => setPurchases(j.ok ? j.data : [])).catch(() => {});
  }, [loadMaterials]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAll(); }, []);
  useEffect(() => { if (tab === "materials") loadMaterials(); }, [tab, loadMaterials]);

  return (
    <div className="space-y-4">
      <Tabs tabs={[{ key: "materials", label: t("inv.materials") }, { key: "suppliers", label: t("inv.suppliers") }, { key: "purchases", label: t("inv.purchases") }]} active={tab} onChange={setTab} />

      {/* Movement modal */}
      {moveFor && (
        <MovementModal
          material={moveFor}
          onClose={() => setMoveFor(null)}
          onDone={() => {
            setMoveFor(null);
            loadMaterials();
          }}
        />
      )}

      {tab === "materials" && (
        <>
          <MaterialForm open={matOpen} onClose={() => setMatOpen(false)} onSaved={loadMaterials} />
          <div className="flex flex-wrap gap-2 items-center">
            <div className="w-full sm:w-64"><DebouncedSearch onSearch={setQ} /></div>
            <div className="flex-1" />
            <Button onClick={() => setMatOpen(true)}>+ Υλικό</Button>
          </div>
          {!materials ? (
            <Spinner />
          ) : materials.length === 0 ? (
            <EmptyState title="Δεν υπάρχουν υλικά" icon="▣" hint="Καταχωρίστε τα βασικά υλικά του εργαστηρίου με ελάχιστα αποθέματα." />
          ) : (
            <div className="card overflow-x-auto">
              <table className="table-base min-w-[760px]">
                <thead>
                  <tr>
                    <th>{t("material.code")}</th>
                    <th>Υλικό</th>
                    <th>{t("material.currentStock")}</th>
                    <th>{t("material.minStock")}</th>
                    <th>{t("material.lastPrice")}</th>
                    <th>{t("inv.suppliers")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m) => {
                    const low = m.currentStock <= m.minStock;
                    return (
                      <tr key={m.id}>
                        <td className="font-semibold">{m.code}</td>
                        <td>
                          {m.nameEl}
                          <span className="block text-[11px] text-ink-faint">{m.category}</span>
                        </td>
                        <td>
                          <span className={`tabular-nums font-medium ${low ? "text-rust" : ""}`}>
                            {Math.round(m.currentStock * 100) / 100} {t(`unit.${m.unit}`)}
                          </span>
                          {low && <Badge tone="rust" className="ml-1.5">{t("material.lowStock")}</Badge>}
                        </td>
                        <td className="tabular-nums text-ink-faint">{m.minStock}</td>
                        <td className="tabular-nums whitespace-nowrap">{Number(m.lastPurchasePrice).toFixed(2)} €/{t(`unit.${m.unit}`)}</td>
                        <td>{m.supplier?.name ?? "—"}</td>
                        <td><Button variant="secondary" size="sm" onClick={() => setMoveFor(m)}>Κίνηση</Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "suppliers" && (
        <>
          <SupplierForm open={supOpen} onClose={() => setSupOpen(false)} onSaved={loadAll} />
          <div className="flex justify-end"><Button onClick={() => setSupOpen(true)}>+ Προμηθευτής</Button></div>
          {!suppliers ? (
            <Spinner />
          ) : suppliers.length === 0 ? (
            <EmptyState title="Δεν υπάρχουν προμηθευτές" icon="⌂" />
          ) : (
            <div className="card overflow-x-auto">
              <table className="table-base min-w-[600px]">
                <thead><tr><th>Επωνυμία</th><th>Επικοινωνία</th><th>{t("common.phone")}</th><th>Email</th></tr></thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id}>
                      <td className="font-medium">{s.name}</td>
                      <td>{s.contactName ?? "—"}</td>
                      <td>{s.phone ?? "—"}</td>
                      <td>{s.email ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === "purchases" && (
        <>
          <PurchaseForm open={purOpen} onClose={() => setPurOpen(false)} onSaved={loadAll} />
          <div className="flex justify-end"><Button onClick={() => setPurOpen(true)}>+ Αγορά</Button></div>
          {!purchases ? (
            <Spinner />
          ) : purchases.length === 0 ? (
            <EmptyState title="Καμία αγορά" icon="▤" hint="Οι αγορές ενημερώνουν αυτόματα το απόθεμα και τις μέσες τιμές." />
          ) : (
            <ul className="space-y-2">
              {purchases.map((p) => (
                <li key={p.id} className="card p-4">
                  <div className="flex flex-wrap justify-between gap-2 mb-2">
                    <p className="text-[13px] font-semibold">
                      {new Date(p.date).toLocaleDateString("el-GR")}
                      {p.invoiceNumber ? ` · Τιμολόγιο ${p.invoiceNumber}` : ""}
                      {p.supplier ? ` · ${p.supplier.name}` : ""}
                    </p>
                    <Badge tone="clay">{Number(p.total).toFixed(2)} €</Badge>
                  </div>
                  <ul className="text-[12px] text-ink-soft space-y-0.5">
                    {p.items?.map((it, i) => (
                      <li key={i} className="flex justify-between max-w-md">
                        <span>{it.material.code} · {it.material.nameEl}</span>
                        <span className="tabular-nums">{it.quantity} × {Number(it.unitPrice).toFixed(2)} €</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <span hidden onClick={() => toast("")} />
    </div>
  );
}

function MovementModal({ material, onClose, onDone }: { material: Material; onClose: () => void; onDone: () => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [form, setForm] = useState({ type: "CONSUMPTION_OUT", quantity: 0, projectId: "", batchNo: "", note: "" });
  const [projects, setProjects] = useState<{ id: string; code: string; name: string }[]>([]);
  const [history, setHistory] = useState<{ id: string; type: string; quantity: number; createdAt: string; note?: string | null }[]>([]);

  useEffect(() => {
    api<{ items: typeof projects }>("/api/projects?pageSize=50").then((r) => setProjects(r.items)).catch(() => {});
    fetch(`/api/inventory/movement?materialId=${material.id}`).then((r) => r.json()).then((j) => setHistory(j.ok ? j.data : [])).catch(() => {});
  }, [material.id]);

  const submit = async () => {
    if (!form.quantity) return;
    await api("/api/inventory/movement", { body: { materialId: material.id, type: form.type, quantity: form.quantity, projectId: form.projectId || null, batchNo: form.batchNo || null, note: form.note || null } });
    toast(`${t("common.savedOk")} — νέο απόθεμα`);
    onDone();
  };

  return (
    <Modal open onClose={onClose} title={`Κίνηση αποθέματος — ${material.code}`} wide>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <p className="text-[13px] text-ink-soft">
            Τρέχον απόθεμα: <b className="text-lg display">{Math.round(material.currentStock * 100) / 100} {t(`unit.${material.unit}`)}</b>
          </p>
          <Field label="Τύπος κίνησης">
            <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={[
              { value: "CONSUMPTION_OUT", label: "Κατανάλωση σε έργο" },
              { value: "ADJUSTMENT", label: "Προσαρμογή απογραφής" },
              { value: "RETURN", label: "Επιστροφή" },
            ]} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ποσότητα *"><Input required type="number" step="0.01" value={form.quantity || ""} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} /></Field>
            {form.type === "CONSUMPTION_OUT" ? null : null}
          </div>
          {form.type === "CONSUMPTION_OUT" && (
            <Field label="Έργο">
              <Select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} placeholder="—" options={projects.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))} />
            </Field>
          )}
          {material.batchTracking && <Field label={t("purchase.batchNo")}><Input value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} /></Field>}
          <Field label={t("common.notes")}><Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
          <Button onClick={submit}>Καταχώρηση</Button>
        </div>
        <div>
          <p className="eyebrow mb-2">Ιστορικό κινήσεων</p>
          <ul className="divide-y divide-line-soft max-h-80 overflow-y-auto text-[12px]">
            {history.map((h) => (
              <li key={h.id} className="py-2 flex justify-between gap-3">
                <span>
                  {h.type === "PURCHASE_IN" ? "▲ Αγορά" : h.type === "CONSUMPTION_OUT" ? "▼ Κατανάλωση" : h.type === "RETURN" ? "▲ Επιστροφή" : "= Προσαρμογή"}
                  {h.note ? ` — ${h.note}` : ""}
                </span>
                <span className="whitespace-nowrap text-ink-faint tabular-nums">
                  {h.quantity > 0 ? "+" : ""}{Math.round(h.quantity * 100) / 100} · {new Date(h.createdAt).toLocaleDateString("el-GR")}
                </span>
              </li>
            ))}
            {history.length === 0 && <li className="py-3 text-center text-ink-faint">—</li>}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
