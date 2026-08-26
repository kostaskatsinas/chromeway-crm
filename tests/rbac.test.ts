import { test } from "node:test";
import assert from "node:assert/strict";
import { can } from "../src/lib/rbac.ts";

test("RBAC — admin has every capability", () => {
  const caps = ["finance.view", "settings.users", "audit.view", "quotes.costs", "projects.delete"] as const;
  for (const c of caps) assert.ok(can("ADMIN", c), `ADMIN should have ${c}`);
});

test("RBAC — accountant sees finance but not pipeline editing", () => {
  assert.ok(can("ACCOUNTANT", "finance.edit"));
  assert.ok(can("ACCOUNTANT", "finance.export"));
  assert.ok(!can("ACCOUNTANT", "pipeline.edit"));
  assert.ok(!can("ACCOUNTANT", "contacts.delete"));
});

test("RBAC — technician cannot view financials", () => {
  assert.ok(!can("TECHNICIAN", "projects.financials"));
  assert.ok(!can("TECHNICIAN", "finance.view"));
  assert.ok(!can("TECHNICIAN", "quotes.costs"));
  // but can work visits/tasks
  assert.ok(can("TECHNICIAN", "visits.edit"));
  assert.ok(can("TECHNICIAN", "tasks.edit"));
});

test("RBAC — external collaborator is minimal", () => {
  assert.ok(can("COLLABORATOR", "projects.view"));
  assert.ok(!can("COLLABORATOR", "contacts.view"));
  assert.ok(!can("COLLABORATOR", "catalogue.view"));
  assert.ok(!can("SALES", "settings.system"));
});
