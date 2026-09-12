import assert from "node:assert/strict";
import test from "node:test";
import { createScheduler, jobsDue } from "../../automation/scheduler/mano-scheduler.mjs";

test("daily jobs are due on startup and after 24 hours", () => {
  assert.deepEqual(jobsDue({ lastSyncAt: null, lastReminderAt: null }, 1), { sync: true, reminder: true });
  assert.deepEqual(jobsDue({ lastSyncAt: 1, lastReminderAt: 1 }, 86_400_000), { sync: false, reminder: false });
  assert.deepEqual(jobsDue({ lastSyncAt: 1, lastReminderAt: 1 }, 86_400_001), { sync: true, reminder: true });
});

test("startup runs daily jobs and chains an acquired T1 monitor", async () => {
  const calls = [];
  const messages = [];
  const responses = [
    { ok: true },
    { sent: true },
    { matchId: "match-1", monitoringToken: "token-1", startLiveMonitoring: true },
    { state: "PRE_MATCH", finished: false, notificationsCreated: 0 },
  ];
  const tick = createScheduler({
    baseUrl: "http://mano-admin:3000/",
    token: "secret",
    log: { error: () => {}, info: message => messages.push(message) },
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
      return { ok: true, status: 200, json: async () => responses.shift() };
    },
  });
  await tick(1000);
  assert.deepEqual(calls.map(call => call.url), [
    "http://mano-admin:3000/api/t1/sync",
    "http://mano-admin:3000/api/integrations/n8n/blog/replies/remind",
    "http://mano-admin:3000/api/t1/monitor",
    "http://mano-admin:3000/api/t1/live-monitor",
  ]);
  assert.equal(calls[0].init.headers.authorization, "Bearer secret");
  assert.ok(calls.every(call => call.init.signal instanceof AbortSignal));
  assert.deepEqual(JSON.parse(calls[3].init.body), { matchId: "match-1", monitoringToken: "token-1" });
  assert.deepEqual(messages, ["[mano-scheduler] t1-live-monitor state=PRE_MATCH finished=false notifications=0"]);
});

test("a failed daily job is retried while monitor failures do not stop later ticks", async () => {
  let syncAttempts = 0, monitorAttempts = 0;
  const errors = [];
  const tick = createScheduler({
    baseUrl: "http://mano-admin:3000",
    token: "secret",
    log: { error: (...values) => errors.push(values) },
    fetchImpl: async url => {
      if (url.endsWith("/api/t1/sync") && ++syncAttempts === 1) return { ok: false, status: 502 };
      if (url.endsWith("/api/t1/monitor")) monitorAttempts++;
      return { ok: true, status: 200, json: async () => ({}) };
    },
  });
  await tick(1000);
  await tick(61_000);
  assert.equal(syncAttempts, 2);
  assert.equal(monitorAttempts, 2);
  assert.equal(errors.length, 1);
});
