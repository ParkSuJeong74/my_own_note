import assert from "node:assert/strict";
import test from "node:test";
import { ntfyConfigured, sendT1StartNotification } from "../src/lib/ntfy.ts";

test("ntfy remains disabled until a topic is configured", () => {
  const previousBase = process.env.NTFY_BASE_URL, previousTopic = process.env.NTFY_TOPIC;
  try {
    process.env.NTFY_BASE_URL = "https://ntfy.example";
    delete process.env.NTFY_TOPIC;
    assert.equal(ntfyConfigured(), false);
  } finally {
    if (previousBase === undefined) delete process.env.NTFY_BASE_URL; else process.env.NTFY_BASE_URL = previousBase;
    if (previousTopic === undefined) delete process.env.NTFY_TOPIC; else process.env.NTFY_TOPIC = previousTopic;
  }
});

test("T1 notification publishes without exposing the token in its body", async () => {
  const previous = { base: process.env.NTFY_BASE_URL, topic: process.env.NTFY_TOPIC, token: process.env.NTFY_TOKEN }, originalFetch = globalThis.fetch;
  let body = "", authorization = "";
  try {
    process.env.NTFY_BASE_URL = "https://ntfy.example";
    process.env.NTFY_TOPIC = "t1-topic";
    process.env.NTFY_TOKEN = "test-secret";
    globalThis.fetch = (async (_input, init) => { body = String(init?.body ?? ""); authorization = new Headers(init?.headers).get("authorization") ?? ""; return new Response("{}", { status: 200 }); }) as typeof fetch;
    assert.equal(await sendT1StartNotification({ opponent: "Gen.G", tournament: "LCK", sourceUrl: "https://example.com/match" }), true);
    assert.equal(JSON.parse(body).topic, "t1-topic");
    assert.equal(body.includes("test-secret"), false);
    assert.equal(authorization, "Bearer test-secret");
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) { const name = key === "base" ? "NTFY_BASE_URL" : key === "topic" ? "NTFY_TOPIC" : "NTFY_TOKEN"; if (value === undefined) delete process.env[name]; else process.env[name] = value; }
  }
});
