import { db } from "@/lib/db";
import {
  ExternalProviderError,
  parseRetryAfter,
  retryExternal,
} from "@/lib/external-http";
import { isFinishedScore } from "@/lib/t1-monitor-policy";

export type T1Game = {
  id: string;
  gameNumber: number;
  winner: "T1" | "OPPONENT" | null;
  side: "BLUE" | "RED" | null;
  t1Picks: string[];
  opponentPicks: string[];
  t1Bans: string[];
  opponentBans: string[];
};
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
  note: string;
  games: T1Game[];
};
const list = (value: unknown) =>
  Array.isArray(value) ? value.map(String) : [];
export async function listT1Matches(): Promise<T1Match[]> {
  const { rows } = await db.query(
    `SELECT m.*,COALESCE(json_agg(json_build_object('id',g.id,'gameNumber',g.game_number,'winner',g.winner,'side',g.side,'t1Picks',g.t1_picks,'opponentPicks',g.opponent_picks,'t1Bans',g.t1_bans,'opponentBans',g.opponent_bans) ORDER BY g.game_number) FILTER (WHERE g.id IS NOT NULL),'[]') games FROM t1_matches m LEFT JOIN t1_match_games g ON g.match_id=m.id GROUP BY m.id ORDER BY m.scheduled_at DESC`,
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
    note: row.note,
    games: list(row.games).length ? row.games : [],
  }));
}
export async function createT1Match(input: Omit<T1Match, "id" | "games">) {
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
  input: Omit<T1Match, "id" | "games">,
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
            time > now - 36 * 3600000 &&
            time < now + 12 * 3600000
          );
        })
        .map((row) => normalized(row, "MatchId"))
        .filter(Boolean)
        .slice(0, 8);
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
      const gameNotifications = 0;
      await db.query(
        `INSERT INTO t1_sync_state(singleton,last_success_at,last_request_count,next_allowed_at,last_provider_status) VALUES(true,now(),$1,NULL,NULL) ON CONFLICT(singleton) DO UPDATE SET last_success_at=now(),last_request_count=$1,next_allowed_at=NULL,last_provider_status=NULL,updated_at=now()`,
        [externalRequests],
      );
      return {
        matches: schedules.length,
        games: drafts.length,
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
