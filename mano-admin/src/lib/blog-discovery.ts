import { randomInt, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { recordAdminError } from "@/lib/admin-errors";

export type BlogDiscoveryItem = {
  id: string;
  url: string;
  title: string;
  bloggerName: string;
  excerpt: string;
  publishedOn: string | null;
  status: "NEW" | "DONE";
  mutualNeighbor: boolean;
  neighborLabel: "서이추 환영" | "소통 환영" | null;
};
const mutualNeighborPattern = /(서이추(?:환영|해요|구해요)?|서로\s*이웃(?:추가|환영)?|이웃\s*(?:추가\s*환영|추가|환영))/i;
const socialNeighborPattern = /(이웃\s*소통|소통\s*(?:환영|해요)|답방\s*(?:가요|환영)?)/i;
const mutualSearchTerms = ["서이추", "서이추환영", "서로이웃환영", "이웃추가환영", "이웃환영", "이웃소통", "소통환영"] as const;
const clean = (text: string) =>
  text
    .replace(/<[^>]*>/g, "")
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&#39;", "'")
    .trim();

export async function getBlogDiscovery(workspaceId: string) {
  const [settingsResult, itemsResult] = await Promise.all([
    db.query(
      `SELECT keywords,last_keyword,last_error,recent_years FROM blog_discovery_settings WHERE workspace_id=$1`,
      [workspaceId],
    ),
    db.query(
      `SELECT id,url,title,blogger_name,excerpt,published_on,status FROM blog_discovery_items WHERE workspace_id=$1 AND batch_id=(SELECT current_batch FROM blog_discovery_settings WHERE workspace_id=$1) AND status<>'HIDDEN' ORDER BY CASE WHEN title ~* '(서이추|서로[[:space:]]*이웃|이웃[[:space:]]*(추가|환영))' OR excerpt ~* '(서이추|서로[[:space:]]*이웃|이웃[[:space:]]*(추가|환영))' THEN 0 WHEN title ~* '(이웃[[:space:]]*소통|소통[[:space:]]*(환영|해요)|답방)' OR excerpt ~* '(이웃[[:space:]]*소통|소통[[:space:]]*(환영|해요)|답방)' THEN 1 ELSE 2 END,published_on DESC NULLS LAST,created_at DESC`,
      [workspaceId],
    ),
  ]);
  const settings = settingsResult.rows[0];
  return {
    configured: Boolean(
      process.env.NAVER_SEARCH_CLIENT_ID &&
      process.env.NAVER_SEARCH_CLIENT_SECRET,
    ),
    keywords: (settings?.keywords ?? []) as string[],
    recentYears: (Number(settings?.recent_years) === 2 ? 2 : 1) as 1 | 2,
    lastKeyword: settings?.last_keyword ?? "",
    error: settings?.last_error ?? "",
    items: itemsResult.rows.map((r): BlogDiscoveryItem => ({
      id: r.id,
      url: r.url,
      title: r.title,
      bloggerName: r.blogger_name,
      excerpt: r.excerpt,
      publishedOn: r.published_on ? String(r.published_on).slice(0, 10) : null,
      status: r.status,
      mutualNeighbor: mutualNeighborPattern.test(`${r.title} ${r.excerpt}`),
      neighborLabel: mutualNeighborPattern.test(`${r.title} ${r.excerpt}`)
        ? "서이추 환영"
        : socialNeighborPattern.test(`${r.title} ${r.excerpt}`)
          ? "소통 환영"
          : null,
    })),
  };
}
export async function saveBlogDiscoveryKeywords(
  workspaceId: string,
  keywords: string[],
  recentYears: 1 | 2,
) {
  await db.query(
    `INSERT INTO blog_discovery_settings(workspace_id,keywords,recent_years) SELECT id,$2,$3 FROM workspaces WHERE id=$1 AND slug='blog' ON CONFLICT(workspace_id) DO UPDATE SET keywords=EXCLUDED.keywords,recent_years=EXCLUDED.recent_years,last_error='',updated_at=now()`,
    [workspaceId, keywords, recentYears],
  );
}
export async function rerollBlogDiscovery(workspaceId: string, mode: "NORMAL" | "MUTUAL" = "NORMAL") {
  const { rows } = await db.query(
    `SELECT keywords,recent_years FROM blog_discovery_settings s JOIN workspaces w ON w.id=s.workspace_id WHERE s.workspace_id=$1 AND w.slug='blog'`,
      [workspaceId],
    ),
    keywords = (rows[0]?.keywords ?? []) as string[],
    recentYears: 1 | 2 = Number(rows[0]?.recent_years) === 2 ? 2 : 1,
    clientId = process.env.NAVER_SEARCH_CLIENT_ID?.trim(),
    clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET?.trim();
  if (!keywords.length) {
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
  const baseKeyword = keywords[randomInt(keywords.length)],
    recruitmentTerm = mutualSearchTerms[randomInt(mutualSearchTerms.length)],
    keyword = mode === "MUTUAL" ? `${baseKeyword} ${recruitmentTerm}` : baseKeyword,
    url = new URL("https://naverapihub.apigw.ntruss.com/search/v1/blog");
  url.searchParams.set("query", keyword);
  url.searchParams.set("display", "30");
  url.searchParams.set("start", "1");
  url.searchParams.set("sort", "date");
  try {
    const response = await fetch(url, {
      headers: {
        "X-NCP-APIGW-API-KEY-ID": clientId,
        "X-NCP-APIGW-API-KEY": clientSecret,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      const failure = (await response.json().catch(() => ({}))) as {
        errorCode?: string;
        errorMessage?: string;
        error?: { errorCode?: string; message?: string };
      };
      const code = failure.errorCode ?? failure.error?.errorCode,
        message = failure.errorMessage ?? failure.error?.message;
      throw new Error(
        `네이버 API HUB ${response.status}${code ? ` · ${code}` : ""}${message ? ` · ${message}` : ""}`,
      );
    }
    const data = (await response.json()) as {
        items?: {
          title?: string;
          link?: string;
          description?: string;
          bloggername?: string;
          postdate?: string;
        }[];
      },
      cutoff = new Date(),
      seenBloggers = new Set<string>();
    cutoff.setFullYear(cutoff.getFullYear() - recentYears);
    const items = (data.items ?? []).filter((item) => {
        if (!item.link || !item.title || !item.postdate) return false;
        const match = item.postdate.match(/^(\d{4})(\d{2})(\d{2})$/);
        if (!match || new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00+09:00`) < cutoff) return false;
        const blogger = clean(item.bloggername ?? "").toLowerCase();
        if (blogger && seenBloggers.has(blogger)) return false;
        if (blogger) seenBloggers.add(blogger);
        return true;
      }).slice(0, 10),
      batch = randomUUID(),
      client = await db.connect();
    try {
      await client.query("BEGIN");
      for (const item of items) {
        const published = item.postdate?.match(/^(\d{4})(\d{2})(\d{2})$/);
        await client.query(
          `INSERT INTO blog_discovery_items(workspace_id,batch_id,url,title,blogger_name,excerpt,published_on) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(workspace_id,url) DO UPDATE SET batch_id=EXCLUDED.batch_id,title=EXCLUDED.title,blogger_name=EXCLUDED.blogger_name,excerpt=EXCLUDED.excerpt,published_on=EXCLUDED.published_on,updated_at=now()`,
          [
            workspaceId,
            batch,
            item.link,
            clean(item.title ?? ""),
            clean(item.bloggername ?? ""),
            clean(item.description ?? ""),
            published
              ? `${published[1]}-${published[2]}-${published[3]}`
              : null,
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
  status: "DONE" | "HIDDEN",
) {
  await db.query(
    `UPDATE blog_discovery_items SET status=$3,updated_at=now() WHERE id=$1 AND workspace_id=$2`,
    [id, workspaceId, status],
  );
}
