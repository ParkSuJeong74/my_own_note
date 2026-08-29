import { db } from "@/lib/db";
import { recordAdminError } from "@/lib/admin-errors";
import { ntfyConfigured, sendT1GameResultNotification, sendT1StartNotification } from "@/lib/ntfy";

export async function notifyStartedT1Matches() {
  if (!ntfyConfigured()) return 0;
  const client = await db.connect();
  let locked = false,
    sent = 0;
  try {
    const lock = await client.query(
      `SELECT pg_try_advisory_lock(hashtext('t1-start-notifications')) AS acquired`,
    );
    locked = Boolean(lock.rows[0]?.acquired);
    if (!locked) return 0;
    const { rows } = await client.query(
      `SELECT id,opponent,tournament,source_url FROM t1_matches WHERE external_id IS NOT NULL AND start_notified_at IS NULL AND status IN ('UPCOMING','LIVE') AND scheduled_at<=now() AND scheduled_at>now()-interval '12 hours' ORDER BY scheduled_at`,
    );
    for (const match of rows) {
      try {
        if (
          await sendT1StartNotification({
            opponent: match.opponent,
            tournament: match.tournament,
            sourceUrl: match.source_url,
          })
        ) {
          await client.query(
            `UPDATE t1_matches SET start_notified_at=now() WHERE id=$1 AND start_notified_at IS NULL`,
            [match.id],
          );
          sent++;
        }
      } catch (error) {
        await recordAdminError("t1-ntfy", error, {
          matchId: match.id,
          opponent: match.opponent,
        });
      }
    }
    return sent;
  } finally {
    if (locked)
      await client.query(
        `SELECT pg_advisory_unlock(hashtext('t1-start-notifications'))`,
      );
    client.release();
  }
}

export async function notifyT1GameResults() {
  if (!ntfyConfigured()) return 0;
  const client = await db.connect();
  let locked = false, sent = 0;
  try {
    const lock = await client.query(`SELECT pg_try_advisory_lock(hashtext('t1-game-result-notifications')) AS acquired`);
    locked = Boolean(lock.rows[0]?.acquired);
    if (!locked) return 0;
    const { rows } = await client.query(`SELECT g.id,g.game_number,g.winner,m.opponent,m.tournament,m.source_url FROM t1_match_games g JOIN t1_matches m ON m.id=g.match_id WHERE g.winner IS NOT NULL AND g.result_notified_at IS NULL AND m.external_id IS NOT NULL AND m.scheduled_at>now()-interval '12 hours' ORDER BY m.scheduled_at,g.game_number`);
    for (const game of rows) {
      try {
        if (await sendT1GameResultNotification({ opponent: game.opponent, tournament: game.tournament, sourceUrl: game.source_url, gameNumber: game.game_number, won: game.winner === "T1" })) {
          await client.query(`UPDATE t1_match_games SET result_notified_at=now() WHERE id=$1 AND result_notified_at IS NULL`, [game.id]);
          sent++;
        }
      } catch (error) {
        await recordAdminError("t1-game-ntfy", error, { gameId: game.id, opponent: game.opponent, gameNumber: game.game_number });
      }
    }
    return sent;
  } finally {
    if (locked) await client.query(`SELECT pg_advisory_unlock(hashtext('t1-game-result-notifications'))`);
    client.release();
  }
}
