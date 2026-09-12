import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

test("scheduler deployment restarts changed code and exposes a heartbeat healthcheck", async () => {
  const [deploy, compose, scheduler] = await Promise.all([
    readFile(new URL("scripts/deploy-home-server.sh", root), "utf8"),
    readFile(new URL("docker-compose.yml", root), "utf8"),
    readFile(new URL("automation/scheduler/mano-scheduler.mjs", root), "utf8"),
  ]);

  assert.match(deploy, /changed mano-scheduler automation\/scheduler\/mano-scheduler\.mjs/);
  assert.match(deploy, /docker restart mano-scheduler/);
  assert.match(compose, /\/tmp\/mano-scheduler-heartbeat/);
  assert.match(scheduler, /writeFile\(HEARTBEAT_PATH/);
});
