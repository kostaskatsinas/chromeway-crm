import { test } from "node:test";
import assert from "node:assert/strict";
import { toCsv, cn, initials, fullName } from "../src/lib/utils.ts";

test("toCsv — escapes quotes & newlines and adds BOM", () => {
  const csv = toCsv([
    { name: 'Ο Κατασκευαστής "ΑΕ"', city: "Αθήνα, Κέντρο", total: 1250.5 },
  ]);
  assert.ok(csv.startsWith("\ufeff"));
  assert.ok(csv.includes('"Ο Κατασκευαστής ""ΑΕ"""'));
  assert.ok(csv.includes('"Αθήνα, Κέντρο"'));
  assert.ok(csv.includes("1250.5"));
});

test("toCsv — empty rows returns empty string", () => {
  assert.equal(toCsv([]), "");
});

test("utils — cn joins classes", () => {
  assert.equal(cn("a", false && "b", null, "c"), "a c");
});

test("utils — initials & fullName", () => {
  assert.equal(initials("Κώστας", "Κατσίνας"), "ΚΚ");
  assert.equal(fullName({ firstName: "Ελένη", lastName: "Μαρκογιάννη" }), "Ελένη Μαρκογιάννη");
  assert.equal(fullName({}), "—");
});
