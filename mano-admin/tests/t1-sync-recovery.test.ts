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

test("official results repair a TBD card before Leaguepedia cooldown exits", () => {
  const officialFetch = source.indexOf("await fetchLoLEsportsT1Schedule()"), cooldownRead = source.indexOf("SELECT next_allowed_at FROM t1_sync_state", source.indexOf("export async function syncT1FromLeaguepedia"));
  assert.ok(officialFetch > 0 && officialFetch < cooldownRead);
  assert.match(source, /SET opponent=\$2,best_of=\$3,status=\$4,t1_score=\$5,opponent_score=\$6/);
});
