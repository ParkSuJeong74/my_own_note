type MatchNotification = {
  opponent: string;
  tournament: string;
  sourceUrl: string;
};
type Notification = { title: string; message: string; tags?: string[]; click?: string };

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
  const response = await fetch(baseUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ topic, ...notification }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`ntfy publish failed (${response.status})`);
  return true;
}

export function sendT1StartNotification(match: MatchNotification) {
  return sendNtfyNotification({ title: "T1 경기 시작", message: `${match.tournament} · T1 vs ${match.opponent}`, tags: ["video_game", "tada"], click: match.sourceUrl });
}

export function sendT1GameResultNotification(match: MatchNotification & { gameNumber: number; won: boolean }) {
  return sendNtfyNotification({ title: `${match.gameNumber}세트 ${match.won ? "T1 승리" : "T1 패배"}`, message: `${match.tournament} · T1 vs ${match.opponent}`, tags: ["video_game", match.won ? "tada" : "pensive"], click: match.sourceUrl });
}
