import { db } from "@/lib/db";
import {
  ExternalProviderError,
  parseRetryAfter,
  retryExternal,
} from "@/lib/external-http";
import { isFinishedScore } from "@/lib/t1-monitor-policy";
import { fetchLoLEsportsGameDetails } from "@/lib/t1-lolesports-provider";

export type T1Game = {
  id: string;
  gameNumber: number;
  winner: "T1" | "OPPONENT" | null;
  side: "BLUE" | "RED" | null;
  t1Picks: string[];
  opponentPicks: string[];
  t1Bans: string[];
  opponentBans: string[];
  duration: string;
  t1Stats: T1TeamGameStats;
  opponentStats: T1TeamGameStats;
  playerStats: { t1: T1PlayerGameStats[]; opponent: T1PlayerGameStats[] };
};
export type T1TeamGameStats = { kills: number; gold: number; towers: number; dragons: number; barons: number; heralds: number; voidGrubs: number; inhibitors: number };
export type T1PlayerGameStats = { name: string; champion: string; kills: number; deaths: number; assists: number; gold: number; cs: number; damage: number };
export type T1Match = {
  id: string;
  tournament: string;
  opponent: string;
  scheduledAt: string;
  bestOf: number;
  status: "UPCOMING" | "LIVE" | "FINISHED";
  t1Score: number;
  opponentScore: number;
  sourceUrl: string;
  watchUrl?: string | null;
  note: string;
  pomPlayer: string;
  games: T1Game[];
};
const list = (value: unknown) =>
  Array.isArray(value) ? value.map(String) : [];
export async function listT1Matches(): Promise<T1Match[]> {
  const { rows } = await db.query(
    `SELECT m.*,s.watch_url,COALESCE(json_agg(json_build_object('id',g.id,'gameNumber',g.game_number,'winner',g.winner,'side',g.side,'t1Picks',g.t1_picks,'opponentPicks',g.opponent_picks,'t1Bans',g.t1_bans,'opponentBans',g.opponent_bans,'duration',g.duration,'t1Stats',g.t1_stats,'opponentStats',g.opponent_stats,'playerStats',g.player_stats) ORDER BY g.game_number) FILTER (WHERE g.id IS NOT NULL),'[]') games FROM t1_matches m LEFT JOIN t1_match_monitor_states s ON s.match_id=m.id LEFT JOIN t1_match_games g ON g.match_id=m.id GROUP BY m.id,s.watch_url ORDER BY m.scheduled_at DESC`,
  );
  return rows.map((row) => ({
    id: row.id,
    tournament: row.tournament,
    opponent: row.opponent,
    scheduledAt: new Date(row.scheduled_at).toISOString(),
    bestOf: row.best_of,
    status: row.status,
    t1Score: row.t1_score,
    opponentScore: row.opponent_score,
    sourceUrl: row.source_url,
    watchUrl: row.watch_url ? String(row.watch_url) : null,
    note: row.note,
    pomPlayer: String(row.pom_player ?? ""),
    games: list(row.games).length ? row.games : [],
  }));
}
export async function getT1SyncStatus() {
  const { rows } = await db.query(
    `SELECT last_success_at,next_allowed_at,last_provider_status FROM t1_sync_state WHERE singleton=true`,
  );
  const row = rows[0];
  return {
    lastSuccessAt: row?.last_success_at ? new Date(row.last_success_at).toISOString() : null,
    nextAllowedAt: row?.next_allowed_at ? new Date(row.next_allowed_at).toISOString() : null,
    providerRateLimited: Number(row?.last_provider_status) === 429,
  };
}
export async function createT1Match(input: Omit<T1Match, "id" | "games" | "pomPlayer">) {
  await db.query(
    `INSERT INTO t1_matches(tournament,opponent,scheduled_at,best_of,status,t1_score,opponent_score,source_url,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      input.tournament,
      input.opponent,
      input.scheduledAt,
      input.bestOf,
      input.status,
      input.t1Score,
      input.opponentScore,
      input.sourceUrl,
      input.note,
    ],
  );
}
export async function updateT1Match(
  id: string,
  input: Omit<T1Match, "id" | "games" | "pomPlayer">,
) {
  await db.query(
    `UPDATE t1_matches SET tournament=$2,opponent=$3,scheduled_at=$4,best_of=$5,status=$6,t1_score=$7,opponent_score=$8,source_url=$9,note=$10,updated_at=now() WHERE id=$1`,
    [
      id,
      input.tournament,
      input.opponent,
      input.scheduledAt,
      input.bestOf,
      input.status,
      input.t1Score,
      input.opponentScore,
      input.sourceUrl,
      input.note,
    ],
  );
}
export async function deleteT1Match(id: string) {
  await db.query(`DELETE FROM t1_matches WHERE id=$1`, [id]);
}
export async function upsertT1Game(input: {
  matchId: string;
  gameNumber: number;
  winner: string | null;
  side: string | null;
  t1Picks: string[];
  opponentPicks: string[];
  t1Bans: string[];
  opponentBans: string[];
}) {
  await db.query(
    `INSERT INTO t1_match_games(match_id,game_number,winner,side,t1_picks,opponent_picks,t1_bans,opponent_bans) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(match_id,game_number) DO UPDATE SET winner=EXCLUDED.winner,side=EXCLUDED.side,t1_picks=EXCLUDED.t1_picks,opponent_picks=EXCLUDED.opponent_picks,t1_bans=EXCLUDED.t1_bans,opponent_bans=EXCLUDED.opponent_bans,updated_at=now()`,
    [
      input.matchId,
      input.gameNumber,
      input.winner,
      input.side,
      input.t1Picks,
      input.opponentPicks,
      input.t1Bans,
      input.opponentBans,
    ],
  );
}
export async function deleteT1Game(id: string) {
  await db.query(`DELETE FROM t1_match_games WHERE id=$1`, [id]);
}

type CargoRow = Record<string, unknown>;
const normalized = (row: CargoRow, name: string) => {
  const wanted = name.replace(/[ _]/g, "").toLowerCase(),
    key = Object.keys(row).find(
      (item) => item.replace(/[ _]/g, "").toLowerCase() === wanted,
    );
  return key ? String(row[key] ?? "").trim() : "";
};
async function cargo(
  operation: string,
  tables: string,
  fields: string,
  where: string,
  limit: number,
  orderBy?: string,
) {
  const query = new URLSearchParams({
    action: "cargoquery",
    format: "json",
    tables,
    fields,
    where,
    limit: String(limit),
    origin: "*",
  });
  if (orderBy) query.set("order_by", orderBy);
  return retryExternal(
    async () => {
      const response = await fetch(`https://lol.fandom.com/api.php?${query}`, {
        headers: { "User-Agent": "ManoAdmin/1.0 T1 match sync" },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
      if (!response.ok)
        throw new ExternalProviderError(
          `Leaguepedia ${operation} HTTP ${response.status}`,
          "leaguepedia",
          operation,
          response.status,
          response.status >= 500 ||
            (response.status === 429 &&
              (retryAfter === null || retryAfter <= 30000)),
          1,
          retryAfter,
        );
      const data = (await response.json()) as {
        cargoquery?: { title: CargoRow }[];
        error?: { code?: string; info?: string };
      };
      if (data.error) {
        const limited =
          data.error.code === "ratelimited" ||
          /rate limit/i.test(data.error.info ?? "");
        throw new ExternalProviderError(
          data.error.info || "Leaguepedia API error",
          "leaguepedia",
          operation,
          limited ? 429 : 502,
          !limited || retryAfter === null || retryAfter <= 30000,
          1,
          retryAfter,
        );
      }
      return (data.cargoquery ?? []).map((item) => item.title);
    },
    { maxAttempts: 2, baseDelayMs: 5000, maxDelayMs: 30000 },
  );
}

export type T1ProviderMatchSnapshot = {
  t1Score: number;
  opponentScore: number;
  status: "UPCOMING" | "LIVE" | "FINISHED";
};

export async function fetchT1MatchSnapshot(
  externalId: string,
  bestOf: number,
): Promise<T1ProviderMatchSnapshot | null> {
  const rows = await cargo(
    "monitor-result",
    "MatchSchedule",
    "Team1,Team2,DateTime_UTC,BestOf,Team1Score,Team2Score,Winner,MatchId",
    `MatchId="${externalId.replaceAll('"', "")}"`,
    1,
  );
  const row = rows[0];
  if (!row) return null;
  const t1First = normalized(row, "Team1") === "T1";
  const score1 = Number(normalized(row, "Team1Score")) || 0;
  const score2 = Number(normalized(row, "Team2Score")) || 0;
  const t1Score = t1First ? score1 : score2;
  const opponentScore = t1First ? score2 : score1;
  const finished =
    Boolean(normalized(row, "Winner")) ||
    isFinishedScore(
      t1Score,
      opponentScore,
      Number(normalized(row, "BestOf")) || bestOf,
    );
  const scheduled = normalized(row, "DateTimeUTC");
  const scheduledAt = Date.parse(`${scheduled.replace(" ", "T")}Z`);
  return {
    t1Score,
    opponentScore,
    status: finished
      ? "FINISHED"
      : Number.isFinite(scheduledAt) && scheduledAt <= Date.now()
        ? "LIVE"
        : "UPCOMING",
  };
}
const champions = (row: CargoRow, prefix: string) =>
  Array.from({ length: 5 }, (_, index) =>
    normalized(row, `${prefix}${index + 1}`),
  ).filter(Boolean);
const integer = (row: CargoRow, field: string) => Number(normalized(row, field)) || 0;
const teamGameStats = (row: CargoRow, prefix: "Team1" | "Team2"): T1TeamGameStats => ({
  kills: integer(row, `${prefix}Kills`),
  gold: integer(row, `${prefix}Gold`),
  towers: integer(row, `${prefix}Towers`),
  dragons: integer(row, `${prefix}Dragons`),
  barons: integer(row, `${prefix}Barons`),
  heralds: integer(row, `${prefix}RiftHeralds`),
  voidGrubs: integer(row, `${prefix}VoidGrubs`),
  inhibitors: integer(row, `${prefix}Inhibitors`),
});
export async function syncT1MatchDrafts(externalId: string) {
  const safeId = externalId.replaceAll('"', "");
  const drafts = await cargo(
    "match-drafts",
    "PicksAndBansS7",
    "MatchId,N_GameInMatch,Team1,Team2,Winner,Team1Pick1,Team1Pick2,Team1Pick3,Team1Pick4,Team1Pick5,Team2Pick1,Team2Pick2,Team2Pick3,Team2Pick4,Team2Pick5,Team1Ban1,Team1Ban2,Team1Ban3,Team1Ban4,Team1Ban5,Team2Ban1,Team2Ban2,Team2Ban3,Team2Ban4,Team2Ban5",
    `MatchId="${safeId}"`,
    10,
    "N_GameInMatch",
  );
  const match = await db.query(`SELECT id FROM t1_matches WHERE external_id=$1`, [externalId]);
  if (!match.rows[0]) return 0;
  let saved = 0;
  for (const row of drafts) {
    const gameNumber = integer(row, "NGameInMatch"),
      t1First = normalized(row, "Team1") === "T1",
      winner = normalized(row, "Winner"),
      t1Picks = champions(row, t1First ? "Team1Pick" : "Team2Pick"),
      opponentPicks = champions(row, t1First ? "Team2Pick" : "Team1Pick");
    if (!gameNumber || (!t1Picks.length && !opponentPicks.length)) continue;
    await upsertT1Game({
      matchId: match.rows[0].id,
      gameNumber,
      winner: winner ? (winner === (t1First ? "1" : "2") ? "T1" : "OPPONENT") : null,
      side: t1First ? "BLUE" : "RED",
      t1Picks,
      opponentPicks,
      t1Bans: champions(row, t1First ? "Team1Ban" : "Team2Ban"),
      opponentBans: champions(row, t1First ? "Team2Ban" : "Team1Ban"),
    });
    saved++;
  }
  return saved;
}

export async function syncT1GameDetails(matchId: string, gameNumber: number) {
  const matchResult = await db.query(`SELECT external_id,scheduled_at,opponent FROM t1_matches WHERE id=$1`, [matchId]);
  const externalId = String(matchResult.rows[0]?.external_id ?? "");
  if (!matchResult.rows[0] || gameNumber < 1) return { updated: false, externalRequests: 0, skipped: "missing_match" as const };
  const liveStats = await fetchLoLEsportsGameDetails({ scheduledAt: new Date(matchResult.rows[0].scheduled_at).toISOString(), opponent: String(matchResult.rows[0].opponent), gameNumber });
  if (liveStats) {
    await db.query(
      `INSERT INTO t1_match_games(match_id,game_number,side,t1_picks,opponent_picks,duration,t1_stats,opponent_stats,player_stats) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9::jsonb) ON CONFLICT(match_id,game_number) DO UPDATE SET side=EXCLUDED.side,t1_picks=EXCLUDED.t1_picks,opponent_picks=EXCLUDED.opponent_picks,duration=EXCLUDED.duration,t1_stats=EXCLUDED.t1_stats,opponent_stats=EXCLUDED.opponent_stats,player_stats=EXCLUDED.player_stats,updated_at=now()`,
      [matchId, gameNumber, liveStats.side, liveStats.t1Picks, liveStats.opponentPicks, liveStats.duration, JSON.stringify(liveStats.t1Stats), JSON.stringify(liveStats.opponentStats), JSON.stringify(liveStats.playerStats)],
    );
    if (!externalId) return { updated: true, provider: "lolesports" as const, externalRequests: 4, draftFound: liveStats.t1Picks.length > 0, statsFound: true, playersFound: liveStats.playerStats.t1.length + liveStats.playerStats.opponent.length };
  }
  if (!externalId) return { updated: false, externalRequests: 1, skipped: "missing_external_id" as const };
  const cooldown = await db.query(`SELECT next_allowed_at FROM t1_sync_state WHERE singleton=true`);
  const nextAllowedAt = cooldown.rows[0]?.next_allowed_at ? new Date(cooldown.rows[0].next_allowed_at) : null;
  if (nextAllowedAt && nextAllowedAt > new Date()) return { updated: false, externalRequests: 0, skipped: "provider_rate_limited" as const, nextAllowedAt: nextAllowedAt.toISOString() };
  const lockClient = await db.connect();
  let locked = false, externalRequests = liveStats ? 4 : 0;
  try {
    const lock = await lockClient.query(`SELECT pg_try_advisory_lock(hashtext('t1-leaguepedia-sync')) AS acquired`);
    locked = Boolean(lock.rows[0]?.acquired);
    if (!locked) return { updated: false, externalRequests: 0, skipped: "sync_in_progress" as const };
    const safeId = externalId.replaceAll('"', ""), filter = `MatchId="${safeId}" AND N_GameInMatch=${gameNumber}`;
    externalRequests++;
    const drafts = await cargo(
      "single-game-draft",
      "PicksAndBansS7",
      "MatchId,N_GameInMatch,Team1,Team2,Winner,Team1Pick1,Team1Pick2,Team1Pick3,Team1Pick4,Team1Pick5,Team2Pick1,Team2Pick2,Team2Pick3,Team2Pick4,Team2Pick5,Team1Ban1,Team1Ban2,Team1Ban3,Team1Ban4,Team1Ban5,Team2Ban1,Team2Ban2,Team2Ban3,Team2Ban4,Team2Ban5",
      filter,
      1,
    );
    const draft = drafts[0];
    if (draft) {
      const t1First = normalized(draft, "Team1") === "T1", winner = normalized(draft, "Winner");
      await upsertT1Game({
        matchId,
        gameNumber,
        winner: winner ? winner === (t1First ? "1" : "2") ? "T1" : "OPPONENT" : null,
        side: t1First ? "BLUE" : "RED",
        t1Picks: champions(draft, t1First ? "Team1Pick" : "Team2Pick"),
        opponentPicks: champions(draft, t1First ? "Team2Pick" : "Team1Pick"),
        t1Bans: champions(draft, t1First ? "Team1Ban" : "Team2Ban"),
        opponentBans: champions(draft, t1First ? "Team2Ban" : "Team1Ban"),
      });
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
    externalRequests++;
    const gameRows = await cargo(
      "single-game-stats",
      "ScoreboardGames=SG,ScoreboardTeams=ST1,ScoreboardTeams=ST2,MatchScheduleGame=MSG",
      "SG.MatchId=MatchId,SG.GameId=GameId,SG.N_GameInMatch=N_GameInMatch,SG.Team1=Team1,SG.Team2=Team2,SG.WinTeam=WinTeam,SG.Gamelength=Gamelength,MSG.MVP=MVP,ST1.Kills=Team1Kills,ST2.Kills=Team2Kills,ST1.Gold=Team1Gold,ST2.Gold=Team2Gold,ST1.Towers=Team1Towers,ST2.Towers=Team2Towers,ST1.Dragons=Team1Dragons,ST2.Dragons=Team2Dragons,ST1.Barons=Team1Barons,ST2.Barons=Team2Barons,ST1.RiftHeralds=Team1RiftHeralds,ST2.RiftHeralds=Team2RiftHeralds,ST1.VoidGrubs=Team1VoidGrubs,ST2.VoidGrubs=Team2VoidGrubs,ST1.Inhibitors=Team1Inhibitors,ST2.Inhibitors=Team2Inhibitors",
      `SG.MatchId="${safeId}" AND SG.N_GameInMatch=${gameNumber} AND MSG.MatchId=SG.MatchId AND MSG.N_GameInMatch=SG.N_GameInMatch AND ST1.GameId=SG.GameId AND ST2.GameId=SG.GameId AND ST1.Team=SG.Team1 AND ST2.Team=SG.Team2`,
      1,
    );
    const game = gameRows[0], gameId = game ? normalized(game, "GameId") : "";
    let playerStats: { t1: T1PlayerGameStats[]; opponent: T1PlayerGameStats[] } = { t1: [], opponent: [] };
    if (gameId) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      externalRequests++;
      const players = await cargo("single-game-players", "ScoreboardPlayers", "MatchId,GameId,Team,Name,Champion,Kills,Deaths,Assists,Gold,CS,DamageToChampions,Role_Number", `MatchId="${safeId}" AND GameId="${gameId.replaceAll('"', "")}"`, 10, "Role_Number");
      for (const row of players) {
        const player = { name: normalized(row, "Name"), champion: normalized(row, "Champion"), kills: integer(row, "Kills"), deaths: integer(row, "Deaths"), assists: integer(row, "Assists"), gold: integer(row, "Gold"), cs: integer(row, "CS"), damage: integer(row, "DamageToChampions") };
        (normalized(row, "Team") === "T1" ? playerStats.t1 : playerStats.opponent).push(player);
      }
    }
    if (game) {
      const t1First = normalized(game, "Team1") === "T1", winnerTeam = normalized(game, "WinTeam");
      await db.query(
        `INSERT INTO t1_match_games(match_id,game_number,winner,side,duration,t1_stats,opponent_stats,player_stats) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb) ON CONFLICT(match_id,game_number) DO UPDATE SET winner=COALESCE(EXCLUDED.winner,t1_match_games.winner),side=COALESCE(t1_match_games.side,EXCLUDED.side),duration=EXCLUDED.duration,t1_stats=EXCLUDED.t1_stats,opponent_stats=EXCLUDED.opponent_stats,player_stats=EXCLUDED.player_stats,updated_at=now()`,
        [matchId, gameNumber, winnerTeam ? winnerTeam === "T1" ? "T1" : "OPPONENT" : null, t1First ? "BLUE" : "RED", normalized(game, "Gamelength"), JSON.stringify(teamGameStats(game, t1First ? "Team1" : "Team2")), JSON.stringify(teamGameStats(game, t1First ? "Team2" : "Team1")), JSON.stringify(playerStats)],
      );
      const officialPom = normalized(game, "MVP");
      if (officialPom) await db.query(`UPDATE t1_matches SET pom_player=$2,updated_at=now() WHERE id=$1`, [matchId, officialPom]);
    }
    await db.query(`INSERT INTO t1_sync_state(singleton,last_success_at,last_request_count,next_allowed_at,last_provider_status) VALUES(true,now(),$1,NULL,NULL) ON CONFLICT(singleton) DO UPDATE SET last_success_at=now(),last_request_count=t1_sync_state.last_request_count+$1,next_allowed_at=NULL,last_provider_status=NULL,updated_at=now()`, [externalRequests]);
    return { updated: Boolean(draft || game), externalRequests, draftFound: Boolean(draft), statsFound: Boolean(game), playersFound: playerStats.t1.length + playerStats.opponent.length };
  } catch (error) {
    if (error instanceof ExternalProviderError && error.status === 429) {
      const retryAt = new Date(Date.now() + (error.retryAfterMs ?? 6 * 60 * 60_000));
      await db.query(`INSERT INTO t1_sync_state(singleton,next_allowed_at,last_provider_status) VALUES(true,$1,429) ON CONFLICT(singleton) DO UPDATE SET next_allowed_at=$1,last_provider_status=429,updated_at=now()`, [retryAt]);
    }
    throw error;
  } finally {
    if (locked) await lockClient.query(`SELECT pg_advisory_unlock(hashtext('t1-leaguepedia-sync'))`);
    lockClient.release();
  }
}
export async function syncT1FromLeaguepedia() {
  const lockClient = await db.connect();
  const lock = await lockClient.query(
    `SELECT pg_try_advisory_lock(hashtext('t1-leaguepedia-sync')) AS acquired`,
  );
  if (!lock.rows[0]?.acquired) {
    lockClient.release();
    return {
      matches: 0,
      games: 0,
      notifications: 0,
      gameNotifications: 0,
      externalRequests: 0,
      skipped: "sync_in_progress",
    };
  }
  let externalRequests = 0;
  try {
    const state = await db.query(
      `SELECT next_allowed_at FROM t1_sync_state WHERE singleton=true`,
    );
    const nextAllowedAt = state.rows[0]?.next_allowed_at
      ? new Date(state.rows[0].next_allowed_at)
      : null;
    if (nextAllowedAt && nextAllowedAt.getTime() > Date.now()) {
      return {
        matches: 0,
        games: 0,
        notifications: 0,
        gameNotifications: 0,
        externalRequests: 0,
        skipped: "provider_cooldown",
        nextAllowedAt: nextAllowedAt.toISOString(),
      };
    }
    await db.query(
      `INSERT INTO t1_sync_state(singleton,last_attempt_at) VALUES(true,now()) ON CONFLICT(singleton) DO UPDATE SET last_attempt_at=now(),updated_at=now()`,
    );
    try {
      externalRequests++;
      const schedules = await cargo(
          "schedule",
          "MatchSchedule",
          "Team1,Team2,DateTime_UTC,BestOf,Team1Score,Team2Score,Winner,OverviewPage,MatchId",
          '(Team1="T1" OR Team2="T1")',
          60,
          "DateTime_UTC DESC",
        ),
        now = Date.now();
      for (const row of schedules) {
        const externalId = normalized(row, "MatchId"),
          team1 = normalized(row, "Team1"),
          team2 = normalized(row, "Team2"),
          scheduled = normalized(row, "DateTimeUTC");
        if (!externalId || !scheduled) continue;
        const t1First = team1 === "T1",
          rawScore1 = normalized(row, "Team1Score"),
          rawScore2 = normalized(row, "Team2Score"),
          score1 = Number(rawScore1),
          score2 = Number(rawScore2),
          hasResult =
            normalized(row, "Winner") !== "" ||
            (rawScore1 !== "" && rawScore2 !== ""),
          scheduledAt = new Date(`${scheduled.replace(" ", "T")}Z`),
          status = hasResult ? "FINISHED" : "UPCOMING",
          overview = normalized(row, "OverviewPage"),
          wikiPath = overview
            .replace(/ /g, "_")
            .split("/")
            .map(encodeURIComponent)
            .join("/");
        await db.query(
          `INSERT INTO t1_matches(external_id,tournament,opponent,scheduled_at,best_of,status,t1_score,opponent_score,source_url) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(external_id) WHERE external_id IS NOT NULL DO UPDATE SET tournament=EXCLUDED.tournament,opponent=EXCLUDED.opponent,scheduled_at=EXCLUDED.scheduled_at,best_of=EXCLUDED.best_of,status=EXCLUDED.status,t1_score=EXCLUDED.t1_score,opponent_score=EXCLUDED.opponent_score,source_url=EXCLUDED.source_url,updated_at=now()`,
          [
            externalId,
            overview.split("/")[0] || "LCK",
            t1First ? team2 : team1,
            scheduledAt.toISOString(),
            Number(normalized(row, "BestOf")) || 3,
            status,
            t1First ? score1 || 0 : score2 || 0,
            t1First ? score2 || 0 : score1 || 0,
            `https://lol.fandom.com/wiki/${wikiPath}`,
          ],
        );
      }
      const notifications = 0;
      const recentIds = schedules
        .filter((row) => {
          const raw = normalized(row, "DateTimeUTC"),
            time = Date.parse(`${raw.replace(" ", "T")}Z`);
          return (
            Number.isFinite(time) &&
            time > now - 45 * 24 * 3600000 &&
            time < now + 12 * 3600000
          );
        })
        .map((row) => normalized(row, "MatchId"))
        .filter(Boolean)
        .slice(0, 8);
      const finishedRecentIds = schedules
        .filter((row) => recentIds.includes(normalized(row, "MatchId")) && normalized(row, "Winner") !== "")
        .map((row) => normalized(row, "MatchId"))
        .filter(Boolean);
      // Keep the schedule and draft queries from being sent back-to-back.
      if (recentIds.length)
        await new Promise((resolve) => setTimeout(resolve, 5000));
      if (recentIds.length) externalRequests++;
      const drafts = recentIds.length
        ? await cargo(
            "drafts",
            "PicksAndBansS7",
            "MatchId,N_GameInMatch,Team1,Team2,Winner,Team1Pick1,Team1Pick2,Team1Pick3,Team1Pick4,Team1Pick5,Team2Pick1,Team2Pick2,Team2Pick3,Team2Pick4,Team2Pick5,Team1Ban1,Team1Ban2,Team1Ban3,Team1Ban4,Team1Ban5,Team2Ban1,Team2Ban2,Team2Ban3,Team2Ban4,Team2Ban5",
            `MatchId IN (${recentIds.map((id) => `"${id.replaceAll('"', "")}"`).join(",")})`,
            40,
            "MatchId DESC,N_GameInMatch",
          )
        : [];
      for (const row of drafts) {
        const externalId = normalized(row, "MatchId"),
          gameNumber = Number(normalized(row, "NGameInMatch")),
          team1 = normalized(row, "Team1"),
          winner = normalized(row, "Winner"),
          match = await db.query(
            `SELECT id FROM t1_matches WHERE external_id=$1`,
            [externalId],
          );
        if (!match.rows[0] || !gameNumber) continue;
        const t1First = team1 === "T1";
        await upsertT1Game({
          matchId: match.rows[0].id,
          gameNumber,
          winner: winner
            ? winner === (t1First ? "1" : "2")
              ? "T1"
              : "OPPONENT"
            : null,
          side: t1First ? "BLUE" : "RED",
          t1Picks: champions(row, t1First ? "Team1Pick" : "Team2Pick"),
          opponentPicks: champions(row, t1First ? "Team2Pick" : "Team1Pick"),
          t1Bans: champions(row, t1First ? "Team1Ban" : "Team2Ban"),
          opponentBans: champions(row, t1First ? "Team2Ban" : "Team1Ban"),
        });
      }
      if (finishedRecentIds.length)
        await new Promise((resolve) => setTimeout(resolve, 5000));
      if (finishedRecentIds.length) externalRequests++;
      const gameStats = finishedRecentIds.length
        ? await cargo(
            "game-stats",
            "ScoreboardGames=SG,ScoreboardTeams=ST1,ScoreboardTeams=ST2,MatchScheduleGame=MSG",
            "SG.MatchId=MatchId,SG.GameId=GameId,SG.N_GameInMatch=N_GameInMatch,SG.Team1=Team1,SG.Team2=Team2,SG.WinTeam=WinTeam,SG.Gamelength=Gamelength,MSG.MVP=MVP,ST1.Kills=Team1Kills,ST2.Kills=Team2Kills,ST1.Gold=Team1Gold,ST2.Gold=Team2Gold,ST1.Towers=Team1Towers,ST2.Towers=Team2Towers,ST1.Dragons=Team1Dragons,ST2.Dragons=Team2Dragons,ST1.Barons=Team1Barons,ST2.Barons=Team2Barons,ST1.RiftHeralds=Team1RiftHeralds,ST2.RiftHeralds=Team2RiftHeralds,ST1.VoidGrubs=Team1VoidGrubs,ST2.VoidGrubs=Team2VoidGrubs,ST1.Inhibitors=Team1Inhibitors,ST2.Inhibitors=Team2Inhibitors",
            `SG.MatchId IN (${finishedRecentIds.map((id) => `"${id.replaceAll('"', "")}"`).join(",")}) AND MSG.MatchId=SG.MatchId AND MSG.N_GameInMatch=SG.N_GameInMatch AND ST1.GameId=SG.GameId AND ST2.GameId=SG.GameId AND ST1.Team=SG.Team1 AND ST2.Team=SG.Team2`,
            40,
            "MatchId DESC,N_GameInMatch",
          )
        : [];
      if (finishedRecentIds.length)
        await new Promise((resolve) => setTimeout(resolve, 5000));
      if (finishedRecentIds.length) externalRequests++;
      const playerRows = finishedRecentIds.length
        ? await cargo(
            "player-stats",
            "ScoreboardPlayers",
            "MatchId,GameId,Team,Name,Champion,Kills,Deaths,Assists,Gold,CS,DamageToChampions,Role_Number",
            `MatchId IN (${finishedRecentIds.map((id) => `"${id.replaceAll('"', "")}"`).join(",")})`,
            400,
            "MatchId DESC,GameId,Role_Number",
          )
        : [];
      const playersByGame = new Map<string, { t1: T1PlayerGameStats[]; opponent: T1PlayerGameStats[] }>();
      for (const row of playerRows) {
        const gameId = normalized(row, "GameId");
        if (!gameId) continue;
        const group = playersByGame.get(gameId) ?? { t1: [], opponent: [] };
        const player: T1PlayerGameStats = {
          name: normalized(row, "Name"),
          champion: normalized(row, "Champion"),
          kills: integer(row, "Kills"),
          deaths: integer(row, "Deaths"),
          assists: integer(row, "Assists"),
          gold: integer(row, "Gold"),
          cs: integer(row, "CS"),
          damage: integer(row, "DamageToChampions"),
        };
        (normalized(row, "Team") === "T1" ? group.t1 : group.opponent).push(player);
        playersByGame.set(gameId, group);
      }
      for (const row of gameStats) {
        const externalId = normalized(row, "MatchId"),
          gameId = normalized(row, "GameId"),
          gameNumber = integer(row, "NGameInMatch"),
          t1First = normalized(row, "Team1") === "T1",
          winnerTeam = normalized(row, "WinTeam"),
          match = await db.query(`SELECT id FROM t1_matches WHERE external_id=$1`, [externalId]);
        if (!match.rows[0] || !gameNumber) continue;
        const t1Stats = teamGameStats(row, t1First ? "Team1" : "Team2"),
          opponentStats = teamGameStats(row, t1First ? "Team2" : "Team1"),
          playerStats = playersByGame.get(gameId) ?? { t1: [], opponent: [] },
          winner = winnerTeam ? (winnerTeam === "T1" ? "T1" : "OPPONENT") : null;
        await db.query(
          `INSERT INTO t1_match_games(match_id,game_number,winner,side,duration,t1_stats,opponent_stats,player_stats) VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb) ON CONFLICT(match_id,game_number) DO UPDATE SET winner=COALESCE(EXCLUDED.winner,t1_match_games.winner),duration=EXCLUDED.duration,t1_stats=EXCLUDED.t1_stats,opponent_stats=EXCLUDED.opponent_stats,player_stats=EXCLUDED.player_stats,updated_at=now()`,
          [match.rows[0].id, gameNumber, winner, t1First ? "BLUE" : "RED", normalized(row, "Gamelength"), JSON.stringify(t1Stats), JSON.stringify(opponentStats), JSON.stringify(playerStats)],
        );
        const officialPom = normalized(row, "MVP");
        if (officialPom) await db.query(`UPDATE t1_matches SET pom_player=$2,updated_at=now() WHERE id=$1`, [match.rows[0].id, officialPom]);
      }
      const gameNotifications = 0;
      await db.query(
        `INSERT INTO t1_sync_state(singleton,last_success_at,last_request_count,next_allowed_at,last_provider_status) VALUES(true,now(),$1,NULL,NULL) ON CONFLICT(singleton) DO UPDATE SET last_success_at=now(),last_request_count=$1,next_allowed_at=NULL,last_provider_status=NULL,updated_at=now()`,
        [externalRequests],
      );
      return {
        matches: schedules.length,
        games: Math.max(drafts.length, gameStats.length),
        notifications,
        gameNotifications,
        externalRequests,
      };
    } catch (error) {
      if (error instanceof ExternalProviderError && error.status === 429) {
        const cooldownMs = error.retryAfterMs ?? 6 * 60 * 60 * 1000;
        await db.query(
          `INSERT INTO t1_sync_state(singleton,next_allowed_at,last_provider_status) VALUES(true,now()+($1 * interval '1 millisecond'),429) ON CONFLICT(singleton) DO UPDATE SET next_allowed_at=EXCLUDED.next_allowed_at,last_provider_status=429,updated_at=now()`,
          [cooldownMs],
        );
        return {
          matches: 0,
          games: 0,
          notifications: 0,
          gameNotifications: 0,
          externalRequests,
          skipped: "provider_rate_limited",
          nextAllowedAt: new Date(Date.now() + cooldownMs).toISOString(),
        };
      }
      throw error;
    }
  } finally {
    await lockClient.query(
      `SELECT pg_advisory_unlock(hashtext('t1-leaguepedia-sync'))`,
    );
    lockClient.release();
  }
}
