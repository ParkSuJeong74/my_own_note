import { db } from "@/lib/db";
import { validateWorkspaceBlockContent, type WorkspaceBlockContent, type WorkspaceBlockType } from "@/lib/block-workspace";

export type WorkspacePageSummary = { id: string; parentId: string | null; title: string; position: number; isFavorite: boolean; updatedAt: string };
export type WorkspaceBlock = { id: string; pageId: string; type: WorkspaceBlockType; position: number; content: WorkspaceBlockContent; version: number };
export type WorkspacePage = WorkspacePageSummary & { version: number; blocks: WorkspaceBlock[] };

const page = (row: any): WorkspacePageSummary => ({ id: row.id, parentId: row.parent_id, title: row.title, position: row.position, isFavorite: row.is_favorite, updatedAt: row.updated_at.toISOString() });

export async function listWorkspacePages(query = ""): Promise<WorkspacePageSummary[]> {
  const search = query.trim().slice(0, 100);
  const { rows } = await db.query(`SELECT DISTINCT p.id,p.parent_id,p.title,p.position,p.is_favorite,p.updated_at FROM workspace_pages p WHERE p.archived_at IS NULL AND ($1='' OR p.title ILIKE '%'||$1||'%' OR EXISTS(SELECT 1 FROM workspace_blocks b WHERE b.page_id=p.id AND b.archived_at IS NULL AND b.content->>'text' ILIKE '%'||$1||'%')) ORDER BY p.parent_id NULLS FIRST,p.position,p.id`, [search]);
  return rows.map(page);
}

export async function listRecentWorkspacePages(limit = 8): Promise<WorkspacePageSummary[]> {
  const safeLimit = Math.min(20, Math.max(1, Math.trunc(limit)));
  const { rows } = await db.query(`SELECT id,parent_id,title,position,is_favorite,updated_at FROM workspace_pages WHERE archived_at IS NULL AND last_opened_at IS NOT NULL ORDER BY last_opened_at DESC LIMIT $1`, [safeLimit]);
  return rows.map(page);
}

export async function listArchivedWorkspacePages(): Promise<WorkspacePageSummary[]> {
  const { rows } = await db.query(`SELECT id,parent_id,title,position,is_favorite,updated_at FROM workspace_pages WHERE archived_at IS NOT NULL ORDER BY archived_at DESC,id`);
  return rows.map(page);
}

export async function getWorkspacePage(id: string): Promise<WorkspacePage | null> {
  const result = await db.query(`UPDATE workspace_pages SET last_opened_at=now() WHERE id=$1 AND archived_at IS NULL RETURNING id,parent_id,title,position,is_favorite,version,updated_at`, [id]);
  if (!result.rows[0]) return null;
  const { rows } = await db.query(`SELECT id,page_id,type,position,content,version FROM workspace_blocks WHERE page_id=$1 AND archived_at IS NULL ORDER BY parent_block_id NULLS FIRST,position,id`, [id]);
  return { ...page(result.rows[0]), version: result.rows[0].version, blocks: rows.map(row => ({ id: row.id, pageId: row.page_id, type: row.type, position: row.position, content: row.content, version: row.version })) };
}

export async function createWorkspacePage() {
  return createWorkspacePageUnder(null);
}

export async function createWorkspacePageUnder(parentId: string | null) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(`INSERT INTO workspace_pages(parent_id,title,position) VALUES($1,'제목 없음',(SELECT COALESCE(max(position),-1)+1 FROM workspace_pages WHERE parent_id IS NOT DISTINCT FROM $1 AND archived_at IS NULL)) RETURNING id`, [parentId]);
    const id = String(rows[0].id);
    await client.query(`INSERT INTO workspace_blocks(page_id,type,position,content) VALUES($1,'PARAGRAPH',0,$2::jsonb)`, [id, JSON.stringify({ text: "" })]);
    await client.query("COMMIT");
    return id;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function setWorkspacePageFavorite(id: string, favorite: boolean) {
  return (await db.query(`UPDATE workspace_pages SET is_favorite=$2,updated_at=now() WHERE id=$1 AND archived_at IS NULL`, [id, favorite])).rowCount === 1;
}

export async function archiveWorkspacePage(id: string) {
  const result = await db.query(`WITH RECURSIVE subtree AS (SELECT id FROM workspace_pages WHERE id=$1 AND archived_at IS NULL UNION ALL SELECT p.id FROM workspace_pages p JOIN subtree s ON p.parent_id=s.id WHERE p.archived_at IS NULL) UPDATE workspace_pages SET archived_at=now(),is_favorite=false,updated_at=now() WHERE id IN (SELECT id FROM subtree) RETURNING id`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function restoreWorkspacePage(id: string) {
  const result = await db.query(`UPDATE workspace_pages p SET archived_at=NULL,parent_id=CASE WHEN parent_id IS NULL OR EXISTS(SELECT 1 FROM workspace_pages parent WHERE parent.id=p.parent_id AND parent.archived_at IS NULL) THEN parent_id ELSE NULL END,updated_at=now() WHERE p.id=$1 AND p.archived_at IS NOT NULL RETURNING id`, [id]);
  return result.rowCount === 1;
}

export async function addWorkspaceParagraph(pageId: string) {
  const content = validateWorkspaceBlockContent("PARAGRAPH", { text: "" });
  const { rows } = await db.query(`INSERT INTO workspace_blocks(page_id,type,position,content) SELECT $1,'PARAGRAPH',COALESCE(max(position),-1)+1,$2::jsonb FROM workspace_blocks WHERE page_id=$1 AND archived_at IS NULL RETURNING id`, [pageId, JSON.stringify(content)]);
  return rows[0]?.id as string | undefined;
}

export async function addWorkspaceParagraphAfter(pageId: string, afterBlockId: string | null) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const page = await client.query(`SELECT 1 FROM workspace_pages WHERE id=$1 AND archived_at IS NULL FOR UPDATE`, [pageId]);
    if (!page.rows[0]) { await client.query("ROLLBACK"); return undefined; }
    const after = afterBlockId ? await client.query(`SELECT position FROM workspace_blocks WHERE id=$1 AND page_id=$2 AND archived_at IS NULL`, [afterBlockId, pageId]) : null;
    if (afterBlockId && !after?.rows[0]) { await client.query("ROLLBACK"); return undefined; }
    const position = after?.rows[0]?.position !== undefined ? Number(after.rows[0].position) + 1 : Number((await client.query(`SELECT COALESCE(max(position),-1)+1 AS position FROM workspace_blocks WHERE page_id=$1 AND archived_at IS NULL`, [pageId])).rows[0].position);
    await client.query(`UPDATE workspace_blocks SET position=position+1 WHERE page_id=$1 AND archived_at IS NULL AND position >= $2`, [pageId, position]);
    const { rows } = await client.query(`INSERT INTO workspace_blocks(page_id,type,position,content) VALUES($1,'PARAGRAPH',$2,$3::jsonb) RETURNING id`, [pageId, position, JSON.stringify({ text: "" })]);
    await client.query("COMMIT"); return String(rows[0].id);
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

export async function updateWorkspacePageTitle(id: string, title: string, version: number) {
  if (title.length > 500) throw new Error("Page title must be at most 500 characters");
  const result = await db.query(`UPDATE workspace_pages SET title=$2,version=version+1,updated_at=now() WHERE id=$1 AND version=$3 AND archived_at IS NULL RETURNING version`, [id, title, version]);
  return result.rows[0]?.version as number | undefined;
}

export async function updateWorkspaceBlock(pageId: string, blockId: string, content: unknown, version: number, requestedType?: WorkspaceBlockType) {
  const found = await db.query(`SELECT b.type FROM workspace_blocks b JOIN workspace_pages p ON p.id=b.page_id AND p.archived_at IS NULL WHERE b.id=$1 AND b.page_id=$2 AND b.archived_at IS NULL`, [blockId, pageId]);
  if (!found.rows[0]) return { status: "missing" as const };
  const type = requestedType ?? found.rows[0].type as WorkspaceBlockType;
  const validated = validateWorkspaceBlockContent(type, content);
  const result = await db.query(`UPDATE workspace_blocks SET type=$3,content=$4::jsonb,version=version+1,updated_at=now() WHERE id=$1 AND page_id=$2 AND version=$5 RETURNING version`, [blockId, pageId, type, JSON.stringify(validated), version]);
  return result.rows[0] ? { status: "updated" as const, version: result.rows[0].version as number } : { status: "conflict" as const };
}

export async function archiveWorkspaceBlock(pageId: string, blockId: string) {
  return ((await db.query(`UPDATE workspace_blocks SET archived_at=now(),updated_at=now() WHERE id=$1 AND page_id=$2 AND archived_at IS NULL`, [blockId, pageId])).rowCount ?? 0) === 1;
}

export async function moveWorkspaceBlock(pageId: string, blockId: string, direction: "up" | "down") {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query(`SELECT id,position,parent_block_id FROM workspace_blocks WHERE id=$1 AND page_id=$2 AND archived_at IS NULL FOR UPDATE`, [blockId, pageId]);
    if (!current.rows[0]) { await client.query("ROLLBACK"); return false; }
    const operator = direction === "up" ? "<" : ">", order = direction === "up" ? "DESC" : "ASC";
    const adjacent = await client.query(`SELECT id,position FROM workspace_blocks WHERE page_id=$1 AND parent_block_id IS NOT DISTINCT FROM $2 AND archived_at IS NULL AND position ${operator} $3 ORDER BY position ${order},id ${order} LIMIT 1 FOR UPDATE`, [pageId, current.rows[0].parent_block_id, current.rows[0].position]);
    if (!adjacent.rows[0]) { await client.query("ROLLBACK"); return false; }
    await client.query(`UPDATE workspace_blocks SET position=CASE id WHEN $2 THEN $4 ELSE $5 END,updated_at=now() WHERE page_id=$1 AND id IN ($2,$3)`, [pageId, blockId, adjacent.rows[0].id, adjacent.rows[0].position, current.rows[0].position]);
    await client.query("COMMIT"); return true;
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
