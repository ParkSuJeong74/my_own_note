import assert from "node:assert/strict";
import test from "node:test";
import { findLoLEsportsGameId } from "../src/lib/t1-lolesports-provider.ts";

test("finds the requested set from embedded LoL Esports event data", () => {
    const event = { __typename: "EventMatch", id: "match", startTime: "2026-08-29T08:00:00Z", matchTeams: [{ name: "BNK FEARX", code: "BFX" }, { name: "T1", code: "T1" }], match: { games: [{ id: "game-1", number: 1 }, { id: "game-2", number: 2 }] } };
  assert.equal(findLoLEsportsGameId(`<script>${JSON.stringify(event)}</script>`, "2026-08-29T08:00:00.000Z", "BNK FEARX", 2), "game-2");
});

test("does not select another opponent", () => {
    const event = { __typename: "EventMatch", startTime: "2026-08-29T08:00:00Z", matchTeams: [{ name: "GEN", code: "GEN" }, { name: "T1", code: "T1" }], match: { games: [{ id: "wrong", number: 1 }] } };
  assert.equal(findLoLEsportsGameId(JSON.stringify(event), "2026-08-29T08:00:00.000Z", "BNK FEARX", 1), null);
});
