import { t1MonitorPolicy } from "./t1-monitor-policy.ts";

export type T1ProviderMatchSnapshot = { t1Score: number; opponentScore: number; status: "UPCOMING" | "LIVE" | "FINISHED"; watchUrl?: string | null };
export type T1MonitorEventType = "T1_MATCH_STARTING_SOON" | "T1_SET_RESULT_CHANGED" | "T1_MATCH_FINISHED";
export type T1MonitorMatch = { id: string; externalId: string; tournament: string; opponent: string; scheduledAt: Date; bestOf: number; status: "UPCOMING" | "LIVE" | "FINISHED"; t1Score: number; opponentScore: number; sourceUrl: string };
export type T1MonitorState = { lastCheckedAt: Date | null; lastExternalFetchAt: Date | null; nextExternalFetchAt: Date | null; preMatchNotificationSentAt: Date | null; lastKnownT1Score: number; lastKnownOpponentScore: number; lastKnownSetNumber: number; finalDetectedAt: Date | null; finalNotificationSentAt: Date | null; monitoringCompletedAt: Date | null; lastProviderStatus: number | null; externalRequestCount: number };
export type T1MonitorEvent = { matchId: string; eventType: T1MonitorEventType; team1: "T1"; team2: string; score1: number; score2: number; scheduledAt: string; updatedAt: string; setNumber?: number; setWinner?: "T1" | "OPPONENT" };
type MonitorDependencies = { now: Date; fetchSnapshot: (match: T1MonitorMatch) => Promise<T1ProviderMatchSnapshot | null>; notify: (event: T1MonitorEvent, match: T1MonitorMatch) => Promise<boolean> };

export async function evaluateT1MatchMonitor(match: T1MonitorMatch, current: T1MonitorState, dependencies: MonitorDependencies) {
  const state = { ...current, lastCheckedAt: dependencies.now };
  let notificationsCreated = 0, externalFetchExecuted = false, snapshot: T1ProviderMatchSnapshot | null = null;
  const policy = t1MonitorPolicy({ now: dependencies.now, scheduledAt: match.scheduledAt, status: match.status, nextExternalFetchAt: state.nextExternalFetchAt, monitoringCompletedAt: state.monitoringCompletedAt });
  const event = (eventType: T1MonitorEventType, t1Score: number, opponentScore: number): T1MonitorEvent => ({ matchId: match.id, eventType, team1: "T1", team2: match.opponent, score1: t1Score, score2: opponentScore, scheduledAt: match.scheduledAt.toISOString(), updatedAt: dependencies.now.toISOString() });
  if (policy.shouldSendPreMatch && !state.preMatchNotificationSentAt && await dependencies.notify(event("T1_MATCH_STARTING_SOON", match.t1Score, match.opponentScore), match)) { state.preMatchNotificationSentAt = dependencies.now; notificationsCreated++; }
  if (match.status === "FINISHED" && !state.monitoringCompletedAt && !state.finalDetectedAt) {
    if (!state.finalNotificationSentAt && await dependencies.notify(event("T1_MATCH_FINISHED", match.t1Score, match.opponentScore), match)) { state.finalNotificationSentAt = dependencies.now; notificationsCreated++; }
    state.finalDetectedAt = dependencies.now;
    if (state.finalNotificationSentAt) state.monitoringCompletedAt = dependencies.now;
    state.nextExternalFetchAt = null;
    return { state, snapshot, notificationsCreated, externalFetchExecuted, phase: "FINISHED" as const };
  }
  const finalConfirmationDue = match.status === "FINISHED" && Boolean(state.finalDetectedAt) && !state.monitoringCompletedAt && (!state.nextExternalFetchAt || state.nextExternalFetchAt <= dependencies.now);
  if (policy.shouldFetch || finalConfirmationDue) {
    externalFetchExecuted = true; state.externalRequestCount++; state.lastExternalFetchAt = dependencies.now;
    snapshot = await dependencies.fetchSnapshot(match);
    state.lastProviderStatus = null;
    state.nextExternalFetchAt = new Date(dependencies.now.getTime() + (policy.nextIntervalMs ?? 60_000));
    if (snapshot) {
      const notificationMatch = snapshot.watchUrl ? { ...match, sourceUrl: snapshot.watchUrl } : match;
      const scoreChanged = snapshot.t1Score !== state.lastKnownT1Score || snapshot.opponentScore !== state.lastKnownOpponentScore;
      const setEvent = event("T1_SET_RESULT_CHANGED", snapshot.t1Score, snapshot.opponentScore);
      if (scoreChanged) {
        setEvent.setNumber = snapshot.t1Score + snapshot.opponentScore;
        setEvent.setWinner = snapshot.t1Score > state.lastKnownT1Score ? "T1" : "OPPONENT";
      }
      if (scoreChanged && await dependencies.notify(setEvent, notificationMatch)) { state.lastKnownT1Score = snapshot.t1Score; state.lastKnownOpponentScore = snapshot.opponentScore; state.lastKnownSetNumber = snapshot.t1Score + snapshot.opponentScore; notificationsCreated++; }
      if (snapshot.status === "FINISHED" && !state.finalNotificationSentAt && await dependencies.notify(event("T1_MATCH_FINISHED", snapshot.t1Score, snapshot.opponentScore), notificationMatch)) { state.finalNotificationSentAt = dependencies.now; notificationsCreated++; }
      if (snapshot.status === "FINISHED" && !state.finalDetectedAt) state.finalDetectedAt = dependencies.now;
      if (snapshot.status === "FINISHED" && state.finalNotificationSentAt && state.lastKnownT1Score === snapshot.t1Score && state.lastKnownOpponentScore === snapshot.opponentScore) { state.monitoringCompletedAt = dependencies.now; state.nextExternalFetchAt = null; }
    }
  }
  return { state, snapshot, notificationsCreated, externalFetchExecuted, phase: snapshot?.status ?? policy.phase };
}
