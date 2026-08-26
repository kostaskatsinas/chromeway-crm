import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { LanguageProvider } from "@/i18n/LanguageProvider";
import type { Lang } from "@/i18n/dictionaries";
import { ToastProvider } from "@/components/ui";

export const metadata: Metadata = {
  title: "Chromeway CRM",
  description: "Premium decorative finishes studio management — Athens, Peloponnese, Greece",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const lang = (jar.get("cw_lang")?.value === "en" ? "en" : "el") as Lang;

  return (
    <html lang={lang}>
      <body className="antialiased">
        <LanguageProvider lang={lang}>
          <ToastProvider>{children}</ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
