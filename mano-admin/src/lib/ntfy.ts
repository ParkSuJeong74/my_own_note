import { setDefaultResultOrder } from "node:dns";

setDefaultResultOrder("ipv4first");

type MatchNotification = {
  opponent: string;
  tournament: string;
  sourceUrl: string;
};
type Notification = { title: string; message: string; tags?: string[]; click?: string };
export class NtfyRequestError extends Error {
  readonly host: string;
  readonly code: string | null;
  constructor(message: string, host: string, code: string | null) { super(message); this.name = "NtfyRequestError"; this.host = host; this.code = code; }
}

export function ntfyConfigured() {
  return Boolean(
    process.env.NTFY_BASE_URL?.trim() && process.env.NTFY_TOPIC?.trim(),
  );
}

export async function sendNtfyNotification(notification: Notification) {
  const baseUrl = process.env.NTFY_BASE_URL?.trim().replace(/\/+$/, "");
  const topic = process.env.NTFY_TOPIC?.trim();
  if (!baseUrl || !topic) return false;
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  const token = process.env.NTFY_TOKEN?.trim();
  if (token) headers.authorization = `Bearer ${token}`;
  let response: Response | null = null, lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      response = await fetch(baseUrl, { method: "POST", headers, body: JSON.stringify({ topic, ...notification }), cache: "no-store", signal: AbortSignal.timeout(20000) });
      break;
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  if (!response) {
    const cause = lastError instanceof Error ? lastError.cause as {code?:unknown}|undefined : undefined;
    throw new NtfyRequestError("ntfy network request failed after 2 attempts", new URL(baseUrl).host, typeof cause?.code === "string" ? cause.code : null);
  }
  if (!response.ok) throw new Error(`ntfy publish failed (${response.status})`);
  return true;
}

export function sendT1StartNotification(match: MatchNotification) {
  return sendNtfyNotification({ title: "T1 경기 시작", message: `${match.tournament} · T1 vs ${match.opponent}`, tags: ["video_game", "tada"], click: match.sourceUrl });
}

export function sendT1GameResultNotification(match: MatchNotification & { gameNumber: number; won: boolean }) {
  return sendNtfyNotification({ title: `${match.gameNumber}세트 ${match.won ? "T1 승리" : "T1 패배"}`, message: `${match.tournament} · T1 vs ${match.opponent}`, tags: ["video_game", match.won ? "tada" : "pensive"], click: match.sourceUrl });
}

export function sendT1StartingSoonNotification(match: MatchNotification & { scheduledAt: string }) {
  const time = new Date(match.scheduledAt).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" });
  return sendNtfyNotification({ title: "T1 경기 10분 전", message: `${time} · ${match.tournament} · T1 vs ${match.opponent}`, tags: ["alarm_clock", "video_game"], click: match.sourceUrl });
}

export function sendT1ScoreChangedNotification(match: MatchNotification & { t1Score: number; opponentScore: number }) {
  return sendNtfyNotification({ title: `세트 결과 · T1 ${match.t1Score}:${match.opponentScore} ${match.opponent}`, message: `${match.tournament} · T1 vs ${match.opponent}`, tags: ["video_game", match.t1Score > match.opponentScore ? "tada" : "pensive"], click: match.sourceUrl });
}

export function sendT1FinishedNotification(match: MatchNotification & { t1Score: number; opponentScore: number }) {
  return sendNtfyNotification({ title: `경기 종료 · T1 ${match.t1Score}:${match.opponentScore} ${match.opponent}`, message: match.t1Score > match.opponentScore ? `${match.tournament} · T1 승리` : `${match.tournament} · T1 패배`, tags: ["checkered_flag", match.t1Score > match.opponentScore ? "tada" : "pensive"], click: match.sourceUrl });
}
