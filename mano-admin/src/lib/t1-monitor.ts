import { db } from "@/lib/db";
import { recordAdminError } from "@/lib/admin-errors";
import { ExternalProviderError } from "@/lib/external-http";
import { sendT1FinishedNotification, sendT1ScoreChangedNotification, sendT1StartNotification, sendT1StartingSoonNotification } from "@/lib/ntfy";
import { evaluateT1MatchMonitor, type T1MonitorEvent, type T1MonitorMatch, type T1MonitorState } from "@/lib/t1-monitor-engine";
import { fetchT1MatchSnapshot } from "@/lib/t1-repository";
import { t1LiveClaimPolicy } from "@/lib/t1-monitor-policy";
import { fetchNaverT1Live } from "@/lib/t1-live-provider";

const LIVE_START_WINDOW_MS = 20 * 60_000;
const LIVE_STALE_MS = 5 * 60_000;
const EXTERNAL_START_WINDOW_MS = 2 * 60_000;

export type T1MonitorScheduleResponse = { ok: true; state: "IDLE" | "PRE_MATCH" | "LIVE"; matchFound: boolean; startLiveMonitoring: boolean; alreadyMonitoring: boolean; matchId?: string; monitoringToken?: string; scheduledAt?: string };
export type T1LiveMonitorResponse = { ok: true; state: "PRE_MATCH" | "LIVE" | "FINISHED" | "COOLDOWN"; matchId: string; monitoringToken: string; finished: boolean; score1: number; score2: number; watchUrl?: string | null; externalFetchExecuted: boolean; notificationsCreated: number; nextExternalFetchAt?: string | null; skipped?: "monitor_in_progress" | "provider_cooldown" | "provider_rate_limited" | "superseded" };

const date = (value: unknown) => value ? new Date(String(value)) : null;

export async function claimT1LiveMonitoring(): Promise<T1MonitorScheduleResponse> {
  const client = await db.connect();
  let locked = false;
  try {
    const lock = await client.query(`SELECT pg_try_advisory_lock(hashtext('t1-monitor-claim')) AS acquired`);
    locked = Boolean(lock.rows[0]?.acquired);
    if (!locked) return { ok: true, state: "IDLE", matchFound: false, startLiveMonitoring: false, alreadyMonitoring: false };
    const { rows } = await client.query(`SELECT m.id,m.scheduled_at,m.status,s.monitoring_started_at,s.monitoring_run_id,s.last_heartbeat_at,s.live_detected_at FROM t1_matches m LEFT JOIN t1_match_monitor_states s ON s.match_id=m.id WHERE m.external_id IS NOT NULL AND m.scheduled_at>now()-interval '12 hours' AND m.scheduled_at<now()+interval '48 hours' AND s.monitoring_completed_at IS NULL ORDER BY CASE WHEN s.live_detected_at IS NOT NULL THEN 0 ELSE 1 END,abs(extract(epoch FROM (m.scheduled_at-now()))) LIMIT 1`);
    const row = rows[0];
    if (!row) return { ok: true, state: "IDLE", matchFound: false, startLiveMonitoring: false, alreadyMonitoring: false };
    const now = new Date(), scheduledAt = new Date(row.scheduled_at);
    const base = { ok: true as const, matchFound: true, matchId: String(row.id), scheduledAt: scheduledAt.toISOString() };
    const decision = t1LiveClaimPolicy({ now, scheduledAt, status: row.live_detected_at ? "LIVE" : "UPCOMING", monitoringStartedAt: date(row.monitoring_started_at), lastHeartbeatAt: date(row.last_heartbeat_at), monitoringCompletedAt: null }, { startWindowMs: LIVE_START_WINDOW_MS, staleMs: LIVE_STALE_MS });
    if (!decision.startLiveMonitoring && !decision.alreadyMonitoring) return { ...base, state: decision.state, startLiveMonitoring: false, alreadyMonitoring: false };
    await client.query(`INSERT INTO t1_match_monitor_states(match_id) VALUES($1) ON CONFLICT(match_id) DO NOTHING`, [row.id]);
    if (decision.alreadyMonitoring) return { ...base, state: decision.state, startLiveMonitoring: false, alreadyMonitoring: true, monitoringToken: String(row.monitoring_run_id) };
    const claimed = await client.query(`UPDATE t1_match_monitor_states SET monitoring_started_at=$2,monitoring_run_id=gen_random_uuid(),last_heartbeat_at=$2,last_checked_at=$2,monitoring_completed_at=NULL,updated_at=now() WHERE match_id=$1 RETURNING monitoring_run_id`, [row.id, now]);
    return { ...base, state: decision.state, startLiveMonitoring: true, alreadyMonitoring: false, monitoringToken: String(claimed.rows[0].monitoring_run_id) };
  } finally {
    if (locked) await client.query(`SELECT pg_advisory_unlock(hashtext('t1-monitor-claim'))`);
    client.release();
  }
}

export async function liveMonitorT1Match(matchId: string, monitoringToken: string): Promise<T1LiveMonitorResponse | null> {
  const client = await db.connect();
  let locked = false;
  try {
    const lock = await client.query(`SELECT pg_try_advisory_lock(hashtext('t1-leaguepedia-sync')) AS acquired`);
    locked = Boolean(lock.rows[0]?.acquired);
    if (!locked) return { ok: true, state: "LIVE", matchId, monitoringToken, finished: false, score1: 0, score2: 0, externalFetchExecuted: false, notificationsCreated: 0, skipped: "monitor_in_progress" };
    const { rows } = await client.query(`SELECT m.id,m.external_id,m.tournament,m.opponent,m.scheduled_at,m.best_of,m.status,m.t1_score,m.opponent_score,m.source_url,s.* FROM t1_matches m JOIN t1_match_monitor_states s ON s.match_id=m.id WHERE m.id=$1`, [matchId]);
    const row = rows[0];
    if (!row) return null;
    if (!monitoringToken || String(row.monitoring_run_id) !== monitoringToken) return { ok: true, state: "FINISHED", matchId, monitoringToken, finished: true, score1: row.t1_score, score2: row.opponent_score, externalFetchExecuted: false, notificationsCreated: 0, skipped: "superseded" };
    if (row.monitoring_completed_at) return { ok: true, state: "FINISHED", matchId, monitoringToken, finished: true, score1: row.t1_score, score2: row.opponent_score, externalFetchExecuted: false, notificationsCreated: 0 };
    const now = new Date();
    await client.query(`UPDATE t1_match_monitor_states SET last_heartbeat_at=$2,last_checked_at=$2,updated_at=now() WHERE match_id=$1`, [matchId, now]);
    const match: T1MonitorMatch = { id: row.id, externalId: row.external_id, tournament: row.tournament, opponent: row.opponent, scheduledAt: new Date(row.scheduled_at), bestOf: row.best_of, status: row.status, t1Score: row.t1_score, opponentScore: row.opponent_score, sourceUrl: row.watch_url || row.source_url };
    const state: T1MonitorState = { lastCheckedAt: now, lastExternalFetchAt: date(row.last_external_fetch_at), nextExternalFetchAt: date(row.next_external_fetch_at), preMatchNotificationSentAt: date(row.pre_match_notification_sent_at), lastKnownT1Score: row.last_known_t1_score, lastKnownOpponentScore: row.last_known_opponent_score, lastKnownSetNumber: row.last_known_set_number, finalDetectedAt: date(row.final_detected_at), finalNotificationSentAt: date(row.final_notification_sent_at), monitoringCompletedAt: date(row.monitoring_completed_at), lastProviderStatus: row.last_provider_status, externalRequestCount: row.external_request_count };
    const externalStartsAt = new Date(match.scheduledAt.getTime() - EXTERNAL_START_WINDOW_MS);
    if (now < externalStartsAt && (!state.nextExternalFetchAt || state.nextExternalFetchAt < externalStartsAt)) state.nextExternalFetchAt = externalStartsAt;
    const cooldown = await client.query(`SELECT next_allowed_at FROM t1_sync_state WHERE singleton=true`);
    const leaguepediaCooldownUntil = date(cooldown.rows[0]?.next_allowed_at);
    let naverLiveDetected = Boolean(row.live_detected_at), watchUrl = row.watch_url ? String(row.watch_url) : null, providerRequests = 0, leaguepediaRequests = 0;
    try {
      const result = await evaluateT1MatchMonitor(match, state, { now, fetchSnapshot: async value => {
        providerRequests++;
        const naver = await fetchNaverT1Live(value.opponent);
        if (naver) { naverLiveDetected = true; watchUrl = naver.watchUrl ?? watchUrl; return { t1Score: naver.t1Score, opponentScore: naver.opponentScore, status: "LIVE" as const, watchUrl }; }
        if (!naverLiveDetected) return { t1Score: value.t1Score, opponentScore: value.opponentScore, status: "UPCOMING" as const };
        if (leaguepediaCooldownUntil && leaguepediaCooldownUntil > now) return null;
        providerRequests++; leaguepediaRequests++;
        return fetchT1MatchSnapshot(value.externalId, value.bestOf);
      }, notify: sendMonitorNotification });
      const s = result.state;
      s.externalRequestCount += Math.max(0, providerRequests - 1);
      await persistState(client, matchId, s);
      const snapshot = result.snapshot;
      if (snapshot) await client.query(`UPDATE t1_matches SET status=$2,t1_score=$3,opponent_score=$4,updated_at=now() WHERE id=$1`, [matchId, snapshot.status, snapshot.t1Score, snapshot.opponentScore]);
      if (naverLiveDetected && !row.live_detected_at) await client.query(`UPDATE t1_match_monitor_states SET live_detected_at=$2,updated_at=now() WHERE match_id=$1`, [matchId, now]);
      if (watchUrl && watchUrl !== row.watch_url) await client.query(`UPDATE t1_match_monitor_states SET watch_url=$2,updated_at=now() WHERE match_id=$1`, [matchId, watchUrl]);
      let notificationsCreated = result.notificationsCreated;
      if (naverLiveDetected && !row.live_notification_sent_at) {
        const sent = await safeMonitorNotification(
          "T1_MATCH_STARTED",
          match.id,
          () => sendT1StartNotification({ opponent: match.opponent, tournament: match.tournament, sourceUrl: watchUrl || match.sourceUrl }),
        );
        if (sent) {
          await client.query(`UPDATE t1_match_monitor_states SET live_notification_sent_at=$2,updated_at=now() WHERE match_id=$1 AND live_notification_sent_at IS NULL`, [matchId, now]);
          notificationsCreated++;
        }
      }
      if (leaguepediaRequests) await client.query(`INSERT INTO t1_sync_state(singleton,last_success_at,last_request_count,next_allowed_at,last_provider_status) VALUES(true,now(),$1,NULL,NULL) ON CONFLICT(singleton) DO UPDATE SET last_success_at=now(),last_request_count=t1_sync_state.last_request_count+$1,next_allowed_at=NULL,last_provider_status=NULL,updated_at=now()`, [leaguepediaRequests]);
      const score1 = snapshot?.t1Score ?? match.t1Score, score2 = snapshot?.opponentScore ?? match.opponentScore;
      const finished = Boolean(s.monitoringCompletedAt);
      return { ok: true, state: finished ? "FINISHED" : naverLiveDetected ? "LIVE" : "PRE_MATCH", matchId, monitoringToken, finished, score1, score2, watchUrl, externalFetchExecuted: result.externalFetchExecuted, notificationsCreated, nextExternalFetchAt: s.nextExternalFetchAt?.toISOString() ?? null };
    } catch (error) {
      if (error instanceof ExternalProviderError) {
        const cooldownMs = error.status === 429 ? error.retryAfterMs ?? 6 * 60 * 60 * 1000 : 60_000;
        const nextAllowedAt = new Date(now.getTime() + cooldownMs);
        await client.query(`UPDATE t1_match_monitor_states SET last_external_fetch_at=$2,next_external_fetch_at=$3,last_provider_status=$4,external_request_count=external_request_count+1,updated_at=now() WHERE match_id=$1`, [matchId, now, nextAllowedAt, error.status]);
        if (error.status === 429 && error.provider === "leaguepedia") await client.query(`INSERT INTO t1_sync_state(singleton,next_allowed_at,last_provider_status) VALUES(true,$1,429) ON CONFLICT(singleton) DO UPDATE SET next_allowed_at=$1,last_provider_status=429,updated_at=now()`, [nextAllowedAt]);
        await recordAdminError("t1-live-monitor-provider", error, { provider: error.provider, operation: error.operation, httpStatus: error.status, attempts: error.attempts, retryAfterMs: error.retryAfterMs, matchId });
        if (error.status === 429) return { ok: true, state: "COOLDOWN", matchId, monitoringToken, finished: false, score1: match.t1Score, score2: match.opponentScore, externalFetchExecuted: true, notificationsCreated: 0, nextExternalFetchAt: nextAllowedAt.toISOString(), skipped: "provider_rate_limited" };
      }
      throw error;
    }
  } finally {
    if (locked) await client.query(`SELECT pg_advisory_unlock(hashtext('t1-leaguepedia-sync'))`);
    client.release();
  }
}

async function persistState(client: { query: (text: string, values?: unknown[]) => Promise<unknown> }, matchId: string, state: T1MonitorState) {
  await client.query(`UPDATE t1_match_monitor_states SET last_checked_at=$2,last_external_fetch_at=$3,next_external_fetch_at=$4,pre_match_notification_sent_at=$5,last_known_t1_score=$6,last_known_opponent_score=$7,last_known_set_number=$8,final_detected_at=$9,final_notification_sent_at=$10,monitoring_completed_at=$11,last_provider_status=$12,external_request_count=$13,updated_at=now() WHERE match_id=$1`, [matchId, state.lastCheckedAt, state.lastExternalFetchAt, state.nextExternalFetchAt, state.preMatchNotificationSentAt, state.lastKnownT1Score, state.lastKnownOpponentScore, state.lastKnownSetNumber, state.finalDetectedAt, state.finalNotificationSentAt, state.monitoringCompletedAt, state.lastProviderStatus, state.externalRequestCount]);
}

async function sendMonitorNotification(event: T1MonitorEvent, match: T1MonitorMatch) {
  const common = { opponent: match.opponent, tournament: match.tournament, sourceUrl: match.sourceUrl };
  return safeMonitorNotification(event.eventType, match.id, () => {
    if (event.eventType === "T1_MATCH_STARTING_SOON") return sendT1StartingSoonNotification({ ...common, scheduledAt: event.scheduledAt });
    if (event.eventType === "T1_SET_RESULT_CHANGED") return sendT1ScoreChangedNotification({ ...common, t1Score: event.score1, opponentScore: event.score2 });
    return sendT1FinishedNotification({ ...common, t1Score: event.score1, opponentScore: event.score2 });
  });
}

async function safeMonitorNotification(eventType: string, matchId: string, send: () => Promise<boolean>) {
  try {
    return await send();
  } catch (error) {
    await recordAdminError("t1-monitor-notification", error, { eventType, matchId });
    return false;
  }
}
