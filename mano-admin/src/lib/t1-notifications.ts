import { db } from "@/lib/db";
import { recordAdminError } from "@/lib/admin-errors";
import { ntfyConfigured, sendT1StartNotification } from "@/lib/ntfy";

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
