export const API_VERSION = "v1" as const;
export const MAX_TITLE_LENGTH = 500;
export const MAX_BLOCKS_PER_DOCUMENT = 10_000;
export const MAX_BLOCK_TEXT_BYTES = 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const MAX_SYNC_BATCH_SIZE = 100;

export type NodeKind = "FOLDER" | "PAGE";
export type WorkspaceKind = "PERSONAL" | "SHARED";
export type WorkspaceRole = "OWNER" | "EDITOR" | "VIEWER";

export interface ApiNode {
  readonly id: string;
  readonly workspaceId: string;
  readonly parentId: string | null;
  readonly kind: NodeKind;
  readonly title: string;
  readonly position: number;
  readonly revision: number;
  readonly archivedAt: string | null;
  readonly trashedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type ApiDocumentBlock =
  | { readonly id: string; readonly type: "paragraph"; readonly text: string }
  | { readonly id: string; readonly type: "heading"; readonly level: 1 | 2 | 3; readonly text: string }
  | { readonly id: string; readonly type: "checklist"; readonly checked: boolean; readonly text: string };

export interface ApiDocument {
  readonly pageId: string;
  readonly schemaVersion: 1;
  readonly blocks: readonly ApiDocumentBlock[];
  readonly revision: number;
  readonly contentHash: string;
  readonly updatedAt: string;
}

export interface CreateNodeRequest {
  readonly operationId: string;
  readonly id: string;
  readonly kind: NodeKind;
  readonly title: string;
  readonly parentId: string | null;
  readonly position: number;
}

export interface UpdateNodeRequest {
  readonly operationId: string;
  readonly baseRevision: number;
  readonly title?: string;
  readonly parentId?: string | null;
  readonly position?: number;
  readonly archived?: boolean;
  readonly trashed?: boolean;
}

export interface UpdateDocumentRequest {
  readonly operationId: string;
  readonly baseRevision: number;
  readonly schemaVersion: 1;
  readonly blocks: readonly ApiDocumentBlock[];
}

export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "INVALID_REQUEST"
  | "OPERATION_REPLAY_MISMATCH"
  | "NODE_CONFLICT"
  | "DOCUMENT_CONFLICT"
  | "RATE_LIMITED"
  | "STORAGE_UNAVAILABLE"
  | "INTERNAL_ERROR";

export interface ApiErrorEnvelope {
  readonly error: {
    readonly code: ApiErrorCode;
    readonly message: string;
    readonly requestId: string;
    readonly retryable: boolean;
    readonly details: Readonly<Record<string, unknown>>;
  };
}

export class ContractValidationError extends Error {
  readonly code = "INVALID_REQUEST";
  constructor(readonly issues: readonly string[]) {
    super("Request does not match the Mano API contract");
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function record(value: unknown, issues: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issues.push("body must be an object");
    return {};
  }
  return value as Record<string, unknown>;
}

function rejectUnknown(input: Record<string, unknown>, allowed: readonly string[], issues: string[]): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(input)) if (!allowedSet.has(key)) issues.push(`${key} is not allowed`);
}

function uuidField(input: Record<string, unknown>, key: string, issues: string[]): string {
  const value = input[key];
  if (!isUuid(value)) issues.push(`${key} must be a UUID`);
  return typeof value === "string" ? value : "";
}

function positiveRevision(value: unknown, key: string, issues: string[]): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) issues.push(`${key} must be a positive safe integer`);
  return typeof value === "number" ? value : 0;
}

function position(value: unknown, issues: string[]): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) issues.push("position must be a non-negative safe integer");
  return typeof value === "number" ? value : 0;
}

function title(value: unknown, issues: string[]): string {
  if (typeof value !== "string") {
    issues.push("title must be a string");
    return "";
  }
  const normalized = value.trim();
  if (normalized.length === 0) issues.push("title must not be empty");
  if (normalized.length > MAX_TITLE_LENGTH) issues.push(`title must be at most ${MAX_TITLE_LENGTH} characters`);
  return normalized;
}

function finish<T>(value: T, issues: string[]): T {
  if (issues.length > 0) throw new ContractValidationError(issues);
  return value;
}

export function parseCreateNodeRequest(value: unknown): CreateNodeRequest {
  const issues: string[] = [];
  const input = record(value, issues);
  rejectUnknown(input, ["operationId", "id", "kind", "title", "parentId", "position"], issues);
  const kind = input.kind;
  if (kind !== "FOLDER" && kind !== "PAGE") issues.push("kind must be FOLDER or PAGE");
  const parentId = input.parentId;
  if (parentId !== null && !isUuid(parentId)) issues.push("parentId must be a UUID or null");
  return finish({
    operationId: uuidField(input, "operationId", issues),
    id: uuidField(input, "id", issues),
    kind: kind === "FOLDER" ? "FOLDER" : "PAGE",
    title: title(input.title, issues),
    parentId: typeof parentId === "string" ? parentId : null,
    position: position(input.position, issues),
  }, issues);
}

export function parseUpdateNodeRequest(value: unknown): UpdateNodeRequest {
  const issues: string[] = [];
  const input = record(value, issues);
  const mutationKeys = ["title", "parentId", "position", "archived", "trashed"] as const;
  rejectUnknown(input, ["operationId", "baseRevision", ...mutationKeys], issues);
  if (!mutationKeys.some((key) => Object.hasOwn(input, key))) issues.push("at least one node mutation is required");
  const result: {
    operationId: string; baseRevision: number; title?: string; parentId?: string | null;
    position?: number; archived?: boolean; trashed?: boolean;
  } = {
    operationId: uuidField(input, "operationId", issues),
    baseRevision: positiveRevision(input.baseRevision, "baseRevision", issues),
  };
  if (Object.hasOwn(input, "title")) result.title = title(input.title, issues);
  if (Object.hasOwn(input, "parentId")) {
    if (input.parentId !== null && !isUuid(input.parentId)) issues.push("parentId must be a UUID or null");
    result.parentId = typeof input.parentId === "string" ? input.parentId : null;
  }
  if (Object.hasOwn(input, "position")) result.position = position(input.position, issues);
  for (const key of ["archived", "trashed"] as const) {
    if (!Object.hasOwn(input, key)) continue;
    if (typeof input[key] !== "boolean") issues.push(`${key} must be a boolean`);
    result[key] = input[key] === true;
  }
  return finish(result, issues);
}

export function parseUpdateDocumentRequest(value: unknown): UpdateDocumentRequest {
  const issues: string[] = [];
  const input = record(value, issues);
  rejectUnknown(input, ["operationId", "baseRevision", "schemaVersion", "blocks"], issues);
  if (input.schemaVersion !== 1) issues.push("schemaVersion must be 1");
  if (!Array.isArray(input.blocks)) issues.push("blocks must be an array");
  const rawBlocks = Array.isArray(input.blocks) ? input.blocks : [];
  if (rawBlocks.length > MAX_BLOCKS_PER_DOCUMENT) {
    issues.push(`blocks must contain at most ${MAX_BLOCKS_PER_DOCUMENT} items`);
  }
  const blocks = rawBlocks.slice(0, MAX_BLOCKS_PER_DOCUMENT).map((block, index) => parseBlock(block, index, issues));
  const ids = new Set<string>();
  for (const block of blocks) {
    if (ids.has(block.id)) issues.push(`blocks contains duplicate id ${block.id}`);
    ids.add(block.id);
  }
  if (new TextEncoder().encode(JSON.stringify({ schemaVersion: 1, blocks })).byteLength > MAX_DOCUMENT_BYTES) {
    issues.push(`document must be at most ${MAX_DOCUMENT_BYTES} UTF-8 JSON bytes`);
  }
  return finish({
    operationId: uuidField(input, "operationId", issues),
    baseRevision: positiveRevision(input.baseRevision, "baseRevision", issues),
    schemaVersion: 1,
    blocks,
  }, issues);
}

function parseBlock(value: unknown, index: number, issues: string[]): ApiDocumentBlock {
  const prefix = `blocks[${index}]`;
  const input = record(value, issues);
  const type = input.type;
  const allowed = type === "heading"
    ? ["id", "type", "level", "text"]
    : type === "checklist" ? ["id", "type", "checked", "text"] : ["id", "type", "text"];
  for (const key of Object.keys(input)) if (!allowed.includes(key)) issues.push(`${prefix}.${key} is not allowed`);
  const id = input.id;
  if (!isUuid(id)) issues.push(`${prefix}.id must be a UUID`);
  const text = input.text;
  if (typeof text !== "string") issues.push(`${prefix}.text must be a string`);
  const safeText = typeof text === "string" ? text : "";
  if (new TextEncoder().encode(safeText).byteLength > MAX_BLOCK_TEXT_BYTES) {
    issues.push(`${prefix}.text must be at most ${MAX_BLOCK_TEXT_BYTES} UTF-8 bytes`);
  }
  const safeId = typeof id === "string" ? id : "";
  if (type === "heading") {
    if (input.level !== 1 && input.level !== 2 && input.level !== 3) issues.push(`${prefix}.level must be 1, 2 or 3`);
    return { id: safeId, type: "heading", level: input.level === 2 ? 2 : input.level === 3 ? 3 : 1, text: safeText };
  }
  if (type === "checklist") {
    if (typeof input.checked !== "boolean") issues.push(`${prefix}.checked must be a boolean`);
    return { id: safeId, type: "checklist", checked: input.checked === true, text: safeText };
  }
  if (type !== "paragraph") issues.push(`${prefix}.type is not supported`);
  return { id: safeId, type: "paragraph", text: safeText };
}
