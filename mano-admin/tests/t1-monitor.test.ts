import assert from "node:assert/strict";
import test from "node:test";
import { ExternalProviderError } from "../src/lib/external-http.ts";
import { evaluateT1MatchMonitor, type T1MonitorEvent, type T1MonitorMatch, type T1MonitorState } from "../src/lib/t1-monitor-engine.ts";
import { isFinishedScore, t1LiveClaimPolicy } from "../src/lib/t1-monitor-policy.ts";

const baseNow = new Date("2026-08-29T03:00:00.000Z");
const match = (minutesUntilStart: number, status: T1MonitorMatch["status"] = "UPCOMING"): T1MonitorMatch => ({
  id: "match-1", externalId: "external-1", tournament: "LCK", opponent: "GEN", scheduledAt: new Date(baseNow.getTime() + minutesUntilStart * 60_000), bestOf: 3, status, t1Score: 0, opponentScore: 0, sourceUrl: "https://example.com/match",
});
const state = (): T1MonitorState => ({ lastCheckedAt: null, lastExternalFetchAt: null, nextExternalFetchAt: null, preMatchNotificationSentAt: null, lastKnownT1Score: 0, lastKnownOpponentScore: 0, lastKnownSetNumber: 0, finalDetectedAt: null, finalNotificationSentAt: null, monitoringCompletedAt: null, lastProviderStatus: null, externalRequestCount: 0 });

test("final score detection follows single-game, BO3, and BO5 formats", () => {
  assert.equal(isFinishedScore(1, 0, 1), true);
  assert.equal(isFinishedScore(2, 1, 3), true);
  assert.equal(isFinishedScore(2, 2, 5), false);
  assert.equal(isFinishedScore(3, 2, 5), true);
});

test("no nearby match policy performs no external fetch", async () => {
  let fetches = 0;
  const result = await evaluateT1MatchMonitor(match(31), state(), { now: baseNow, fetchSnapshot: async () => { fetches++; return null; }, notify: async () => true });
  assert.equal(result.phase, "UPCOMING");
  assert.equal(result.externalFetchExecuted, false);
  assert.equal(fetches, 0);
});

test("11 minutes before fetches on the five-minute cadence without notifying", async () => {
  const events: T1MonitorEvent[] = [];
  const result = await evaluateT1MatchMonitor(match(11), state(), { now: baseNow, fetchSnapshot: async () => ({ t1Score: 0, opponentScore: 0, status: "UPCOMING" }), notify: async event => { events.push(event); return true; } });
  assert.equal(result.externalFetchExecuted, true);
  assert.equal(result.state.nextExternalFetchAt?.getTime(), baseNow.getTime() + 5 * 60_000);
  assert.deepEqual(events, []);
});

test("10-minute notification is sent once across repeated calls", async () => {
  const events: T1MonitorEvent[] = [];
  const first = await evaluateT1MatchMonitor(match(10), state(), { now: baseNow, fetchSnapshot: async () => ({ t1Score: 0, opponentScore: 0, status: "UPCOMING" }), notify: async event => { events.push(event); return true; } });
  const second = await evaluateT1MatchMonitor(match(10), first.state, { now: baseNow, fetchSnapshot: async () => assert.fail("fetch cadence should suppress a duplicate fetch"), notify: async event => { events.push(event); return true; } });
  assert.equal(first.notificationsCreated, 1);
  assert.equal(second.notificationsCreated, 0);
  assert.deepEqual(events.map(event => event.eventType), ["T1_MATCH_STARTING_SOON"]);
});

test("match going live starts one-minute polling without a score notification", async () => {
  const events: T1MonitorEvent[] = [];
  const result = await evaluateT1MatchMonitor(match(0, "LIVE"), state(), { now: baseNow, fetchSnapshot: async () => ({ t1Score: 0, opponentScore: 0, status: "LIVE" }), notify: async event => { events.push(event); return true; } });
  assert.equal(result.phase, "LIVE");
  assert.equal(result.externalFetchExecuted, true);
  assert.equal(result.state.nextExternalFetchAt?.getTime(), baseNow.getTime() + 60_000);
  assert.deepEqual(events, []);
});

test("live score changes notify once per changed aggregate score", async () => {
  const events: T1MonitorEvent[] = [];
  const live = match(0, "LIVE");
  const first = await evaluateT1MatchMonitor(live, state(), { now: baseNow, fetchSnapshot: async () => ({ t1Score: 1, opponentScore: 0, status: "LIVE" }), notify: async event => { events.push(event); return true; } });
  const sameScoreState = { ...first.state, nextExternalFetchAt: null };
  const same = await evaluateT1MatchMonitor(live, sameScoreState, { now: new Date(baseNow.getTime() + 60_000), fetchSnapshot: async () => ({ t1Score: 1, opponentScore: 0, status: "LIVE" }), notify: async event => { events.push(event); return true; } });
  const nextSetState = { ...same.state, nextExternalFetchAt: null };
  const next = await evaluateT1MatchMonitor(live, nextSetState, { now: new Date(baseNow.getTime() + 120_000), fetchSnapshot: async () => ({ t1Score: 1, opponentScore: 1, status: "LIVE" }), notify: async event => { events.push(event); return true; } });
  assert.equal(first.notificationsCreated, 1);
  assert.equal(same.notificationsCreated, 0);
  assert.equal(next.notificationsCreated, 1);
  assert.deepEqual(events.map(event => [event.eventType, event.score1, event.score2]), [["T1_SET_RESULT_CHANGED", 1, 0], ["T1_SET_RESULT_CHANGED", 1, 1]]);
  assert.deepEqual(events.map(event => [event.setNumber, event.setWinner]), [[1, "T1"], [2, "OPPONENT"]]);
});

test("live score notification uses the provider watch URL", async () => {
  let notificationUrl = "";
  await evaluateT1MatchMonitor(match(0, "LIVE"), state(), {
    now: baseNow,
    fetchSnapshot: async () => ({
      t1Score: 1,
      opponentScore: 0,
      status: "LIVE",
      watchUrl: "https://chzzk.naver.com/live/channel-id",
    }),
    notify: async (_event, notifiedMatch) => {
      notificationUrl = notifiedMatch.sourceUrl;
      return true;
    },
  });
  assert.equal(notificationUrl, "https://chzzk.naver.com/live/channel-id");
});

test("finish sends final score and completed monitor never fetches again", async () => {
  const events: T1MonitorEvent[] = [];
  const live = match(0, "LIVE");
  const finished = await evaluateT1MatchMonitor(live, state(), { now: baseNow, fetchSnapshot: async () => ({ t1Score: 2, opponentScore: 1, status: "FINISHED" }), notify: async event => { events.push(event); return true; } });
  assert.equal(finished.notificationsCreated, 2);
  assert.ok(finished.state.finalNotificationSentAt);
  assert.ok(finished.state.monitoringCompletedAt);
  const after = await evaluateT1MatchMonitor({ ...live, status: "FINISHED", t1Score: 2, opponentScore: 1 }, finished.state, { now: new Date(baseNow.getTime() + 60_000), fetchSnapshot: async () => assert.fail("completed match must not fetch"), notify: async () => assert.fail("completed match must not notify") });
  assert.equal(after.externalFetchExecuted, false);
  assert.equal(after.notificationsCreated, 0);
  assert.deepEqual(events.map(event => event.eventType), ["T1_SET_RESULT_CHANGED", "T1_MATCH_FINISHED"]);
});

test("live claim starts at 20 minutes, rejects duplicates, and recovers stale workflows", () => {
  const common = { now: baseNow, status: "UPCOMING" as const, monitoringCompletedAt: null };
  assert.equal(t1LiveClaimPolicy({ ...common, scheduledAt: new Date(baseNow.getTime() + 21 * 60_000), monitoringStartedAt: null, lastHeartbeatAt: null }).startLiveMonitoring, false);
  assert.equal(t1LiveClaimPolicy({ ...common, scheduledAt: new Date(baseNow.getTime() + 20 * 60_000), monitoringStartedAt: null, lastHeartbeatAt: null }).startLiveMonitoring, true);
  const active = t1LiveClaimPolicy({ ...common, scheduledAt: new Date(baseNow.getTime() + 10 * 60_000), monitoringStartedAt: new Date(baseNow.getTime() - 60_000), lastHeartbeatAt: new Date(baseNow.getTime() - 60_000) });
  assert.equal(active.alreadyMonitoring, true);
  assert.equal(active.startLiveMonitoring, false);
  const stale = t1LiveClaimPolicy({ ...common, scheduledAt: new Date(baseNow.getTime() + 10 * 60_000), monitoringStartedAt: new Date(baseNow.getTime() - 10 * 60_000), lastHeartbeatAt: new Date(baseNow.getTime() - 6 * 60_000) });
  assert.equal(stale.stale, true);
  assert.equal(stale.startLiveMonitoring, true);
  const unexpectedlyEarlyLive = t1LiveClaimPolicy({ ...common, scheduledAt: new Date(baseNow.getTime() + 120 * 60_000), status: "LIVE", monitoringStartedAt: null, lastHeartbeatAt: null });
  assert.equal(unexpectedlyEarlyLive.state, "LIVE");
  assert.equal(unexpectedlyEarlyLive.startLiveMonitoring, true);
});

test("a delayed match stays pre-match until an actual live signal is detected", () => {
  const delayed = t1LiveClaimPolicy({
    now: baseNow,
    scheduledAt: new Date(baseNow.getTime() - 30 * 60_000),
    status: "UPCOMING",
    monitoringStartedAt: new Date(baseNow.getTime() - 40 * 60_000),
    lastHeartbeatAt: new Date(baseNow.getTime() - 60_000),
    monitoringCompletedAt: null,
  });
  assert.equal(delayed.state, "PRE_MATCH");
  assert.equal(delayed.alreadyMonitoring, true);
});

test("provider 429 escapes one monitor evaluation for persisted cooldown handling", async () => {
  let fetches = 0;
  await assert.rejects(() => evaluateT1MatchMonitor(match(0, "LIVE"), state(), { now: baseNow, fetchSnapshot: async () => { fetches++; throw new ExternalProviderError("limited", "leaguepedia", "monitor-result", 429, false, 1, 120_000); }, notify: async () => true }), (error: unknown) => error instanceof ExternalProviderError && error.status === 429 && error.retryAfterMs === 120_000);
  assert.equal(fetches, 1);
});
