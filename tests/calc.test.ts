import { test } from "node:test";
import assert from "node:assert/strict";
import { computeQuoteTotals, weightedValue, areaFromDims, scheduleAmounts } from "../src/lib/calc.ts";

test("computeQuoteTotals — full quotation math", () => {
  const t = computeQuoteTotals({
    items: [
      { quantity: 100, unitPrice: 58, unitCost: 14 },
      { quantity: 20, unitPrice: 140, unitCost: 38 },
      { quantity: 1, unitPrice: 380, unitCost: 260 },
    ],
    wastePct: 6,
    markupPct: 32,
    discountPct: 0,
    vatRate: 24,
  });
  assert.equal(t.subtotal, 8980); // 5800 + 2800 + 380
  assert.equal(t.wasteAmount, 538.8);
  assert.equal(t.totalNet, Math.round((8980 * 1.06) * 1.32 * 100) / 100); // waste + markup
  assert.equal(t.totalGross, Math.round(t.totalNet * 1.24 * 100) / 100);
  assert.equal(t.internalCost, 1400 + 760 + 260);
});

test("computeQuoteTotals — discount reduces net", () => {
  const base = computeQuoteTotals({ items: [{ quantity: 10, unitPrice: 100 }] });
  const disc = computeQuoteTotals({ items: [{ quantity: 10, unitPrice: 100 }], discountPct: 10 });
  assert.equal(disc.totalNet, base.totalNet * 0.9);
  assert.ok(disc.discountAmount > 0);
});

test("computeQuoteTotals — margin calculation", () => {
  const t = computeQuoteTotals({
    items: [{ quantity: 10, unitPrice: 100, unitCost: 30 }],
  });
  // net=1000, cost=300 → margin 70%
  assert.equal(t.marginPct, 70);
});

test("computeQuoteTotals — zero division safe", () => {
  const t = computeQuoteTotals({ items: [] });
  assert.equal(t.marginPct, 0);
  assert.equal(t.totalGross, 0);
});

test("weightedValue — probability weighting", () => {
  const v = weightedValue([
    { estimatedValue: 10000, probability: 50 },
    { estimatedValue: 20000, probability: 25 },
  ]);
  assert.equal(v, 5000 + 5000);
});

test("areaFromDims — floor vs wall", () => {
  assert.equal(areaFromDims({ lengthM: 5, widthM: 4 }), 20);
  assert.equal(areaFromDims({ lengthM: 18, heightM: 4.2 }), 75.6);
  assert.equal(areaFromDims({}), null);
});

test("scheduleAmounts — payment split", () => {
  const s = scheduleAmounts(12400, [
    { pct: 40, dueDays: 0 },
    { pct: 35, dueDays: 15 },
    { pct: 25, dueDays: 30 },
  ]);
  assert.deepEqual(s.map((x) => x.amount), [4960, 4340, 3100]);
});
