"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { Button, Input } from "@/components/ui";
import { useI18n } from "@/i18n/LanguageProvider";

export default function LoginPage() {
  const { t, lang, setLang } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    try {
      const res = await api<{ authenticated: boolean }>("/api/auth/session", { body: { email, password } });
      if (res.authenticated) {
        router.push(params.get("next") || "/dashboard");
        router.refresh();
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Visual panel */}
      <div
        className="hidden lg:block w-[45%] relative bg-cover bg-center"
        style={{
          background:
            "linear-gradient(160deg, rgba(42,37,33,.72), rgba(42,37,33,.35)), url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22800%22 height=%221200%22><rect fill=%22%23b9a894%22 width=%22800%22 height=%221200%22/><path d=%22M0 300 Q400 240 800 320 L800 0 L0 0Z%22 fill=%22%23a08d78%22/><path d=%22M0 640 Q380 560 800 680 L800 300 Q400 220 0 280Z%22 fill=%22%238f7c67%22/><path d=%22M0 950 Q420 870 800 1000 L800 660 Q380 540 0 620Z%22 fill=%22%23776452%22/></svg>')",
        }}
      >
        <div className="absolute inset-0 flex flex-col justify-end p-12 text-paper">
          <p className="eyebrow !text-paper/60 mb-3">Est. Athens · Greece</p>
          <h1 className="display text-5xl leading-tight max-w-md">Chromeway</h1>
          <p className="mt-3 max-w-sm text-paper/80 leading-relaxed">
            {lang === "el"
              ? "Διακοσμητικά φινιρίσματα premium κατηγορίας — από το πρώτο δείγμα έως την παράδοση του έργου."
              : "Premium decorative finishes — from the first sample to final project handover."}
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between mb-10">
            <span className="display text-2xl tracking-wide">
              chromeway<span className="text-clay">.</span>
            </span>
            <button onClick={() => setLang(lang === "el" ? "en" : "el")} className="btn btn-ghost btn-sm uppercase tracking-widest">
              {lang === "el" ? "EN" : "ΕΛ"}
            </button>
          </div>

          <h2 className="display text-3xl mb-1">{t("auth.loginTitle")}</h2>
          <p className="text-sm text-ink-faint mb-8">{t("auth.loginSubtitle")}</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">{t("common.email")}</label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@chromeway.gr" autoFocus />
            </div>
            <div>
              <label className="label">{t("auth.password")}</label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-rust text-[13px]">{t("auth.invalidCredentials")}</p>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? t("common.loading") : t("auth.signIn")}
            </Button>
          </form>

          <a href="/forgot-password" className="block mt-6 text-center text-[13px] text-ink-faint hover:text-clay underline underline-offset-4">
            {t("auth.forgot")}
          </a>
        </div>
      </div>
    </div>
  );
}
