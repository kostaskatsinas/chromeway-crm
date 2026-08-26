"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";
import { currentLang } from "@/lib/client";

const COPY = {
  el: {
    dbTitle: "Η βάση δεδομένων δεν είναι διαθέσιμη",
    dbHint: "Ελέγξτε ότι το container της βάσης τρέχει (docker compose up -d db) και δοκιμάστε ξανά.",
    genericTitle: "Κάτι πήγε στραβά",
    genericHint: "Παρουσιάστηκε απρόσμενο σφάλμα. Η ομάδα έχει ενημερωθεί μέσω του αρχείου καταγραφής.",
    retry: "Επαναφορά ↻",
  },
  en: {
    dbTitle: "Database unavailable",
    dbHint: "Make sure the database container is running (docker compose up -d db) and try again.",
    genericTitle: "Something went wrong",
    genericHint: "An unexpected error occurred. It has been logged for the team.",
    retry: "Retry ↻",
  },
} as const;

function isDbError(message: string): boolean {
  return /Can't reach database server|PrismaClientInitializationError|PrismaClientKnownRequestError|P1001|P1002|Timed out fetching|connection pool/i.test(
    message ?? ""
  );
}

/** Shared fallback UI used by the route-segment error boundaries. */
export function ErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[chromeway]", error);
  }, [error]);

  const c = COPY[currentLang()];
  const dbDown = isDbError(error.message);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="card max-w-md w-full p-8 text-center">
        <p className="text-4xl mb-3" aria-hidden>
          {dbDown ? "🗄" : "⚠"}
        </p>
        <h1 className="display text-2xl mb-2">{dbDown ? c.dbTitle : c.genericTitle}</h1>
        <p className="text-[13px] text-ink-soft leading-relaxed">{dbDown ? c.dbHint : c.genericHint}</p>
        {error.digest && (
          <p className="text-[11px] text-ink-faint mt-3">
            ref: <code>{error.digest}</code>
          </p>
        )}
        <Button className="mt-5" onClick={reset}>
          {c.retry}
        </Button>
      </div>
    </div>
  );
}
