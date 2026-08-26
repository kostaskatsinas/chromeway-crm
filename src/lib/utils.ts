import { randomBytes } from "crypto";

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function secureToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function initials(first: string, last: string): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

export function fullName(p: { firstName?: string | null; lastName?: string | null }): string {
  return [p.firstName, p.lastName].filter(Boolean).join(" ") || "—";
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Simple CSV builder with BOM so Excel reads Greek correctly. */
export function toCsv(rows: Record<string, unknown>[], headers?: { key: string; label: string }[]): string {
  if (rows.length === 0) return "";
  const cols = headers ?? Object.keys(rows[0]).map((k) => ({ key: k, label: k }));
  const cell = (v: unknown) => {
    let s = v === null || v === undefined ? "" : String(v);
    s = s.replace(/"/g, '""').replace(/\r?\n/g, " ");
    return `"${s}"`;
  };
  const lines = [
    cols.map((c) => cell(c.label)).join(","),
    ...rows.map((r) => cols.map((c) => cell(r[c.key])).join(",")),
  ];
  return "\ufeff" + lines.join("\r\n");
}
