"use client";

import { createContext, useCallback, useContext } from "react";
import { translate, type Lang } from "./dictionaries";

type I18nCtx = {
  lang: Lang;
  t: (key: string, vars?: Record<string, string | number>) => string;
  setLang: (l: Lang) => void;
};

const Ctx = createContext<I18nCtx>({ lang: "el", t: (k) => k, setLang: () => {} });

export function LanguageProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  const setLang = useCallback((l: Lang) => {
    document.cookie = `cw_lang=${l};path=/;max-age=${60 * 60 * 24 * 365}`;
    window.location.reload();
  }, []);

  const value: I18nCtx = {
    lang,
    t: (key, vars) => translate(lang, key, vars),
    setLang,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}

/** Locale-aware formatting helpers */
export function fmtMoney(n: number | string | null | undefined, lang: Lang = "el", compact = false): string {
  const num = typeof n === "string" ? parseFloat(n) : n ?? 0;
  const locale = lang === "el" ? "el-GR" : "en-IE";
  if (compact && Math.abs(num) >= 1000) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(num);
  }
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(num);
}

export function fmtNum(n: number | null | undefined, lang: Lang = "el", digits = 2): string {
  const locale = lang === "el" ? "el-GR" : "en-GB";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(n ?? 0);
}

export function fmtDate(d: Date | string | null | undefined, lang: Lang = "el"): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(lang === "el" ? "el-GR" : "en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

export function fmtDateTime(d: Date | string | null | undefined, lang: Lang = "el"): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(lang === "el" ? "el-GR" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
