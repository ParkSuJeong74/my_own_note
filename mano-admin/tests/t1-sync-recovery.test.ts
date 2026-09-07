import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/lib/t1-repository.ts", import.meta.url), "utf8");

test("stale TBD matches remain eligible for official opponent recovery", () => {
  assert.match(source, /status='UPCOMING'[\s\S]*upper\(trim\(opponent\)\)[\s\S]*scheduled_at>now\(\)-interval '45 days'/);
});
