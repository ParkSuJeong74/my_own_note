import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { finishedMatchPom, t1SeriesGameNumbers } from "../src/lib/t1-presentation.ts";

test("shows a normalized POM only for a finished match", () => {
  assert.equal(finishedMatchPom("FINISHED", "  Faker  "), "Faker");
  assert.equal(finishedMatchPom("LIVE", "Faker"), null);
  assert.equal(finishedMatchPom("UPCOMING", "Faker"), null);
});

test("omits missing POM data from finished matches", () => {
  assert.equal(finishedMatchPom("FINISHED", ""), null);
  assert.equal(finishedMatchPom("FINISHED", "   "), null);
});

test("set navigation includes every played and non-contiguous collected game", () => {
  assert.deepEqual(t1SeriesGameNumbers({ status: "FINISHED", t1Score: 3, opponentScore: 1, gameNumbers: [1] }), [1, 2, 3, 4]);
  assert.deepEqual(t1SeriesGameNumbers({ status: "LIVE", t1Score: 1, opponentScore: 0, gameNumbers: [1, 3] }), [1, 2, 3]);
  assert.deepEqual(t1SeriesGameNumbers({ status: "FINISHED", t1Score: 0, opponentScore: 0, gameNumbers: [] }), [1]);
});

test("each collected set is independently collapsible and all set sync controls stay available", () => {
  const source = readFileSync(new URL("../src/app/t1/page.tsx", import.meta.url), "utf8");
  assert.match(source, /<details className="game-detail"[\s\S]*open=\{gameIndex === 0\}/);
  assert.match(source, /gameNumbers\.map\(gameNumber => <form action=\{syncT1GameDetailsAction\}/);
  assert.match(source, /OFFICIAL POM[\s\S]*집계 대기/);
});
