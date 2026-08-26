import { test } from "node:test";
import assert from "node:assert/strict";
import { stripCredentialFields, stripSensitiveFields, stripQuotationCosts } from "../src/lib/security.ts";

test("credential sanitizer removes nested password hashes", () => {
  const row = {
    id: "p1",
    manager: { id: "u1", firstName: "Alex", passwordHash: "bcrypt-secret" },
    tasks: [{ assignee: { id: "u2", passwordHash: "another-secret" } }],
  };
  const safe = stripCredentialFields(row);
  assert.ok(!Object.hasOwn(safe.manager, "passwordHash"));
  assert.ok(!Object.hasOwn(safe.tasks[0].assignee, "passwordHash"));
  assert.equal(safe.manager.firstName, "Alex");
});

test("resource sanitizer removes project money from collaborator responses", () => {
  const row = {
    id: "p1",
    contractValue: "12000",
    estimatedCost: "5000",
    quotation: { id: "q1", number: "CW-Q-1", totalGross: "12000" },
  };
  const collaborator = stripSensitiveFields(row, ["contractValue", "estimatedCost"], false, "projects");
  assert.equal(collaborator.contractValue, null);
  assert.equal(collaborator.estimatedCost, null);
  assert.equal(collaborator.quotation.totalGross, null);

  const pm = stripSensitiveFields(row, ["contractValue", "estimatedCost"], true, "projects");
  assert.equal(pm.contractValue, "12000");
});

test("quotation sanitizer removes internal costs from sales responses", () => {
  const quote = { internalCost: 500, internalMarginPct: 40, items: [{ id: "i1", unitCost: 10, unitPrice: 20 }] };
  const sales = stripQuotationCosts(quote, false);
  assert.equal(sales.internalCost, null);
  assert.equal(sales.internalMarginPct, null);
  assert.ok(!Object.hasOwn(sales.items[0], "unitCost"));
  assert.equal(sales.items[0].unitPrice, 20);
});
