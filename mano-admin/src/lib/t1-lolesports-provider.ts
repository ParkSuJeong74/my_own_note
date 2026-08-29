import { ExternalProviderError } from "@/lib/external-http";
import type { T1PlayerGameStats, T1TeamGameStats } from "@/lib/t1-repository";

const SCHEDULE_URL = "https://lolesports.com/ko-KR/leagues/lck";
const FEED_URL = "https://feed.lolesports.com/livestats/v1";

type EventMatch = {
  __typename?: string;
  id?: string;
  startTime?: string;
  matchTeams?: { name?: string; code?: string }[];
  match?: { games?: { id?: string; number?: number; state?: string }[] };
};

type ParticipantMetadata = {
  participantId: number;
  summonerName?: string;
  championId?: string;
};
type TeamMetadata = {
  esportsTeamId?: string;
  participantMetadata?: ParticipantMetadata[];
};
type FeedParticipant = {
  participantId: number;
  kills?: number;
  deaths?: number;
  assists?: number;
  totalGold?: number;
  totalGoldEarned?: number;
  creepScore?: number;
};
type FeedTeam = {
  totalGold?: number;
  inhibitors?: number;
  towers?: number;
  barons?: number;
  totalKills?: number;
  dragons?: unknown[];
  participants?: FeedParticipant[];
};
type WindowResponse = {
  gameMetadata?: { blueTeamMetadata?: TeamMetadata; redTeamMetadata?: TeamMetadata };
  frames?: { rfc460Timestamp?: string; blueTeam?: FeedTeam; redTeam?: FeedTeam }[];
};
type DetailsResponse = { frames?: { rfc460Timestamp?: string; participants?: FeedParticipant[] }[] };

function eventObjects(document: string): EventMatch[] {
  const marker = '{"__typename":"EventMatch"';
  const events: EventMatch[] = [];
  let start = 0;
  while ((start = document.indexOf(marker, start)) >= 0) {
    let depth = 0, inString = false, escaped = false;
    for (let index = start; index < document.length; index++) {
      const char = document[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
      } else if (char === '"') inString = true;
      else if (char === "{") depth++;
      else if (char === "}" && --depth === 0) {
        try { events.push(JSON.parse(document.slice(start, index + 1)) as EventMatch); } catch { /* ignore malformed embedded data */ }
        start = index + 1;
        break;
      }
    }
  }
  return events;
}

const normalizedTeam = (value: string) => value.toLowerCase().replace(/[^a-z0-9가-힣]/g, "");

export function findLoLEsportsGameId(document: string, scheduledAt: string, opponent: string, gameNumber: number) {
  const scheduled = Date.parse(scheduledAt), wantedOpponent = normalizedTeam(opponent);
  const candidates = eventObjects(document).filter(event => {
    const eventTime = Date.parse(event.startTime ?? "");
    const teams = event.matchTeams ?? [];
    return Number.isFinite(eventTime) && Math.abs(eventTime - scheduled) <= 12 * 60 * 60_000 &&
      teams.some(team => team.code === "T1" || team.name === "T1") &&
      teams.some(team => {
        const name = normalizedTeam(`${team.name ?? ""}${team.code ?? ""}`);
        return name.includes(wantedOpponent) || wantedOpponent.includes(normalizedTeam(team.name ?? ""));
      });
  });
  return candidates.flatMap(event => event.match?.games ?? []).find(game => Number(game.number) === gameNumber)?.id ?? null;
}

async function providerJson<T>(url: string, operation: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new ExternalProviderError(`LoL Esports ${operation} HTTP ${response.status}`, "lolesports", operation, response.status, response.status >= 500, 1, null);
  return response.json() as Promise<T>;
}

const teamStats = (team: FeedTeam | undefined): T1TeamGameStats => ({
  kills: Number(team?.totalKills) || 0,
  gold: Number(team?.totalGold) || 0,
  towers: Number(team?.towers) || 0,
  dragons: team?.dragons?.length ?? 0,
  barons: Number(team?.barons) || 0,
  heralds: 0,
  voidGrubs: 0,
  inhibitors: Number(team?.inhibitors) || 0,
});

export async function fetchLoLEsportsGameDetails(input: { scheduledAt: string; opponent: string; gameNumber: number }) {
  const schedule = await fetch(SCHEDULE_URL, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!schedule.ok) throw new ExternalProviderError(`LoL Esports schedule HTTP ${schedule.status}`, "lolesports", "schedule-page", schedule.status, schedule.status >= 500, 1, null);
  const gameId = findLoLEsportsGameId(await schedule.text(), input.scheduledAt, input.opponent, input.gameNumber);
  if (!gameId) return null;

  const openingWindow = await providerJson<WindowResponse>(`${FEED_URL}/window/${gameId}`, "game-opening-window");
  const window = await providerJson<WindowResponse>(`${FEED_URL}/window/${gameId}?startingTime=2999-01-01T00:00:00.000Z`, "game-window");
  const frame = window.frames?.at(-1);
  const frameTime = frame?.rfc460Timestamp;
  if (!frame || !frameTime) return null;
  const detailsStart = new Date(Math.floor((Date.parse(frameTime) - 10_000) / 10_000) * 10_000).toISOString();
  const details = await providerJson<DetailsResponse>(`${FEED_URL}/details/${gameId}?startingTime=${encodeURIComponent(detailsStart)}`, "game-details");
  const detailed = details.frames?.at(-1);
  const participants = detailed?.participants?.length ? detailed.participants : [...(frame.blueTeam?.participants ?? []), ...(frame.redTeam?.participants ?? [])];
  const blueMetadata = window.gameMetadata?.blueTeamMetadata, redMetadata = window.gameMetadata?.redTeamMetadata;
  const t1Blue = blueMetadata?.participantMetadata?.some(player => player.summonerName?.startsWith("T1 ")) ?? false;
  const players = (metadata: TeamMetadata | undefined): T1PlayerGameStats[] => (metadata?.participantMetadata ?? []).map(meta => {
    const stats = participants.find(player => player.participantId === meta.participantId);
    return { name: meta.summonerName?.replace(/^[^ ]+ /, "") ?? "", champion: meta.championId ?? "", kills: Number(stats?.kills) || 0, deaths: Number(stats?.deaths) || 0, assists: Number(stats?.assists) || 0, gold: Number(stats?.totalGoldEarned ?? stats?.totalGold) || 0, cs: Number(stats?.creepScore) || 0, damage: 0 };
  });
  const firstTimestamp = openingWindow.frames?.[0]?.rfc460Timestamp;
  const seconds = firstTimestamp ? Math.max(0, Math.round((Date.parse(frameTime) - Date.parse(firstTimestamp)) / 1000)) : 0;
  return {
    gameId,
    side: t1Blue ? "BLUE" as const : "RED" as const,
    duration: seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "",
    t1Picks: players(t1Blue ? blueMetadata : redMetadata).map(player => player.champion).filter(Boolean),
    opponentPicks: players(t1Blue ? redMetadata : blueMetadata).map(player => player.champion).filter(Boolean),
    t1Stats: teamStats(t1Blue ? frame.blueTeam : frame.redTeam),
    opponentStats: teamStats(t1Blue ? frame.redTeam : frame.blueTeam),
    playerStats: { t1: players(t1Blue ? blueMetadata : redMetadata), opponent: players(t1Blue ? redMetadata : blueMetadata) },
  };
}
