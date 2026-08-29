import assert from "node:assert/strict";
import test from "node:test";
import { ExternalProviderError } from "../src/lib/external-http.ts";
import {
  fetchNaverT1Live,
  parseNaverT1Live,
} from "../src/lib/t1-live-provider.ts";

test("Naver live parser returns null when no T1 match is live", () => {
  assert.equal(parseNaverT1Live([]), null);
  assert.equal(
    parseNaverT1Live([
      {
        gameId: "other",
        homeTeam: { nameAcronym: "GEN" },
        awayTeam: { nameAcronym: "HLE" },
      },
    ]),
    null,
  );
});

test("Naver live parser maps scores whether T1 is home or away", () => {
  const home = parseNaverT1Live([
    {
      gameId: "home-game",
      chzzkChannelId: "9381e7d6816e6d915a44a13c0195b202",
      homeScore: 1,
      awayScore: 0,
      homeTeam: { name: "T1", nameAcronym: "T1" },
      awayTeam: { name: "젠지", nameAcronym: "GEN" },
    },
  ], "GEN");
  assert.deepEqual(home, {
    t1Score: 1,
    opponentScore: 0,
    opponent: "GEN",
    gameId: "home-game",
    watchUrl: "https://chzzk.naver.com/live/9381e7d6816e6d915a44a13c0195b202",
    status: "LIVE",
    bestOf: null,
  });

  const away = parseNaverT1Live([
    {
      gameId: "away-game",
      homeScore: 1,
      awayScore: 2,
      homeTeam: { name: "한화생명", nameAcronym: "HLE" },
      awayTeam: { name: "T1", nameAcronym: "T1" },
    },
  ], "HLE");
  assert.deepEqual(away, {
    t1Score: 2,
    opponentScore: 1,
    opponent: "HLE",
    gameId: "away-game",
    watchUrl: null,
    status: "LIVE",
    bestOf: null,
  });
});

test("Naver parser uses the match status and never falls back to a different T1 match", () => {
  const finished = parseNaverT1Live([{
    gameId: "lck-result",
    gameCode: "lol",
    matchStatus: "RESULT",
    maxMatchCount: 5,
    homeScore: 3,
    awayScore: 2,
    homeTeam: { nameAcronym: "T1" },
    awayTeam: { nameAcronym: "BFX" },
  }], "BFX");
  assert.equal(finished?.status, "FINISHED");
  assert.equal(finished?.bestOf, 5);
  assert.equal(parseNaverT1Live([{
    gameId: "wrong-opponent",
    gameCode: "lol",
    matchStatus: "STARTED",
    homeTeam: { nameAcronym: "T1" },
    awayTeam: { nameAcronym: "GEN" },
  }], "BFX"), null);
  assert.equal(parseNaverT1Live([{
    gameId: "wrong-game",
    gameCode: "valorant",
    matchStatus: "STARTED",
    homeTeam: { nameAcronym: "T1" },
    awayTeam: { nameAcronym: "BFX" },
  }], "BFX"), null);
});

test("Naver live request retries 429 only once and preserves provider details", async () => {
  let calls = 0;
  const delays: number[] = [];
  await assert.rejects(
    () => fetchNaverT1Live("GEN", {
      fetchImpl: async () => {
        calls++;
        return new Response("limited", {
          status: 429,
          headers: { "Retry-After": "4" },
        });
      },
      sleep: async ms => { delays.push(ms); },
    }),
    (error: unknown) =>
      error instanceof ExternalProviderError &&
      error.provider === "naver-esports" &&
      error.operation === "live" &&
      error.status === 429 &&
      error.attempts === 2,
  );
  assert.equal(calls, 2);
  assert.deepEqual(delays, [4000]);
});
