import assert from "node:assert/strict";
import test from "node:test";
import { findLoLEsportsGameId, findLoLEsportsT1Opponent, parseLoLEsportsT1Schedule } from "../src/lib/t1-lolesports-provider.ts";

test("finds the requested set from embedded LoL Esports event data", () => {
    const event = { __typename: "EventMatch", id: "match", startTime: "2026-08-29T08:00:00Z", matchTeams: [{ name: "BNK FEARX", code: "BFX" }, { name: "T1", code: "T1" }], match: { games: [{ id: "game-1", number: 1 }, { id: "game-2", number: 2 }] } };
  assert.equal(findLoLEsportsGameId(`<script>${JSON.stringify(event)}</script>`, "2026-08-29T08:00:00.000Z", "BNK FEARX", 2), "game-2");
});

test("does not select another opponent", () => {
    const event = { __typename: "EventMatch", startTime: "2026-08-29T08:00:00Z", matchTeams: [{ name: "GEN", code: "GEN" }, { name: "T1", code: "T1" }], match: { games: [{ id: "wrong", number: 1 }] } };
  assert.equal(findLoLEsportsGameId(JSON.stringify(event), "2026-08-29T08:00:00.000Z", "BNK FEARX", 1), null);
});

test("resolves a TBD T1 slot from the official schedule", () => {
  const t1 = { __typename: "EventMatch", id: "resolved-match", startTime: "2026-09-06T08:00:00Z", matchTeams: [{ name: "Dplus KIA", code: "DK" }, { name: "T1", code: "T1" }] };
  const other = { __typename: "EventMatch", id: "other-match", startTime: "2026-09-06T09:00:00Z", matchTeams: [{ name: "GEN", code: "GEN" }, { name: "HLE", code: "HLE" }] };
  const document = `${JSON.stringify(other)}${JSON.stringify(t1)}`;
  assert.deepEqual(parseLoLEsportsT1Schedule(document), [{ eventId: "resolved-match", scheduledAt: "2026-09-06T08:00:00.000Z", opponent: "DK" }]);
  assert.equal(findLoLEsportsT1Opponent(document, "2026-09-06T08:00:00.000Z"), "DK");
});

test("does not use an undecided or distant official opponent", () => {
  const undecided = JSON.stringify({ __typename: "EventMatch", id: "tbd", startTime: "2026-09-06T08:00:00Z", matchTeams: [{ name: "TBD", code: "TBD" }, { name: "T1", code: "T1" }] });
  const resolved = JSON.stringify({ __typename: "EventMatch", id: "distant", startTime: "2026-09-07T08:00:00Z", matchTeams: [{ name: "Dplus KIA", code: "DK" }, { name: "T1", code: "T1" }] });
  assert.equal(findLoLEsportsT1Opponent(`${undecided}${resolved}`, "2026-09-06T08:00:00.000Z"), null);
});
