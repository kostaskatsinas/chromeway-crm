"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { Button, Input } from "@/components/ui";
import { useI18n } from "@/i18n/LanguageProvider";

function ResetForm() {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      await api("/api/auth/password", { method: "PUT", body: { token, password } });
      setDone(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch (e) {
      setErr(String((e as Error).message));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input
        type="password"
        required
        minLength={8}
        placeholder={t("auth.newPassword")}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {err && <p className="text-rust text-[13px]">{err}</p>}
      {done && <p className="text-olive text-[13px]">{t("auth.resetDone")}</p>}
      <Button type="submit" className="w-full" disabled={done}>
        {t("auth.resetSubmit")}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h2 className="display text-3xl mb-6">{t("auth.forgotTitle")}</h2>
        <Suspense fallback={<p className="text-sm text-ink-faint">{t("common.loading")}</p>}>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
