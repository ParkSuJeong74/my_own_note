import assert from "node:assert/strict";
import test from "node:test";
import { normalizeOfficialPom } from "../src/lib/t1-pom.ts";

test("normalizes official series POM provider text", () => {
  assert.equal(normalizeOfficialPom("Faker"), "Faker");
  assert.equal(normalizeOfficialPom("[[Lee Sang-hyeok|Faker]]"), "Faker");
  assert.equal(normalizeOfficialPom("POM:  Delight  "), "Delight");
  assert.equal(normalizeOfficialPom("Zeka, Delight"), "Zeka, Delight");
});

test("does not invent a POM when the provider value is empty", () => {
  assert.equal(normalizeOfficialPom(""), null);
  assert.equal(normalizeOfficialPom("   "), null);
});
