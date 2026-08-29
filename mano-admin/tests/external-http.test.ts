import assert from "node:assert/strict";
import test from "node:test";
import { ExternalProviderError, parseRetryAfter, retryExternal } from "../src/lib/external-http.ts";

test("Retry-After supports seconds and HTTP dates", () => {
  assert.equal(parseRetryAfter("3", 0), 3000);
  assert.equal(parseRetryAfter("Thu, 01 Jan 1970 00:00:05 GMT", 1000), 4000);
  assert.equal(parseRetryAfter(null), null);
});

test("provider retries are bounded and use exponential backoff", async () => {
  const delays: number[] = [];
  let calls = 0;
  await assert.rejects(() => retryExternal(async () => {
    calls++;
    throw new ExternalProviderError("limited", "leaguepedia", "drafts", 429, true);
  }, { maxAttempts: 3, baseDelayMs: 100, sleep: async ms => { delays.push(ms); } }), (error: unknown) => error instanceof ExternalProviderError && error.attempts === 3);
  assert.equal(calls, 3);
  assert.deepEqual(delays, [100, 200]);
});

test("Retry-After takes precedence over exponential delay", async () => {
  const delays: number[] = [];
  let calls = 0;
  const result = await retryExternal(async () => {
    calls++;
    if (calls === 1) throw new ExternalProviderError("limited", "leaguepedia", "schedule", 429, true, 1, 750);
    return "ok";
  }, { sleep: async ms => { delays.push(ms); } });
  assert.equal(result, "ok");
  assert.deepEqual(delays, [750]);
});
