/** Defense-in-depth for accidental Prisma `include: { user: true }` usage. */
export function stripCredentialFields<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripCredentialFields) as T;
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) return value;

  const safe: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key === "passwordHash") continue;
    safe[key] = stripCredentialFields(child);
  }
  return safe as T;
}

export function stripSensitiveFields<T extends Record<string, unknown>>(
  row: T,
  fields: string[],
  allowed: boolean,
  resource?: string
): T {
  const safe: Record<string, unknown> = stripCredentialFields(row);
  if (allowed || fields.length === 0) return safe as T;
  for (const field of fields) safe[field] = null;
  if (resource === "projects" && safe.quotation && typeof safe.quotation === "object") {
    safe.quotation = { ...(safe.quotation as Record<string, unknown>), totalGross: null };
  }
  return safe as T;
}

export function stripQuotationCosts<T extends Record<string, unknown>>(quote: T, allowed: boolean): T {
  if (allowed) return quote;
  const items = Array.isArray(quote.items)
    ? quote.items.map((rawItem: unknown) => {
        if (!rawItem || typeof rawItem !== "object") return rawItem;
        const { unitCost, ...item } = rawItem as Record<string, unknown>;
        void unitCost;
        return item;
      })
    : undefined;
  return {
    ...quote,
    internalCost: null,
    internalMarginPct: null,
    ...(items ? { items } : {}),
  } as unknown as T;
}
