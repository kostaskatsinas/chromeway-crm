/**
 * Pure calculation functions shared between client and server.
 * All money values handled in integer cents internally at the edges;
 * here we operate on plain numbers rounded to 2 decimals.
 */

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export type QuoteInput = {
  items: { quantity: number; unitPrice: number; unitCost?: number }[];
  wastePct?: number;
  markupPct?: number;
  discountPct?: number;
  vatRate?: number;
};

export type QuoteTotals = {
  subtotal: number;       // sum of lines
  wasteAmount: number;    // material waste buffer (applied on subtotal)
  markupAmount: number;
  discountAmount: number;
  totalNet: number;
  vatAmount: number;
  totalGross: number;
  internalCost: number;
  marginPct: number;      // (net - cost) / net * 100
};

export function computeQuoteTotals(input: QuoteInput): QuoteTotals {
  const wastePct = input.wastePct ?? 0;
  const markupPct = input.markupPct ?? 0;
  const discountPct = input.discountPct ?? 0;
  const vatRate = input.vatRate ?? 24;

  let subtotal = 0;
  let internalCost = 0;
  for (const it of input.items) {
    subtotal += it.quantity * it.unitPrice;
    internalCost += it.quantity * (it.unitCost ?? 0);
  }
  subtotal = round2(subtotal);
  internalCost = round2(internalCost);

  // Waste applies to material-type lines conceptually; simplified to whole-subtotal buffer
  const wasteAmount = round2(subtotal * (wastePct / 100));
  const withWaste = round2(subtotal + wasteAmount);

  const baseAfterDiscount = round2(withWaste * (1 - discountPct / 100));
  const discountAmount = round2(withWaste - baseAfterDiscount);

  const markedUp = round2(baseAfterDiscount * (1 + markupPct / 100));
  const markupAmount = round2(markedUp - baseAfterDiscount);

  const totalNet = markedUp;
  const vatAmount = round2(totalNet * (vatRate / 100));
  const totalGross = round2(totalNet + vatAmount);

  const marginPct = totalNet > 0 ? round2(((totalNet - internalCost) / totalNet) * 100) : 0;

  return {
    subtotal,
    wasteAmount,
    markupAmount,
    discountAmount,
    totalNet,
    vatAmount,
    totalGross,
    internalCost,
    marginPct,
  };
}

/** Payment schedule helper: array of {label, pct, dueDays} → amounts */
export function scheduleAmounts(totalGross: number, schedule: { pct: number; dueDays?: number }[]) {
  return schedule.map((s) => ({ ...s, amount: round2(totalGross * (s.pct / 100)) }));
}

/** Weighted pipeline value: Σ estimatedValue × probability/100 */
export function weightedValue(opps: { estimatedValue: number; probability: number }[]) {
  return round2(opps.reduce((acc, o) => acc + (o.estimatedValue * o.probability) / 100, 0));
}

/** Measurement area from dims */
export function areaFromDims(d: { lengthM?: number | null; widthM?: number | null; heightM?: number | null }) {
  const { lengthM, widthM, heightM } = d;
  if (lengthM && widthM) return round2(lengthM * widthM);
  if (lengthM && heightM) return round2(lengthM * heightM); // e.g. wall run × height
  return null;
}
