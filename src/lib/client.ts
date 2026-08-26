"use client";

/**
 * Localized, human-readable messages for API error codes.
 * Unknown codes pass through unchanged (Zod messages are already readable).
 */
const MESSAGES: Record<string, Record<string, string>> = {
  el: {
    UNAUTHENTICATED: "Η συνεδρία έληξε. Συνδεθείτε ξανά.",
    FORBIDDEN: "Δεν έχετε δικαίωμα για αυτή την ενέργεια.",
    SERVER_ERROR: "Κάτι πήγε στραβά. Δοκιμάστε ξανά.",
    INVALID_JSON: "Μη έγκυρα δεδομένα αιτήματος.",
    BAD_RESPONSE: "Μη έγκυρη απάντηση διακομιστή.",
    NOT_FOUND: "Το στοιχείο δεν βρέθηκε.",
    UNKNOWN_RESOURCE: "Άγνωστος τύπος δεδομένων.",
    QUERY_TOO_SHORT: "Γράψτε τουλάχιστον 2 χαρακτήρες.",
    ALREADY_DECIDED: "Η προσφορά έχει ήδη κριθεί.",
    LINK_EXPIRED: "Ο σύνδεσμος έληξε.",
    TOKEN_INVALID: "Ο σύνδεσμος επαναφοράς είναι άκυρος ή έληξε.",
    WRONG_PASSWORD: "Ο τρέχων κωδικός δεν είναι σωστός.",
    CANNOT_DELETE_SELF: "Δεν μπορείτε να διαγράψετε τον δικό σας λογαριασμό.",
    MISSING_ID: "Λείπει το αναγνωριστικό εγγραφής.",
    NO_FILE: "Δεν επιλέχθηκε αρχείο.",
    FILE_TOO_LARGE: "Το αρχείο υπερβαίνει το όριο των 25 MB.",
    GONE: "Το αρχείο δεν είναι πλέον διαθέσιμο.",
    INVALID_STATE: "Η ενέργεια δεν επιτρέπεται στην τρέχουσα κατάσταση.",
    QUOTATION_NOT_FOUND: "Η προσφορά δεν βρέθηκε.",
  },
  en: {
    UNAUTHENTICATED: "Your session expired. Please sign in again.",
    FORBIDDEN: "You don't have permission for this action.",
    SERVER_ERROR: "Something went wrong. Please try again.",
    INVALID_JSON: "Invalid request data.",
    BAD_RESPONSE: "Invalid server response.",
    NOT_FOUND: "The record was not found.",
    UNKNOWN_RESOURCE: "Unknown data type.",
    QUERY_TOO_SHORT: "Type at least 2 characters.",
    ALREADY_DECIDED: "This quotation has already been decided.",
    LINK_EXPIRED: "This link has expired.",
    TOKEN_INVALID: "The reset link is invalid or expired.",
    WRONG_PASSWORD: "The current password is incorrect.",
    CANNOT_DELETE_SELF: "You cannot delete your own account.",
    MISSING_ID: "Missing record identifier.",
    NO_FILE: "No file selected.",
    FILE_TOO_LARGE: "File exceeds the 25 MB limit.",
    GONE: "The file is no longer available.",
    INVALID_STATE: "Not allowed in the current state.",
    QUOTATION_NOT_FOUND: "Quotation not found.",
  },
};

export function currentLang(): "el" | "en" {
  if (typeof document === "undefined") return "el";
  const m = document.cookie.match(/(?:^|;\s*)cw_lang=(el|en)/);
  return m ? (m[1] as "el" | "en") : "el";
}

/** Maps an API error code to localized human copy (falls back to the code). */
export function errorMessage(code: string): string {
  const table = MESSAGES[currentLang()];
  return table[code] ?? code;
}

/** Small typed fetch wrapper for the REST API */
export async function api<T = unknown>(
  path: string,
  opts?: { method?: string; body?: unknown; formData?: FormData }
): Promise<T> {
  const res = await fetch(path, {
    method: opts?.method ?? (opts?.body || opts?.formData ? "POST" : "GET"),
    headers: opts?.formData ? undefined : { "Content-Type": "application/json" },
    body: opts?.formData ?? (opts?.body ? JSON.stringify(opts.body) : undefined),
  });
  const json = await res.json().catch(() => ({ ok: false, error: "BAD_RESPONSE" }));
  if (!res.ok || !json.ok) throw new Error(errorMessage(json.error ?? `HTTP ${res.status}`));
  return json.data as T;
}
