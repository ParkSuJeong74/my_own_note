import type { PageTreeState } from "@mano/editor-core";

import { loadDocuments, type DocumentMap } from "./document-storage";
import { loadTree } from "./tree-storage";

const BACKUP_VERSION = 1;

export interface WorkspaceBackupData {
  readonly tree: PageTreeState;
  readonly documents: DocumentMap;
}

export class BackupError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "BackupError";
  }
}

export function createBackup(data: WorkspaceBackupData, createdAt = new Date()): string {
  if (Number.isNaN(createdAt.getTime())) throw new BackupError("백업 생성 시간이 올바르지 않습니다.");
  return JSON.stringify({
    version: BACKUP_VERSION,
    createdAt: createdAt.toISOString(),
    tree: data.tree,
    documents: data.documents,
  }, null, 2);
}

export function parseBackup(text: string): WorkspaceBackupData {
  let parsed: Record<string, unknown>;
  try {
    const value = JSON.parse(text) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("shape");
    parsed = value as Record<string, unknown>;
  } catch {
    throw new BackupError("백업 파일의 JSON을 읽을 수 없습니다.");
  }

  if (parsed.version !== BACKUP_VERSION) throw new BackupError("지원하지 않는 백업 버전입니다.");
  if (typeof parsed.createdAt !== "string" || Number.isNaN(Date.parse(parsed.createdAt))) {
    throw new BackupError("백업 생성 시간이 올바르지 않습니다.");
  }

  const treeResult = loadTree({
    getItem: () => JSON.stringify({ version: 1, tree: parsed.tree }),
  });
  if (treeResult.status === "recovered") throw new BackupError("백업의 폴더 구조가 올바르지 않습니다.");

  const documentResult = loadDocuments({
    getItem: () => JSON.stringify({ version: 1, documents: parsed.documents }),
  });
  if (documentResult.status === "recovered") throw new BackupError("백업의 본문 구조가 올바르지 않습니다.");

  const nodes = new Map(treeResult.tree.nodes.map((node) => [node.id, node]));
  for (const pageId of Object.keys(documentResult.documents)) {
    const node = nodes.get(pageId);
    if (!node || node.kind !== "page") {
      throw new BackupError("본문이 존재하지 않는 페이지나 폴더를 참조합니다.");
    }
  }

  return { tree: treeResult.tree, documents: documentResult.documents };
}
