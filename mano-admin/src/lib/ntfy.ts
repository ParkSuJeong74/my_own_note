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
  return sendNtfyNotification({ title: "게임 시작! T1 파이팅!", message: `${match.tournament} · T1 vs ${match.opponent} · 응원 갈 준비 완료 🔥`, tags: ["video_game", "fire"], click: match.sourceUrl });
}

export function sendT1GameResultNotification(match: MatchNotification & { gameNumber: number; won: boolean }) {
  return sendNtfyNotification({ title: `${match.gameNumber}세트 ${match.won ? "T1 승리" : "T1 패배"}`, message: `${match.tournament} · T1 vs ${match.opponent}`, tags: ["video_game", match.won ? "tada" : "pensive"], click: match.sourceUrl });
}

export function sendT1StartingSoonNotification(match: MatchNotification & { scheduledAt: string }) {
  const time = new Date(match.scheduledAt).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" });
  return sendNtfyNotification({ title: "T1 경기 10분 전! 응원 준비!", message: `${time} · ${match.tournament} · T1 vs ${match.opponent} · #T1WIN`, tags: ["alarm_clock", "video_game"], click: match.sourceUrl });
}

export function t1SetNotificationCopy(t1Score: number, opponentScore: number, won?: boolean) {
  if (t1Score === 2 && opponentScore === 2) return { title: "실버 스크랩스 틀어!!", suffix: "5세트 가자 🔥", tags: ["musical_note", "fire"] };
  if (t1Score === 2 && opponentScore < 2) return { title: "매치 포인트! 한 세트만 더!", suffix: "끝내러 가자 T1 🔥", tags: ["fire", "tada"] };
  if (opponentScore === 2 && t1Score < 2) return { title: "벼랑 끝! 역전 가자!", suffix: "아직 안 끝났다 T1 🔥", tags: ["fire", "crossed_fingers"] };
  if (t1Score === 1 && opponentScore === 1) return { title: "다시 원점! 이제부터 진짜다", suffix: "다음 세트 가져오자!", tags: ["video_game", "fire"] };
  if (t1Score === 1 && opponentScore === 0) return { title: "출발 좋다! T1 선취점!", suffix: "이 기세 그대로 가자!", tags: ["tada", "fire"] };
  if (t1Score === 0 && opponentScore === 1) return { title: "괜찮아, 다음 세트 가져오자!", suffix: "T1 반격 가자!", tags: ["video_game", "crossed_fingers"] };
  return won
    ? { title: "좋아! T1 세트 승리!", suffix: "이 기세 그대로 가자!", tags: ["tada", "fire"] }
    : { title: "아직 안 끝났다!", suffix: "다음 세트는 T1이 가져온다!", tags: ["video_game", "crossed_fingers"] };
}

export function sendT1ScoreChangedNotification(match: MatchNotification & { t1Score: number; opponentScore: number; gameNumber?: number; won?: boolean }) {
  const copy = t1SetNotificationCopy(match.t1Score, match.opponentScore, match.won);
  return sendNtfyNotification({ title: copy.title, message: `T1 ${match.t1Score}:${match.opponentScore} ${match.opponent} · ${copy.suffix}`, tags: copy.tags, click: match.sourceUrl });
}

export function sendT1FinishedNotification(match: MatchNotification & { t1Score: number; opponentScore: number }) {
  const won = match.t1Score > match.opponentScore;
  return sendNtfyNotification({ title: won ? "T1 승리! 오늘도 #T1WIN" : "경기 종료 · 다음엔 이기자ㅠㅠ", message: `${match.tournament} · T1 ${match.t1Score}:${match.opponentScore} ${match.opponent} · 눌러서 경기 결과 확인하기`, tags: ["checkered_flag", won ? "tada" : "pensive"], click: match.sourceUrl });
}
