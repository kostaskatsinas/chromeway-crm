"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { Button, Input } from "@/components/ui";
import { useI18n } from "@/i18n/LanguageProvider";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api<{ sent: boolean; devLink: string | null }>("/api/auth/password", { body: { email } });
      setSent(true);
      setDevLink(res.devLink);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h2 className="display text-3xl mb-1">{t("auth.forgotTitle")}</h2>
        <p className="text-sm text-ink-faint mb-6">{t("auth.forgotHint")}</p>
        <form onSubmit={submit} className="space-y-4">
          <Input type="email" required placeholder={t("common.email")} value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" className="w-full" disabled={busy || sent}>
            {t("auth.sendReset")}
          </Button>
        </form>
        {sent && (
          <div className="mt-5 card p-4 text-[13px] text-ink-soft space-y-2">
            <p>{t("auth.resetSent")}</p>
            {devLink && (
              <a href={devLink} className="block break-all text-clay underline underline-offset-2">
                {devLink}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
