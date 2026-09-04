import { randomInt, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { recordAdminError } from "@/lib/admin-errors";
import {
  blogNeighborPriority,
  blogReplySourceKey,
  mutualNeighborPattern,
  nonNegativeMetric,
  replyPromisePattern,
  socialNeighborPattern,
  validNaverBlogUrl,
  type CollectedBlogReply,
} from "@/lib/blog-rules";

export { blogNeighborPriority, blogReplySourceKey, nonNegativeMetric, validNaverBlogUrl } from "@/lib/blog-rules";
export type { CollectedBlogReply } from "@/lib/blog-rules";

export type BlogDiscoveryItem = {
  id: string;
  url: string;
  title: string;
  bloggerName: string;
  excerpt: string;
  publishedOn: string | null;
  status: "NEW" | "DONE";
  mutualNeighbor: boolean;
  neighborLabel: "답방 약속" | "서이추 환영" | "소통 환영" | null;
  commentKind: "GENERAL" | "FOOD" | "TRAVEL" | "CONTENT";
};
const mutualSearchTerms = ["답방 무조건", "답방 100%", "댓글 답방", "공감 답방", "서이추환영", "서로이웃환영", "이웃소통"] as const;
type NaverBlogItem = { title?: string; link?: string; description?: string; bloggername?: string; bloggerlink?: string; postdate?: string };
type DiscoveryMode = "NORMAL" | "MUTUAL" | "TAGS_ONLY";
const clean = (text: string) =>
  text
    .replace(/<[^>]*>/g, "")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&#39;", "'")
    .trim();
const bloggerKey = (item: NaverBlogItem) => {
  for (const raw of [item.bloggerlink, item.link]) {
    if (!raw) continue;
    try {
      const url = new URL(raw);
      const path = url.pathname.split("/").filter(Boolean);
      const queryId = url.searchParams.get("blogId") ?? url.searchParams.get("userId");
      if (queryId) return queryId.toLowerCase();
      if (url.hostname.endsWith("blog.naver.com") && path[0] && path[0].toLowerCase() !== "goblog.naver") return path[0].toLowerCase();
    } catch {}
  }
  return clean(item.bloggername ?? "").toLowerCase();
};

export type BlogReplyItem = { id: string; postUrl: string; commenter: string; commentExcerpt: string; commentedAt: string; repliedAt: string | null; overdue: boolean };
export type BlogGrowthSnapshot = { measuredOn: string; visitors: number; views: number; neighbors: number; mutualNeighbors: number; posts: number; receivedComments: number; replies: number };
export type BlogNeighbor = { key: string; name: string; url: string };
export type BlogNeighborRelation = "MUTUAL" | "NEIGHBOR" | "FOLLOWING" | "FOLLOWER" | "OUTGOING_PENDING" | "INCOMING_PENDING";
export type BlogNeighborScope = "FOLLOWING" | "FOLLOWERS" | "REQUESTS";
export type CollectedBlogNeighbor = { bloggerKey: string; bloggerName: string; blogUrl: string; relation: BlogNeighborRelation };
export type BlogNeighborState = BlogNeighbor & { relation: BlogNeighborRelation; active: boolean; lastSeenAt: string; missingSince: string | null };
export type BlogNeighborChange = { id: string; key: string; name: string; previousRelation: BlogNeighborRelation | null; currentRelation: BlogNeighborRelation | null; kind: "ADDED" | "RELATION_CHANGED" | "MISSING" | "RESTORED"; detectedAt: string };

export async function getBlogDiscovery(workspaceId: string) {
  const [settingsResult, exclusionsResult, itemsResult, repliesResult, growthResult, neighborsResult, neighborStatesResult, neighborChangesResult] = await Promise.all([
    db.query(
      `SELECT food_keywords,travel_keywords,content_keywords,last_keyword,last_error,recent_years FROM blog_discovery_settings WHERE workspace_id=$1`,
      [workspaceId],
    ),
    db.query(`SELECT blogger_key FROM blog_discovery_exclusions WHERE workspace_id=$1 ORDER BY blogger_key`, [workspaceId]),
    db.query(
      `SELECT id,url,title,blogger_name,excerpt,published_on,status,comment_kind FROM blog_discovery_items WHERE workspace_id=$1 AND batch_id=(SELECT current_batch FROM blog_discovery_settings WHERE workspace_id=$1) AND status NOT IN ('HIDDEN','NEIGHBOR')`,
      [workspaceId],
    ),
    db.query(`SELECT id,post_url,commenter,comment_excerpt,commented_at,replied_at FROM blog_reply_items WHERE workspace_id=$1 ORDER BY replied_at NULLS FIRST,commented_at DESC`, [workspaceId]),
    db.query(`SELECT measured_on,visitors,views,neighbors,mutual_neighbors,posts,received_comments,replies FROM blog_growth_snapshots WHERE workspace_id=$1 ORDER BY measured_on DESC LIMIT 12`, [workspaceId]),
    db.query(
      `SELECT DISTINCT ON (blogger_key) blogger_key,blogger_name,source_order
       FROM (
         SELECT blogger_key,blogger_name,0 AS source_order FROM blog_neighbors WHERE workspace_id=$1 AND active AND relation IN ('MUTUAL','NEIGHBOR','FOLLOWING','FOLLOWER')
         UNION ALL
         SELECT blogger_key,blogger_name,1 AS source_order FROM blog_discovery_items
         WHERE workspace_id=$1 AND status='NEIGHBOR' AND blogger_key<>''
           AND NOT EXISTS (SELECT 1 FROM blog_neighbors WHERE workspace_id=$1)
         UNION ALL
         SELECT blogger_key,'' AS blogger_name,2 AS source_order FROM blog_discovery_exclusions
         WHERE workspace_id=$1 AND relation='NEIGHBOR'
           AND NOT EXISTS (SELECT 1 FROM blog_neighbors WHERE workspace_id=$1)
       ) neighbors
       ORDER BY blogger_key,source_order,blogger_name`,
      [workspaceId],
    ),
    db.query(`SELECT blogger_key,blogger_name,blog_url,relation,active,last_seen_at,missing_since FROM blog_neighbors WHERE workspace_id=$1 ORDER BY active DESC,relation,blogger_name,blogger_key`, [workspaceId]),
    db.query(`SELECT id,blogger_key,blogger_name,previous_relation,current_relation,change_kind,detected_at FROM blog_neighbor_changes WHERE workspace_id=$1 AND (change_kind<>'MISSING' OR source_scope IS NOT NULL) ORDER BY detected_at DESC LIMIT 30`, [workspaceId]),
  ]);
  const settings = settingsResult.rows[0];
  return {
    configured: Boolean(
      process.env.NAVER_SEARCH_CLIENT_ID &&
      process.env.NAVER_SEARCH_CLIENT_SECRET,
    ),
    foodKeywords: (settings?.food_keywords ?? []) as string[],
    travelKeywords: (settings?.travel_keywords ?? []) as string[],
    contentKeywords: (settings?.content_keywords ?? []) as string[],
    recentYears: (Number(settings?.recent_years) === 2 ? 2 : 1) as 1 | 2,
    lastKeyword: settings?.last_keyword ?? "",
    error: settings?.last_error ?? "",
    exclusionIds: exclusionsResult.rows.map((row) => String(row.blogger_key)),
    items: itemsResult.rows.map((r): BlogDiscoveryItem => ({
      id: r.id,
      url: r.url,
      title: r.title,
      bloggerName: r.blogger_name,
      excerpt: r.excerpt,
      publishedOn: r.published_on ? String(r.published_on).slice(0, 10) : null,
      status: r.status,
      mutualNeighbor: mutualNeighborPattern.test(`${r.title} ${r.excerpt}`),
      neighborLabel: replyPromisePattern.test(`${r.title} ${r.excerpt}`)
        ? "답방 약속"
        : mutualNeighborPattern.test(`${r.title} ${r.excerpt}`)
        ? "서이추 환영"
        : socialNeighborPattern.test(`${r.title} ${r.excerpt}`)
          ? "소통 환영"
          : null,
      commentKind: (["FOOD", "TRAVEL", "CONTENT"].includes(r.comment_kind) ? r.comment_kind : "GENERAL") as BlogDiscoveryItem["commentKind"],
    })).sort((a, b) => blogNeighborPriority(`${a.title} ${a.excerpt}`) - blogNeighborPriority(`${b.title} ${b.excerpt}`) || String(b.publishedOn ?? "").localeCompare(String(a.publishedOn ?? ""))),
    replyItems: repliesResult.rows.map((r): BlogReplyItem => ({ id: r.id, postUrl: r.post_url, commenter: r.commenter, commentExcerpt: r.comment_excerpt, commentedAt: new Date(r.commented_at).toISOString(), repliedAt: r.replied_at ? new Date(r.replied_at).toISOString() : null, overdue: !r.replied_at && Date.now() - new Date(r.commented_at).getTime() >= 86_400_000 })),
    growthSnapshots: growthResult.rows.map((r): BlogGrowthSnapshot => ({ measuredOn: String(r.measured_on).slice(0, 10), visitors: Number(r.visitors), views: Number(r.views), neighbors: Number(r.neighbors), mutualNeighbors: Number(r.mutual_neighbors), posts: Number(r.posts), receivedComments: Number(r.received_comments), replies: Number(r.replies) })),
    neighbors: neighborsResult.rows.map((r): BlogNeighbor => ({
      key: String(r.blogger_key),
      name: String(r.blogger_name || r.blogger_key),
      url: `https://blog.naver.com/${encodeURIComponent(String(r.blogger_key))}`,
    })),
    neighborStates: neighborStatesResult.rows.map((r): BlogNeighborState => ({ key:String(r.blogger_key),name:String(r.blogger_name||r.blogger_key),url:String(r.blog_url),relation:r.relation,active:Boolean(r.active),lastSeenAt:new Date(r.last_seen_at).toISOString(),missingSince:r.missing_since?new Date(r.missing_since).toISOString():null })),
    neighborChanges: neighborChangesResult.rows.map((r): BlogNeighborChange => ({ id:String(r.id),key:String(r.blogger_key),name:String(r.blogger_name||r.blogger_key),previousRelation:r.previous_relation,currentRelation:r.current_relation,kind:r.change_kind,detectedAt:new Date(r.detected_at).toISOString() })),
  };
}

const neighborRelations = new Set<BlogNeighborRelation>(["MUTUAL","NEIGHBOR","FOLLOWING","FOLLOWER","OUTGOING_PENDING","INCOMING_PENDING"]),neighborScopes=new Set<BlogNeighborScope>(["FOLLOWING","FOLLOWERS","REQUESTS"]);
export async function ingestBlogNeighbors(items: CollectedBlogNeighbor[], completeSnapshot: boolean, scope:BlogNeighborScope|null) {
  const workspace = await db.query(`SELECT id FROM workspaces WHERE slug='blog' LIMIT 1`), workspaceId=String(workspace.rows[0]?.id??"");
  if(!workspaceId)return {accepted:0,skipped:items.length,missing:0};
  if(!scope||!neighborScopes.has(scope))completeSnapshot=false;
  const normalized=new Map<string,CollectedBlogNeighbor>();
  for(const item of items.slice(0,1000)){
    const key=item.bloggerKey.trim().toLowerCase(),name=item.bloggerName.trim().slice(0,100),url=item.blogUrl.trim();
    if(!/^[a-z0-9_.-]+$/i.test(key)||!neighborRelations.has(item.relation)||!validNaverBlogUrl(url))continue;
    normalized.set(key,{bloggerKey:key,bloggerName:name||key,blogUrl:url,relation:item.relation});
  }
  const client=await db.connect();let accepted=0,missing=0;
  try{
    await client.query("BEGIN");
    for(const item of normalized.values()){
      const previous=await client.query(`SELECT relation,active FROM blog_neighbors WHERE workspace_id=$1 AND blogger_key=$2 FOR UPDATE`,[workspaceId,item.bloggerKey]),row=previous.rows[0];
      await client.query(`INSERT INTO blog_neighbors(workspace_id,blogger_key,blogger_name,blog_url,relation,source_scopes) VALUES($1,$2,$3,$4,$5,$6::text[]) ON CONFLICT(workspace_id,blogger_key) DO UPDATE SET blogger_name=EXCLUDED.blogger_name,blog_url=EXCLUDED.blog_url,relation=EXCLUDED.relation,source_scopes=ARRAY(SELECT DISTINCT unnest(blog_neighbors.source_scopes||EXCLUDED.source_scopes)),active=true,last_seen_at=now(),missing_since=NULL,updated_at=now()`,[workspaceId,item.bloggerKey,item.bloggerName,item.blogUrl,item.relation,scope?[scope]:[]]);
      const kind=!row?"ADDED":!row.active?"RESTORED":row.relation!==item.relation?"RELATION_CHANGED":null;
      if(kind)await client.query(`INSERT INTO blog_neighbor_changes(workspace_id,blogger_key,blogger_name,previous_relation,current_relation,change_kind,source_scope) VALUES($1,$2,$3,$4,$5,$6,$7)`,[workspaceId,item.bloggerKey,item.bloggerName,row?.relation??null,item.relation,kind,scope]);
      accepted++;
    }
    if(completeSnapshot){
      const keys=[...normalized.keys()],gone=await client.query(`UPDATE blog_neighbors SET source_scopes=array_remove(source_scopes,$3),active=cardinality(array_remove(source_scopes,$3))>0,missing_since=CASE WHEN cardinality(array_remove(source_scopes,$3))=0 THEN COALESCE(missing_since,now()) ELSE NULL END,updated_at=now() WHERE workspace_id=$1 AND source_scopes@>ARRAY[$3]::text[] AND NOT (blogger_key=ANY($2::text[])) RETURNING blogger_key,blogger_name,relation,active`,[workspaceId,keys,scope]);
      for(const row of gone.rows.filter(row=>!row.active))await client.query(`INSERT INTO blog_neighbor_changes(workspace_id,blogger_key,blogger_name,previous_relation,current_relation,change_kind,source_scope) VALUES($1,$2,$3,$4,NULL,'MISSING',$5)`,[workspaceId,row.blogger_key,row.blogger_name,row.relation,scope]);
      missing=gone.rows.filter(row=>!row.active).length;
    }
    await client.query("COMMIT");
  }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
  return {accepted,skipped:items.length-accepted,missing};
}

export async function createBlogReplyItem(workspaceId: string, input: { postUrl: string; commenter: string; commentExcerpt: string; commentedAt: string }) {
  if (!workspaceId || !input.commenter.trim() || !validNaverBlogUrl(input.postUrl)) return false;
  const commentedAt = new Date(input.commentedAt);
  if (Number.isNaN(commentedAt.getTime())) return false;
  await db.query(`INSERT INTO blog_reply_items(workspace_id,post_url,commenter,comment_excerpt,commented_at) SELECT id,$2,$3,$4,$5 FROM workspaces WHERE id=$1 AND slug='blog'`, [workspaceId, input.postUrl, input.commenter.trim().slice(0, 100), input.commentExcerpt.trim().slice(0, 500), commentedAt]);
  return true;
}
export async function completeBlogReplyItem(id: string, workspaceId: string) { await db.query(`UPDATE blog_reply_items SET replied_at=COALESCE(replied_at,now()),updated_at=now() WHERE id=$1 AND workspace_id=$2`, [id, workspaceId]); }
export async function ingestBlogReplies(items: CollectedBlogReply[], repliedItems: CollectedBlogReply[] = []) {
  const workspace = await db.query(`SELECT id FROM workspaces WHERE slug='blog' LIMIT 1`), workspaceId = String(workspace.rows[0]?.id ?? "");
  if (!workspaceId) return { accepted: 0, skipped: items.length };
  let accepted = 0;
  for (const item of items.slice(0, 100)) {
    const commenter=item.commenter.trim().slice(0,100), excerpt=item.commentExcerpt.trim().slice(0,500), commentedAt=new Date(item.commentedAt);
    if (!commenter || !validNaverBlogUrl(item.postUrl) || Number.isNaN(commentedAt.getTime())) continue;
    const result=await db.query(`INSERT INTO blog_reply_items(workspace_id,post_url,commenter,comment_excerpt,commented_at,source_key) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(workspace_id,source_key) WHERE source_key IS NOT NULL DO NOTHING RETURNING id`,[workspaceId,item.postUrl.trim(),commenter,excerpt,commentedAt,blogReplySourceKey({...item,commenter,commentExcerpt:excerpt})]);
    accepted+=result.rowCount??0;
  }
  const repliedKeys=repliedItems.slice(0,100).filter(item=>validNaverBlogUrl(item.postUrl)).map(blogReplySourceKey);
  const completed=repliedKeys.length?(await db.query(`UPDATE blog_reply_items SET replied_at=COALESCE(replied_at,now()),updated_at=now() WHERE workspace_id=$1 AND source_key=ANY($2::text[]) AND replied_at IS NULL`,[workspaceId,repliedKeys])).rowCount??0:0;
  return { accepted, skipped: items.length-accepted, completed };
}
export async function saveBlogGrowthSnapshot(workspaceId: string, measuredOn: string, values: Omit<BlogGrowthSnapshot, "measuredOn">) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(measuredOn) || Object.values(values).some(value => nonNegativeMetric(value) === null)) return false;
  await db.query(`INSERT INTO blog_growth_snapshots(workspace_id,measured_on,visitors,views,neighbors,mutual_neighbors,posts,received_comments,replies) SELECT id,$2,$3,$4,$5,$6,$7,$8,$9 FROM workspaces WHERE id=$1 AND slug='blog' ON CONFLICT(workspace_id,measured_on) DO UPDATE SET visitors=EXCLUDED.visitors,views=EXCLUDED.views,neighbors=EXCLUDED.neighbors,mutual_neighbors=EXCLUDED.mutual_neighbors,posts=EXCLUDED.posts,received_comments=EXCLUDED.received_comments,replies=EXCLUDED.replies,updated_at=now()`, [workspaceId, measuredOn, values.visitors, values.views, values.neighbors, values.mutualNeighbors, values.posts, values.receivedComments, values.replies]);
  return true;
}
export async function ingestBlogGrowth(input:{measuredOn:string;visitors?:number|null;views?:number|null;posts?:number|null}){
  const workspace=await db.query(`SELECT id FROM workspaces WHERE slug='blog' LIMIT 1`),workspaceId=String(workspace.rows[0]?.id??"");
  if(!workspaceId||!/^\d{4}-\d{2}-\d{2}$/.test(input.measuredOn))return false;
  const supplied=[input.visitors,input.views,input.posts];
  if(supplied.some(value=>value!==null&&value!==undefined&&nonNegativeMetric(value)===null))return false;
  const [latest,relations,activity]=await Promise.all([
    db.query(`SELECT visitors,views,posts FROM blog_growth_snapshots WHERE workspace_id=$1 ORDER BY measured_on DESC LIMIT 1`,[workspaceId]),
    db.query(`SELECT count(*) FILTER(WHERE active AND relation IN ('MUTUAL','NEIGHBOR','FOLLOWING')) neighbors,count(*) FILTER(WHERE active AND relation='MUTUAL') mutual_neighbors FROM blog_neighbors WHERE workspace_id=$1`,[workspaceId]),
    db.query(`SELECT count(*) received_comments,count(*) FILTER(WHERE replied_at IS NOT NULL) replies FROM blog_reply_items WHERE workspace_id=$1`,[workspaceId]),
  ]),previous=latest.rows[0]??{},relation=relations.rows[0]??{},counts=activity.rows[0]??{};
  return saveBlogGrowthSnapshot(workspaceId,input.measuredOn,{visitors:Number(input.visitors??previous.visitors??0),views:Number(input.views??previous.views??0),posts:Number(input.posts??previous.posts??0),neighbors:Number(relation.neighbors??0),mutualNeighbors:Number(relation.mutual_neighbors??0),receivedComments:Number(counts.received_comments??0),replies:Number(counts.replies??0)});
}
export async function saveBlogDiscoveryKeywords(
  workspaceId: string,
  foodKeywords: string[],
  travelKeywords: string[],
  contentKeywords: string[],
  recentYears: 1 | 2,
) {
  await db.query(
    `INSERT INTO blog_discovery_settings(workspace_id,keywords,food_keywords,travel_keywords,content_keywords,recent_years) SELECT id,$2::text[]||$3::text[]||$4::text[],$2::text[],$3::text[],$4::text[],$5 FROM workspaces WHERE id=$1 AND slug='blog' ON CONFLICT(workspace_id) DO UPDATE SET keywords=EXCLUDED.keywords,food_keywords=EXCLUDED.food_keywords,travel_keywords=EXCLUDED.travel_keywords,content_keywords=EXCLUDED.content_keywords,recent_years=EXCLUDED.recent_years,last_error='',updated_at=now()`,
    [workspaceId, foodKeywords, travelKeywords, contentKeywords, recentYears],
  );
}
const normalizedBloggerIds = (values: string[]) => [...new Set(values.map((value) => bloggerKey({ link: value, bloggername: value })).filter((value) => /^[a-z0-9_.-]+$/i.test(value)))];
export async function saveBlogDiscoveryExclusions(workspaceId: string, values: string[]) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    for (const key of normalizedBloggerIds(values)) await client.query(`INSERT INTO blog_discovery_exclusions(workspace_id,blogger_key,relation) VALUES($1,$2,'NEIGHBOR') ON CONFLICT(workspace_id,blogger_key) DO NOTHING`, [workspaceId, key]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function rerollBlogDiscovery(workspaceId: string, mode: DiscoveryMode = "NORMAL", customKeyword = "") {
  const { rows } = await db.query(
    `SELECT COALESCE(s.food_keywords,'{}') food_keywords,COALESCE(s.travel_keywords,'{}') travel_keywords,COALESCE(s.content_keywords,'{}') content_keywords,COALESCE(s.recent_years,1) recent_years FROM workspaces w LEFT JOIN blog_discovery_settings s ON s.workspace_id=w.id WHERE w.id=$1 AND w.slug='blog'`,
      [workspaceId],
    ),
    foodKeywords = (rows[0]?.food_keywords ?? []) as string[],
    travelKeywords = (rows[0]?.travel_keywords ?? []) as string[],
    contentKeywords = (rows[0]?.content_keywords ?? []) as string[],
    keywordOptions = [...foodKeywords.map(keyword => ({ keyword, kind: "FOOD" as const })), ...travelKeywords.map(keyword => ({ keyword, kind: "TRAVEL" as const })), ...contentKeywords.map(keyword => ({ keyword, kind: "CONTENT" as const }))],
    recentYears: 1 | 2 = Number(rows[0]?.recent_years) === 2 ? 2 : 1,
    clientId = process.env.NAVER_SEARCH_CLIENT_ID?.trim(),
    clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET?.trim();
  const typedKeyword = clean(customKeyword).replace(/\s+/g, " ").slice(0, 80);
  if (!keywordOptions.length && !typedKeyword && mode !== "TAGS_ONLY") {
    await setError(workspaceId, "검색 키워드를 먼저 저장하세요.");
    return;
  }
  if (!clientId || !clientSecret) {
    await setError(
      workspaceId,
      "NAVER_SEARCH_CLIENT_ID와 NAVER_SEARCH_CLIENT_SECRET이 설정되지 않았습니다.",
    );
    return;
  }
  const selected = typedKeyword ? null : keywordOptions.length ? keywordOptions[randomInt(keywordOptions.length)] : null,
    baseKeyword = typedKeyword || selected?.keyword || "",
    typedKind = foodKeywords.includes(typedKeyword) ? "FOOD" as const : travelKeywords.includes(typedKeyword) ? "TRAVEL" as const : contentKeywords.includes(typedKeyword) ? "CONTENT" as const : "GENERAL" as const,
    commentKind = mode === "TAGS_ONLY" ? "GENERAL" as const : typedKeyword ? typedKind : selected?.kind ?? "GENERAL" as const,
    queries = mode === "TAGS_ONLY"
      ? [...mutualSearchTerms]
      : mode === "MUTUAL"
      ? mutualSearchTerms.map((term) => `${baseKeyword} ${term}`)
      : [baseKeyword],
    keyword = mode === "TAGS_ONLY"
      ? `이웃 태그만 ${mutualSearchTerms.length}개`
      : mode === "MUTUAL"
      ? `${baseKeyword} · 이웃 태그 ${mutualSearchTerms.length}개`
      : baseKeyword;
  try {
    const found: NaverBlogItem[] = [];
    for (const query of queries) {
      const url = new URL("https://naverapihub.apigw.ntruss.com/search/v1/blog");
      url.searchParams.set("query", query);
      url.searchParams.set("display", "30");
      url.searchParams.set("start", "1");
      url.searchParams.set("sort", "date");
      const response = await fetch(url, {
        headers: {
          "X-NCP-APIGW-API-KEY-ID": clientId,
          "X-NCP-APIGW-API-KEY": clientSecret,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        const failure = (await response.json().catch(() => ({}))) as { errorCode?: string; errorMessage?: string; error?: { errorCode?: string; message?: string } };
        const code = failure.errorCode ?? failure.error?.errorCode,
          message = failure.errorMessage ?? failure.error?.message;
        throw new Error(`네이버 API HUB ${response.status}${code ? ` · ${code}` : ""}${message ? ` · ${message}` : ""}`);
      }
      const data = (await response.json()) as { items?: NaverBlogItem[] };
      found.push(...(data.items ?? []));
    }
    const excludedResult = await db.query(`SELECT blogger_key FROM blog_discovery_exclusions WHERE workspace_id=$1 UNION SELECT blogger_key FROM blog_discovery_items WHERE workspace_id=$1 AND status='NEIGHBOR' AND blogger_key<>''`, [workspaceId]),
      excludedBloggers = new Set(excludedResult.rows.map((row) => String(row.blogger_key).toLowerCase())),
      cutoff = new Date(),
      seenUrls = new Set<string>(),
      seenBloggers = new Set<string>();
    cutoff.setFullYear(cutoff.getFullYear() - recentYears);
    const items = found.sort((a, b) => String(b.postdate ?? "").localeCompare(String(a.postdate ?? ""))).filter((item) => {
        if (!item.link || !item.title || !item.postdate) return false;
        if (seenUrls.has(item.link)) return false;
        const match = item.postdate.match(/^(\d{4})(\d{2})(\d{2})$/);
        if (!match || new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00+09:00`) < cutoff) return false;
        const blogger = bloggerKey(item);
        if (blogger && excludedBloggers.has(blogger)) return false;
        if (blogger && seenBloggers.has(blogger)) return false;
        seenUrls.add(item.link);
        if (blogger) seenBloggers.add(blogger);
        return true;
      }).slice(0, mode === "NORMAL" ? 10 : 30),
      batch = randomUUID(),
      client = await db.connect();
    try {
      await client.query("BEGIN");
      for (const item of items) {
        const published = item.postdate?.match(/^(\d{4})(\d{2})(\d{2})$/);
        await client.query(
          `INSERT INTO blog_discovery_items(workspace_id,batch_id,url,title,blogger_name,blogger_key,excerpt,published_on,comment_kind) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(workspace_id,url) DO UPDATE SET batch_id=EXCLUDED.batch_id,title=EXCLUDED.title,blogger_name=EXCLUDED.blogger_name,blogger_key=EXCLUDED.blogger_key,excerpt=EXCLUDED.excerpt,published_on=EXCLUDED.published_on,comment_kind=EXCLUDED.comment_kind,updated_at=now()`,
          [
            workspaceId,
            batch,
            item.link,
            clean(item.title ?? ""),
            clean(item.bloggername ?? ""),
            bloggerKey(item),
            clean(item.description ?? ""),
            published
              ? `${published[1]}-${published[2]}-${published[3]}`
              : null,
            commentKind,
          ],
        );
      }
      await client.query(
        `UPDATE blog_discovery_settings SET current_batch=$2,last_keyword=$3,last_error='',updated_at=now() WHERE workspace_id=$1`,
        [workspaceId, batch, keyword],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "검색 결과를 가져오지 못했습니다.";
    await recordAdminError("naver-blog-search", error, {
      workspaceId,
      keyword,
      httpEndpoint: "/search/v1/blog",
    });
    await setError(workspaceId, message);
  }
}
async function setError(workspaceId: string, error: string) {
  await db.query(
    `INSERT INTO blog_discovery_settings(workspace_id,last_error) VALUES($1,$2) ON CONFLICT(workspace_id) DO UPDATE SET last_error=EXCLUDED.last_error,updated_at=now()`,
    [workspaceId, error.slice(0, 300)],
  );
}
export async function setBlogDiscoveryItemStatus(
  id: string,
  workspaceId: string,
  status: "DONE" | "HIDDEN" | "NEIGHBOR",
) {
  if (status === "NEIGHBOR") {
    const item = await db.query(`SELECT url,blogger_name FROM blog_discovery_items WHERE id=$1 AND workspace_id=$2`, [id, workspaceId]);
    const row = item.rows[0];
    if (!row) return;
    await db.query(
      `UPDATE blog_discovery_items SET status=$3,blogger_key=$4,updated_at=now() WHERE id=$1 AND workspace_id=$2`,
      [id, workspaceId, "NEIGHBOR", bloggerKey({ link: String(row.url), bloggername: String(row.blogger_name) })],
    );
    const key = bloggerKey({ link: String(row.url), bloggername: String(row.blogger_name) });
    await db.query(`INSERT INTO blog_discovery_exclusions(workspace_id,blogger_key,relation) VALUES($1,$2,$3) ON CONFLICT(workspace_id,blogger_key) DO UPDATE SET relation=EXCLUDED.relation,updated_at=now()`, [workspaceId, key, status]);
    return;
  }
  await db.query(
    `UPDATE blog_discovery_items SET status=$3,updated_at=now() WHERE id=$1 AND workspace_id=$2`,
    [id, workspaceId, status],
  );
}
