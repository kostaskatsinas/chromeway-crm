import { test } from "node:test";
import assert from "node:assert/strict";
import { translate, dictionaries, type Lang } from "../src/i18n/dictionaries.ts";

test("Greek dictionary is the default and complete", () => {
  assert.equal(translate("el", "nav.dashboard"), "Επισκόπηση");
  assert.equal(translate("el", "qstatus.ACCEPTED"), "Αποδεκτή");
});

test("English dictionary covers the same keys as Greek", () => {
  const elKeys = Object.keys(dictionaries.el).sort();
  const enKeys = Object.keys(dictionaries.en).sort();
  const missingInEn = elKeys.filter((k) => !enKeys.includes(k));
  const extraInEn = enKeys.filter((k) => !Object.keys(dictionaries.el).includes(k));
  assert.deepEqual(missingInEn, [], `keys missing in EN: ${missingInEn.slice(0, 10).join(", ")}`);
  // EN should not have orphan keys either
  assert.ok(extraInEn.length <= 0, `orphan keys in EN: ${extraInEn.slice(0, 10).join(", ")}`);
});

test("translate falls back to key when missing", () => {
  assert.equal(translate("en" as Lang, "nonexistent.key"), "nonexistent.key");
});

test("variable interpolation works", () => {
  const dict = dictionaries.el;
  dict["test.hello"] = "Γεια σου {name}!";
  assert.equal(translate("el", "test.hello", { name: "Χρώμα" }), "Γεια σου Χρώμα!");
  delete dict["test.hello"];
});
