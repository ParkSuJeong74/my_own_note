export type T1MonitorPhase = "IDLE" | "UPCOMING" | "PRE_MATCH" | "LIVE" | "FINISHED" | "COOLDOWN";

export type T1MonitorPolicyInput = {
  now: Date;
  scheduledAt: Date;
  status: "UPCOMING" | "LIVE" | "FINISHED";
  nextExternalFetchAt: Date | null;
  monitoringCompletedAt: Date | null;
};

export type T1MonitorPolicy = {
  phase: T1MonitorPhase;
  shouldSendPreMatch: boolean;
  shouldFetch: boolean;
  nextIntervalMs: number | null;
};

const MINUTE = 60_000;

export function t1MonitorPolicy(input: T1MonitorPolicyInput): T1MonitorPolicy {
  if (input.monitoringCompletedAt || input.status === "FINISHED") {
    return { phase: "FINISHED", shouldSendPreMatch: false, shouldFetch: false, nextIntervalMs: null };
  }
  const untilStartMs = input.scheduledAt.getTime() - input.now.getTime();
  const shouldSendPreMatch = untilStartMs <= 10 * MINUTE && untilStartMs > 0;
  let phase: T1MonitorPhase = "UPCOMING", nextIntervalMs: number | null = null;
  if (input.status === "LIVE" || untilStartMs <= 0) {
    phase = "LIVE";
    nextIntervalMs = MINUTE;
  } else if (untilStartMs <= 10 * MINUTE) {
    phase = "PRE_MATCH";
    nextIntervalMs = 2 * MINUTE;
  } else if (untilStartMs <= 30 * MINUTE) {
    phase = "PRE_MATCH";
    nextIntervalMs = 5 * MINUTE;
  }
  const due = !input.nextExternalFetchAt || input.nextExternalFetchAt.getTime() <= input.now.getTime();
  return { phase, shouldSendPreMatch, shouldFetch: nextIntervalMs !== null && due, nextIntervalMs };
}

export function isFinishedScore(t1Score: number, opponentScore: number, bestOf: number) {
  const winsNeeded = Math.floor(bestOf / 2) + 1;
  return t1Score >= winsNeeded || opponentScore >= winsNeeded;
}

export function t1LiveClaimPolicy(input: { now: Date; scheduledAt: Date; status: "UPCOMING" | "LIVE" | "FINISHED"; monitoringStartedAt: Date | null; lastHeartbeatAt: Date | null; monitoringCompletedAt: Date | null }, options: { startWindowMs?: number; staleMs?: number } = {}) {
  const startWindowMs = options.startWindowMs ?? 20 * MINUTE;
  const staleMs = options.staleMs ?? 5 * MINUTE;
  const untilStartMs = input.scheduledAt.getTime() - input.now.getTime();
  if (input.monitoringCompletedAt) return { state: "IDLE" as const, startLiveMonitoring: false, alreadyMonitoring: false, stale: false };
  if (untilStartMs > startWindowMs && input.status !== "LIVE") return { state: "IDLE" as const, startLiveMonitoring: false, alreadyMonitoring: false, stale: false };
  const heartbeat = input.lastHeartbeatAt ?? input.monitoringStartedAt;
  const active = Boolean(input.monitoringStartedAt && heartbeat && heartbeat.getTime() > input.now.getTime() - staleMs);
  const state = input.status === "LIVE" ? "LIVE" as const : "PRE_MATCH" as const;
  return { state, startLiveMonitoring: !active, alreadyMonitoring: active, stale: Boolean(input.monitoringStartedAt) && !active };
}
