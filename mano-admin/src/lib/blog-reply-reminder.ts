import { db } from "@/lib/db";
import { ntfyConfigured, sendNtfyNotification } from "@/lib/ntfy";
import { blogReplySourceKey } from "@/lib/blog-rules";

export async function sendOverdueBlogReplyReminder() {
  if (!ntfyConfigured()) return { sent: false, reason: "not_configured", count: 0 } as const;
  const client=await db.connect();
  try {
    await client.query("BEGIN");
    const workspace=await client.query(`SELECT id FROM workspaces WHERE slug='blog' LIMIT 1`), workspaceId=workspace.rows[0]?.id;
    if(!workspaceId){await client.query("ROLLBACK");return {sent:false,reason:"missing_workspace",count:0} as const;}
    const due=await client.query(`SELECT commenter,post_url,comment_excerpt,commented_at FROM blog_reply_items WHERE workspace_id=$1 AND replied_at IS NULL AND commented_at<=now()-interval '24 hours' ORDER BY commented_at`,[workspaceId]),unique=[...new Map(due.rows.map(row=>[blogReplySourceKey({postUrl:row.post_url,commenter:row.commenter,commentExcerpt:row.comment_excerpt,commentedAt:new Date(row.commented_at).toISOString()}),row])).values()].slice(0,20);
    if(!unique.length){await client.query("ROLLBACK");return {sent:false,reason:"nothing_due",count:0} as const;}
    const claimed=await client.query(`INSERT INTO blog_reply_reminder_state(workspace_id,last_sent_on) VALUES($1,current_date) ON CONFLICT(workspace_id) DO UPDATE SET last_sent_on=EXCLUDED.last_sent_on,updated_at=now() WHERE blog_reply_reminder_state.last_sent_on IS DISTINCT FROM current_date RETURNING workspace_id`,[workspaceId]);
    if(!claimed.rowCount){await client.query("ROLLBACK");return {sent:false,reason:"already_sent",count:unique.length} as const;}
    await sendNtfyNotification({title:`답글을 기다리는 댓글 ${unique.length}개`,message:`${unique.slice(0,5).map(row=>String(row.commenter)).join(", ")}${unique.length>5?" 외":""} · Mano에서 확인해 주세요.`,tags:["speech_balloon"],click:"https://admin.mano.io.kr/workspaces/blog"});
    await client.query("COMMIT");return {sent:true,reason:"sent",count:unique.length} as const;
  } catch(error){await client.query("ROLLBACK");throw error;} finally{client.release();}
}
