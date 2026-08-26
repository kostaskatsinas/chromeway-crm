"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Button, Badge, Modal, Field, Input, Select, Tabs, Checkbox, useToast } from "@/components/ui";
import { useI18n } from "@/i18n/LanguageProvider";
import type { Lang } from "@/i18n/dictionaries";

const ROLES = ["ADMIN", "SALES", "PROJECT_MANAGER", "TECHNICIAN", "ACCOUNTANT", "COLLABORATOR"];

type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: string;
  hourlyRate?: string | number;
  color?: string;
  active?: boolean;
  lastLoginAt?: string | null;
};

export function SettingsTabs({
  me,
  initialSettings,
}: {
  me: { id: string; firstName: string; lastName: string; email: string; role: string };
  initialSettings: Record<string, unknown>;
}) {
  const { t, lang, setLang } = useI18n();
  const [tab, setTab] = useState("profile");
  const isAdmin = me.role === "ADMIN";

  return (
    <div className="space-y-4">
      <Tabs
        tabs={[
          { key: "profile", label: t("settings.profile") },
          ...(isAdmin ? [{ key: "users", label: t("settings.users") }, { key: "company", label: t("settings.companyProfile") }, { key: "automations", label: t("settings.automations") }] : []),
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "profile" && <ProfileTab me={me} lang={lang} setLang={setLang} />}
      {tab === "users" && isAdmin && <UsersTab />}
      {tab === "company" && isAdmin && <CompanyTab initial={initialSettings} />}
      {tab === "automations" && isAdmin && <AutomationsTab />}
    </div>
  );
}

function ProfileTab({ me, lang, setLang }: { me: { firstName: string; lastName: string; email: string }; lang: Lang; setLang: (l: Lang) => void }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [pw, setPw] = useState({ current: "", next: "" });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
      <div className="card p-5 space-y-3">
        <p className="eyebrow">Στοιχεία λογαριασμού</p>
        <Field label={t("common.name")}><Input disabled value={`${me.firstName} ${me.lastName}`} /></Field>
        <Field label={t("common.email")}><Input disabled value={me.email} /></Field>
        <p className="text-[11px] text-ink-faint">Γλώσσα περιβάλλοντος:</p>
        <div className="flex gap-2">
          <Button size="sm" variant={lang === "el" ? "primary" : "secondary"} onClick={() => setLang("el")}>Ελληνικά</Button>
          <Button size="sm" variant={lang === "en" ? "primary" : "secondary"} onClick={() => setLang("en")}>English</Button>
        </div>
      </div>
      <div className="card p-5 space-y-3">
        <p className="eyebrow">Αλλαγή κωδικού</p>
        <Field label="Τρέχων κωδικός"><Input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
        <Field label="Νέος κωδικός (min 8)"><Input type="password" minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
        <Button
          size="sm"
          onClick={async () => {
            try {
              await api("/api/auth/password", { method: "PATCH", body: pw });
              toast(t("common.savedOk"));
              setPw({ current: "", next: "" });
            } catch (e) {
              toast(String(e), "err");
            }
          }}
        >
          {t("auth.resetSubmit")}
        </Button>
      </div>
    </div>
  );
}

function UsersTab() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});

  const load = () => api<{ items: UserRow[] }>("/api/users?full=1").then((r) => setRows(r.items)).catch(() => setRows([]));
  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (open) {
      if (editing) setForm({ ...editing });
      else setForm({ role: "TECHNICIAN", active: true, hourlyRate: 15, color: "#8a7968" });
    }
  }, [open, editing]);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-4 max-w-4xl">
      <Modal open={open} onClose={() => setOpen(false)} title={editing ? `${editing.firstName} ${editing.lastName}` : "Νέος χρήστης"}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              if (editing) await api(`/api/users?id=${editing.id}`, { method: "PATCH", body: form });
              else await api("/api/users", { body: form });
              toast(t("common.savedOk"));
              setOpen(false);
              load();
            } catch (err) {
              toast(String(err), "err");
            }
          }}
          className="grid grid-cols-2 gap-3"
        >
          <Field label="Όνομα *"><Input required value={(form.firstName as string) ?? ""} onChange={(e) => set("firstName", e.target.value)} /></Field>
          <Field label="Επώνυμο *"><Input required value={(form.lastName as string) ?? ""} onChange={(e) => set("lastName", e.target.value)} /></Field>
          {!editing && (
            <>
              <Field label="Email *"><Input required type="email" value={(form.email as string) ?? ""} onChange={(e) => set("email", e.target.value)} /></Field>
              <Field label="Κωδικός * (min 8)"><Input required type="password" minLength={8} value={(form.password as string) ?? ""} onChange={(e) => set("password", e.target.value)} /></Field>
            </>
          )}
          <Field label={t("nav.settings.users").includes("ρόλοι") || true ? "Ρόλος" : "Ρόλος"}>
            <Select value={(form.role as string) ?? ""} onChange={(e) => set("role", e.target.value)} options={ROLES.map((r) => ({ value: r, label: t(`role.${r}`) }))} />
          </Field>
          <Field label="Τιμή ώρας €"><Input type="number" min={0} step="0.5" value={(form.hourlyRate as number) ?? 0} onChange={(e) => set("hourlyRate", Number(e.target.value))} /></Field>
          <Field label={t("common.phone")}><Input value={(form.phone as string) ?? ""} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Χρώμα ημερολογίου"><Input type="color" value={(form.color as string) ?? "#8a7968"} onChange={(e) => set("color", e.target.value)} className="h-[38px] p-1" /></Field>
          {editing && <div className="col-span-2"><Checkbox checked={!!form.active} onChange={(e) => set("active", e.target.checked)} label="Ενεργός λογαριασμός" /></div>}
          {editing && <div className="col-span-2"><Field label="Νέος κωδικός (προαιρετικό)"><Input type="password" minLength={8} placeholder="—" value={(form.password as string) ?? ""} onChange={(e) => set("password", e.target.value)} /></Field></div>}
          <div className="col-span-2 flex justify-end"><Button type="submit">{t("common.save")}</Button></div>
        </form>
      </Modal>

      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setOpen(true); }}>+ Χρήστης</Button>
      </div>

      {!rows ? (
        <p>…</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table-base min-w-[640px]">
            <thead><tr><th>Όνομα</th><th>Email</th><th>Ρόλος</th><th>€/ώρα</th><th>{t("common.status")}</th><th /></tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.firstName} {u.lastName}</td>
                  <td>{u.email}</td>
                  <td><Badge tone={u.role === "ADMIN" ? "clay" : "slate"}>{t(`role.${u.role}`)}</Badge></td>
                  <td className="tabular-nums">{Number(u.hourlyRate ?? 0).toFixed(0)} €</td>
                  <td>{u.active !== false ? <Badge tone="olive">Ενεργός</Badge> : <Badge tone="rust">Ανενεργός</Badge>}</td>
                  <td><Button variant="ghost" size="sm" onClick={() => { setEditing(u); setOpen(true); }}>{t("common.edit")}</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CompanyTab({ initial }: { initial: Record<string, unknown> }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [form, setForm] = useState<Record<string, unknown>>({
    companyName: "Chromeway — Studio Διακοσμητικών Φινιρισμάτων",
    companyVat: "",
    iban: "GR16 0110 1250 0000 0001 2300 695",
    defaultVatRate: 24,
    quotePrefix: "CW-Q",
    invoicePrefix: "CW-INV",
    projectPrefix: "CW-P",
    address: "Αθήνα, Ελλάδα",
    phone: "+30 210 000 0000",
    email: "hello@chromeway.gr",
    termsEl: "",
    ...initial,
  });

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await fetch("/api/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
        toast(t("common.savedOk"));
      }}
      className="card p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl"
    >
      <p className="eyebrow md:col-span-2">Στοιχεία επιχείρησης (εμφανίζονται σε προσφορές & τιμολόγια)</p>
      <Field label="Επωνυμία"><Input value={(form.companyName as string) ?? ""} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></Field>
      <Field label="ΑΦΜ"><Input value={(form.companyVat as string) ?? ""} onChange={(e) => setForm({ ...form, companyVat: e.target.value })} /></Field>
      <Field label="IBAN πληρωμών"><Input value={(form.iban as string) ?? ""} onChange={(e) => setForm({ ...form, iban: e.target.value })} /></Field>
      <Field label="Τηλέφωνο"><Input value={(form.phone as string) ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label="Email"><Input value={(form.email as string) ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="Διεύθυνση"><Input value={(form.address as string) ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
      <div className="md:col-span-2 border-t border-line-soft pt-3 mt-1" />
      <p className="eyebrow md:col-span-2">Οικονομικές προεπιλογές (EUR · Ελλάδα)</p>
      <Field label={t("settings.defaultVatRate")}><Input type="number" min={0} max={30} step="0.5" value={(form.defaultVatRate as number) ?? 24} onChange={(e) => setForm({ ...form, defaultVatRate: Number(e.target.value) })} /></Field>
      <div />
      <div className="md:col-span-2 flex justify-end">
        <Button type="submit">{t("common.save")}</Button>
      </div>
    </form>
  );
}

function AutomationsTab() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState<{ key: string; enabled: boolean; lastRunAt?: string | null }[]>([]);
  const LABELS: Record<string, string> = {
    followUpOnLead: t("automation.followUpOnLead"),
    unansweredLeads: t("automation.unansweredLeads"),
    visitReminders: t("automation.visitReminders"),
    staleQuotes: t("automation.staleQuotesReminder"),
    createProjectOnAccept: t("automation.createProjectOnAccept"),
    paymentReminders: t("automation.paymentReminders"),
    projectOverrunAlerts: t("automation.projectOverrunAlerts"),
    feedbackAfterCompletion: t("automation.feedbackAfterCompletion"),
  };

  useEffect(() => {
    fetch("/api/automations")
      .then((r) => r.json())
      .then((j) => setRows(j.ok ? j.data : []))
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-3 max-w-3xl">
      <p className="text-[12px] text-ink-faint">{t("automation.runDailyNote")}</p>
      <ul className="card divide-y divide-line-soft px-5">
        {rows.map((a) => (
          <li key={a.key} className="py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[13.5px] font-medium">{LABELS[a.key] ?? a.key}</p>
              {a.lastRunAt && <p className="text-[11px] text-ink-faint">Τελευταία εκτέλεση: {new Date(a.lastRunAt).toLocaleString("el-GR")}</p>}
            </div>
            <button
              className={`btn btn-sm ${a.enabled ? "btn-primary" : "btn-secondary opacity-70"}`}
              onClick={async () => {
                await fetch("/api/automations", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: a.key, enabled: !a.enabled }) });
                toast(t("common.savedOk"));
                setRows((rs) => rs.map((r) => (r.key === a.key ? { ...r, enabled: !r.enabled } : r)));
              }}
            >
              {a.enabled ? `✓ ${t("automation.enabled")}` : "Ανενεργός"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
