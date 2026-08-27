import assert from "node:assert/strict";
import test from "node:test";
import { services } from "../src/config/services.ts";
import { taskStatuses } from "../src/lib/automation-types.ts";

test("service identifiers are unique and links use HTTPS", () => {
  assert.equal(new Set(services.map((service) => service.id)).size, services.length);
  for (const service of services) {
    if (service.href) assert.match(service.href, /^https:\/\//);
  }
});

test("common task lifecycle stays intentionally small", () => {
  assert.deepEqual(taskStatuses, ["DRAFT", "READY", "IN_PROGRESS", "REVIEW", "DONE"]);
});
