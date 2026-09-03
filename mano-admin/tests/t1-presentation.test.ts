import assert from "node:assert/strict";
import test from "node:test";
import { finishedMatchPom } from "../src/lib/t1-presentation.ts";

test("shows a normalized POM only for a finished match", () => {
  assert.equal(finishedMatchPom("FINISHED", "  Faker  "), "Faker");
  assert.equal(finishedMatchPom("LIVE", "Faker"), null);
  assert.equal(finishedMatchPom("UPCOMING", "Faker"), null);
});

test("omits missing POM data from finished matches", () => {
  assert.equal(finishedMatchPom("FINISHED", ""), null);
  assert.equal(finishedMatchPom("FINISHED", "   "), null);
});
