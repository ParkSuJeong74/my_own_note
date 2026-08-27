import assert from "node:assert/strict";
import test from "node:test";
import { isAllowedIdentity } from "../src/lib/cloudflare-access.ts";

test("allows only the configured identity email", () => {
  assert.equal(isAllowedIdentity({ type: "app", email: "Me@Example.com" }, "me@example.com"), true);
  assert.equal(isAllowedIdentity({ type: "app", email: "other@example.com" }, "me@example.com"), false);
});

test("rejects service tokens and missing email claims", () => {
  assert.equal(isAllowedIdentity({ type: "service", email: "me@example.com" }, "me@example.com"), false);
  assert.equal(isAllowedIdentity({ type: "app" }, "me@example.com"), false);
});
