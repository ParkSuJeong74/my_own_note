const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60_000;
const REQUEST_TIMEOUT_MS = 20_000;
const HEARTBEAT_PATH = "/tmp/mano-scheduler-heartbeat";

export function jobsDue(state, now = Date.now()) {
  return {
    sync: state.lastSyncAt === null || now - state.lastSyncAt >= DAY_MS,
    reminder: state.lastReminderAt === null || now - state.lastReminderAt >= DAY_MS,
  };
}

export function createScheduler({ baseUrl, token, fetchImpl = fetch, log = console }) {
  if (!baseUrl || !token) throw new Error("MANO_ADMIN_INTERNAL_URL and MANO_N8N_TOKEN are required");
  const state = { lastSyncAt: null, lastReminderAt: null };
  const request = async (path, body) => {
    const response = await fetchImpl(`${baseUrl.replace(/\/$/, "")}${path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`${path} HTTP ${response.status}`);
    return response.json();
  };
  const safely = async (name, job) => {
    try { return await job(); }
    catch (error) { log.error(`[mano-scheduler] ${name} failed`, error); return null; }
  };
  return async function tick(now = Date.now()) {
    const due = jobsDue(state, now);
    if (due.sync) {
      const result = await safely("t1-sync", () => request("/api/t1/sync"));
      if (result) state.lastSyncAt = now;
    }
    if (due.reminder) {
      const result = await safely("blog-reply-reminder", () => request("/api/integrations/n8n/blog/replies/remind"));
      if (result) state.lastReminderAt = now;
    }
    const monitor = await safely("t1-monitor", () => request("/api/t1/monitor"));
    if (monitor?.monitoringToken && monitor?.matchId && (monitor.startLiveMonitoring || monitor.alreadyMonitoring)) {
      const live = await safely("t1-live-monitor", () => request("/api/t1/live-monitor", { matchId: monitor.matchId, monitoringToken: monitor.monitoringToken }));
      if (live) log.info?.(`[mano-scheduler] t1-live-monitor state=${live.state} finished=${Boolean(live.finished)} notifications=${live.notificationsCreated ?? 0}`);
    }
  };
}

async function main() {
  const { writeFile } = await import("node:fs/promises");
  const tick = createScheduler({
    baseUrl: process.env.MANO_ADMIN_INTERNAL_URL,
    token: process.env.MANO_N8N_TOKEN,
  });
  const run = async () => {
    await tick();
    await writeFile(HEARTBEAT_PATH, new Date().toISOString());
  };
  await run();
  setInterval(() => void run().catch(error => console.error("[mano-scheduler] tick failed", error)), MINUTE_MS);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch(error => { console.error("[mano-scheduler] startup failed", error); process.exitCode = 1; });
}
