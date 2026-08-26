import { test } from "node:test";
import assert from "node:assert/strict";
import { invoicePaymentState } from "../src/lib/invoice-state.ts";

test("invoicePaymentState — issued, partial, paid and overdue", () => {
  const now = new Date("2026-08-26T12:00:00Z");
  assert.equal(invoicePaymentState(1000, 0, new Date("2026-09-01T00:00:00Z"), now), "ISSUED");
  assert.equal(invoicePaymentState(1000, 250, null, now), "PARTIALLY_PAID");
  assert.equal(invoicePaymentState(1000, 1000, null, now), "PAID");
  assert.equal(invoicePaymentState(1000, 0, new Date("2026-08-01T00:00:00Z"), now), "OVERDUE");
});
