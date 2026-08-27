import assert from "node:assert/strict";
import test from "node:test";
import { services, workspaces } from "../src/config/services.ts";

test("service identifiers are unique and links use HTTPS", () => {
  assert.equal(new Set(services.map((service) => service.id)).size, services.length);
  for (const service of services) {
    if (service.href) assert.match(service.href, /^https:\/\//);
  }
});

test("MVP workspaces are present", () => {
  assert.deepEqual(workspaces.map((workspace) => workspace.name), ["Project A/T", "Blog", "YouTube"]);
});
