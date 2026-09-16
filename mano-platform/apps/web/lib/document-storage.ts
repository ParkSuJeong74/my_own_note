import type { DocumentBlock, DocumentState } from "@mano/editor-core";

export const DOCUMENT_STORAGE_KEY = "mano.workspace.documents";
const CURRENT_VERSION = 1;

export type DocumentMap = Readonly<Record<string, DocumentState>>;
export type DocumentLoadResult =
  | { readonly status: "empty" | "loaded"; readonly documents: DocumentMap }
  | { readonly status: "recovered"; readonly documents: DocumentMap; readonly reason: string };

function isBlock(value: unknown): value is DocumentBlock {
  if (!value || typeof value !== "object") return false;
  const block = value as Record<string, unknown>;
  if (typeof block.id !== "string" || block.id.trim() === "" || typeof block.text !== "string") return false;
  if (block.type === "paragraph") return true;
  if (block.type === "heading") return block.level === 1 || block.level === 2 || block.level === 3;
  if (block.type === "checklist") return typeof block.checked === "boolean";
  return false;
}

function isDocument(value: unknown): value is DocumentState {
  if (!value || typeof value !== "object") return false;
  const document = value as { id?: unknown; blocks?: unknown };
  if (typeof document.id !== "string" || document.id.trim() === "" || !Array.isArray(document.blocks)) return false;
  if (!document.blocks.every(isBlock)) return false;
  return new Set(document.blocks.map((block) => block.id)).size === document.blocks.length;
}

function isDocumentMap(value: unknown): value is DocumentMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).every(([pageId, document]) => pageId.trim() !== "" && isDocument(document) && document.id === pageId);
}

export function loadDocuments(storage: Pick<Storage, "getItem">): DocumentLoadResult {
  try {
    const raw = storage.getItem(DOCUMENT_STORAGE_KEY);
    if (raw === null) return { status: "empty", documents: {} };
    const parsed = JSON.parse(raw) as { version?: unknown; documents?: unknown };
    if (parsed.version !== CURRENT_VERSION) {
      return { status: "recovered", documents: {}, reason: "지원하지 않는 본문 저장 버전입니다." };
    }
    if (!isDocumentMap(parsed.documents)) {
      return { status: "recovered", documents: {}, reason: "저장된 본문 구조가 올바르지 않습니다." };
    }
    return { status: "loaded", documents: parsed.documents };
  } catch {
    return { status: "recovered", documents: {}, reason: "저장된 본문을 읽을 수 없습니다." };
  }
}

export function saveDocuments(storage: Pick<Storage, "setItem">, documents: DocumentMap): void {
  storage.setItem(DOCUMENT_STORAGE_KEY, JSON.stringify({ version: CURRENT_VERSION, documents }));
}
