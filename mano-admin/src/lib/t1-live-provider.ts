import { ExternalProviderError, parseRetryAfter, retryExternal } from "./external-http.ts";

export type NaverT1LiveSnapshot = {
  t1Score: number;
  opponentScore: number;
  opponent: string;
  gameId: string;
  watchUrl: string | null;
  status: "LIVE" | "FINISHED";
  bestOf: number | null;
};

type NaverTeam = { name?: string; nameAcronym?: string; nameEng?: string; nameEngAcronym?: string };
type NaverLiveMatch = { gameId?: string; gameCode?: string; matchStatus?: string; maxMatchCount?: number; chzzkChannelId?: string; homeScore?: number; awayScore?: number; homeTeam?: NaverTeam; awayTeam?: NaverTeam };

const teamNames = (team: NaverTeam | undefined) => [team?.name, team?.nameAcronym, team?.nameEng, team?.nameEngAcronym].filter(Boolean).map(value => String(value).trim());
const isT1 = (team: NaverTeam | undefined) => teamNames(team).some(value => value.toUpperCase() === "T1");
const normalized = (value: string) => value.replace(/[^a-z0-9가-힣]/gi, "").toLowerCase();

export function parseNaverT1Live(content: unknown, expectedOpponent = ""): NaverT1LiveSnapshot | null {
  if (!Array.isArray(content)) return null;
  const candidates = (content as NaverLiveMatch[]).filter(match => (!match.gameCode || match.gameCode === "lol") && (isT1(match.homeTeam) || isT1(match.awayTeam)));
  const expected = normalized(expectedOpponent);
  const match = candidates.find(item => {
    if (!expected) return true;
    const opponent = isT1(item.homeTeam) ? item.awayTeam : item.homeTeam;
    return teamNames(opponent).some(value => {
      const name = normalized(value);
      return name === expected || name.includes(expected) || expected.includes(name);
    });
  }) ?? (expected ? undefined : candidates[0]);
  if (!match) return null;
  const t1Home = isT1(match.homeTeam);
  const opponentTeam = t1Home ? match.awayTeam : match.homeTeam;
  const channelId = String(match.chzzkChannelId ?? "").trim();
  return {
    t1Score: Number(t1Home ? match.homeScore : match.awayScore) || 0,
    opponentScore: Number(t1Home ? match.awayScore : match.homeScore) || 0,
    opponent: teamNames(opponentTeam).at(-1) ?? teamNames(opponentTeam)[0] ?? expectedOpponent,
    gameId: String(match.gameId ?? ""),
    watchUrl: /^[a-z0-9]+$/i.test(channelId)
      ? `https://chzzk.naver.com/live/${channelId}`
      : null,
    status: match.matchStatus === "RESULT" ? "FINISHED" : "LIVE",
    bestOf: Number(match.maxMatchCount) > 0 ? Number(match.maxMatchCount) : null,
  };
}

export async function fetchNaverT1Live(
  expectedOpponent: string,
  options: {
    fetchImpl?: typeof fetch;
    sleep?: (ms: number) => Promise<unknown>;
  } = {},
) {
  const fetchImpl = options.fetchImpl ?? fetch;
  return retryExternal(async () => {
    const response = await fetchImpl("https://esports-api.game.naver.com/service/v1/match/live", { headers: { "User-Agent": "ManoAdmin/1.0 T1 live monitor" }, cache: "no-store", signal: AbortSignal.timeout(10000) });
    const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
    if (!response.ok) throw new ExternalProviderError(`Naver esports live HTTP ${response.status}`, "naver-esports", "live", response.status, response.status === 429 || response.status >= 500, 1, retryAfter);
    const data = await response.json() as { code?: number; content?: unknown; message?: string | null };
    if (data.code && data.code !== 200) throw new ExternalProviderError(data.message || `Naver esports live API ${data.code}`, "naver-esports", "live", 502, true);
    return parseNaverT1Live(data.content, expectedOpponent);
  }, { maxAttempts: 2, baseDelayMs: 3000, maxDelayMs: 30000, sleep: options.sleep });
}
