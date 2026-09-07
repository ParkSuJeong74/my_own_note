import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/lib/t1-repository.ts", import.meta.url), "utf8");

test("stale TBD matches remain eligible for official opponent recovery", () => {
  assert.match(source, /status='UPCOMING'[\s\S]*upper\(trim\(opponent\)\)[\s\S]*scheduled_at>now\(\)-interval '45 days'/);
});

test("a resolved provider match adopts the existing bracket placeholder card", () => {
  assert.match(source, /UPDATE t1_matches SET external_id=\$1[\s\S]*candidate\.status='UPCOMING'[\s\S]*candidate\.opponent[\s\S]*10800[\s\S]*resolved\.external_id=\$1/);
  assert.match(source, /const opponent = t1First \? team2 : team1/);
});
