export const REVISION_STORAGE_KEY = "mano.workspace.revisions";
const CURRENT_VERSION = 1;
export const MAX_PAGE_REVISIONS = 50;

export interface PageRevision {
  readonly id: string;
  readonly createdAt: number;
  readonly text: string;
}

export type RevisionMap = Readonly<Record<string, readonly PageRevision[]>>;
export type RevisionLoadResult =
  | { readonly status: "empty" | "loaded"; readonly revisions: RevisionMap }
  | { readonly status: "recovered"; readonly revisions: RevisionMap; readonly reason: string };

function isRevision(value: unknown): value is PageRevision {
  if (!value || typeof value !== "object") return false;
  const revision = value as Record<string, unknown>;
  return typeof revision.id === "string"
    && revision.id.trim() !== ""
    && typeof revision.createdAt === "number"
    && Number.isFinite(revision.createdAt)
    && revision.createdAt >= 0
    && typeof revision.text === "string";
}

function isRevisionMap(value: unknown): value is RevisionMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).every(([pageId, revisions]) => pageId.trim() !== ""
    && Array.isArray(revisions)
    && revisions.length <= MAX_PAGE_REVISIONS
    && revisions.every(isRevision)
    && new Set(revisions.map((revision) => revision.id)).size === revisions.length);
}

export function loadRevisions(storage: Pick<Storage, "getItem">): RevisionLoadResult {
  try {
    const raw = storage.getItem(REVISION_STORAGE_KEY);
    if (raw === null) return { status: "empty", revisions: {} };
    const parsed = JSON.parse(raw) as { version?: unknown; revisions?: unknown };
    if (parsed.version !== CURRENT_VERSION) {
      return { status: "recovered", revisions: {}, reason: "지원하지 않는 버전 기록 형식입니다." };
    }
    if (!isRevisionMap(parsed.revisions)) {
      return { status: "recovered", revisions: {}, reason: "저장된 버전 기록 구조가 올바르지 않습니다." };
    }
    return { status: "loaded", revisions: parsed.revisions };
  } catch {
    return { status: "recovered", revisions: {}, reason: "저장된 버전 기록을 읽을 수 없습니다." };
  }
}

export function saveRevisions(storage: Pick<Storage, "setItem">, revisions: RevisionMap): void {
  storage.setItem(REVISION_STORAGE_KEY, JSON.stringify({ version: CURRENT_VERSION, revisions }));
}

export function appendRevision(revisions: RevisionMap, pageId: string, text: string, createdAt = Date.now()): RevisionMap {
  const current = revisions[pageId] ?? [];
  if (current[0]?.text === text) return revisions;
  const id = `${createdAt}-${current.length}-${text.length}`;
  return { ...revisions, [pageId]: [{ id, createdAt, text }, ...current].slice(0, MAX_PAGE_REVISIONS) };
}
