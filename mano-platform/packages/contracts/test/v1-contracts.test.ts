import { describe, expect, it } from "vitest";

import {
  ContractValidationError,
  MAX_MARKDOWN_BYTES,
  MAX_TITLE_LENGTH,
  isUuid,
  parseCreateNodeRequest,
  parseUpdateDocumentRequest,
  parseUpdateNodeRequest,
} from "../src/index";

const operationId = "0fdb9478-6f6c-4f2b-89bf-fb8fb729db66";
const nodeId = "b5cf08b8-4f32-4636-98dc-0d1fabfb0ecf";

function issues(action: () => unknown): readonly string[] {
  try {
    action();
    throw new Error("expected validation failure");
  } catch (error) {
    expect(error).toBeInstanceOf(ContractValidationError);
    return (error as ContractValidationError).issues;
  }
}

describe("v1 contracts", () => {
  it("accepts canonical UUIDs and rejects malformed identifiers", () => {
    expect(isUuid(operationId)).toBe(true);
    expect(isUuid("page-local-id")).toBe(false);
  });

  it("parses and normalizes a page creation request", () => {
    expect(parseCreateNodeRequest({ operationId, id: nodeId, kind: "PAGE", title: "  제목 없음  ", parentId: null, position: 0 })).toEqual({
      operationId, id: nodeId, kind: "PAGE", title: "제목 없음", parentId: null, position: 0,
    });
  });

  it("rejects unknown create fields, invalid parents and title boundaries", () => {
    expect(issues(() => parseCreateNodeRequest({ operationId, id: nodeId, kind: "PAGE", title: "", parentId: "bad", position: -1, ownerId: nodeId }))).toEqual(expect.arrayContaining([
      "ownerId is not allowed", "parentId must be a UUID or null", "title must not be empty", "position must be a non-negative safe integer",
    ]));
    expect(issues(() => parseCreateNodeRequest({ operationId, id: nodeId, kind: "FOLDER", title: "가".repeat(MAX_TITLE_LENGTH + 1), parentId: null, position: 0 }))).toContain(`title must be at most ${MAX_TITLE_LENGTH} characters`);
  });

  it("requires a real node mutation and validates optional values", () => {
    expect(issues(() => parseUpdateNodeRequest({ operationId, baseRevision: 1 }))).toContain("at least one node mutation is required");
    expect(parseUpdateNodeRequest({ operationId, baseRevision: 2, title: " 새 이름 ", parentId: null, archived: false })).toEqual({
      operationId, baseRevision: 2, title: "새 이름", parentId: null, archived: false,
    });
    expect(issues(() => parseUpdateNodeRequest({ operationId, baseRevision: 0, trashed: "yes" }))).toEqual(expect.arrayContaining([
      "baseRevision must be a positive safe integer", "trashed must be a boolean",
    ]));
  });

  it("preserves Markdown exactly and enforces revision and UTF-8 byte limits", () => {
    const markdown = "# 제목\n\n본문 📝";
    expect(parseUpdateDocumentRequest({ operationId, baseRevision: 7, markdown })).toEqual({ operationId, baseRevision: 7, markdown });
    expect(issues(() => parseUpdateDocumentRequest({ operationId, baseRevision: 0, markdown: "x", extra: true }))).toEqual(expect.arrayContaining([
      "extra is not allowed", "baseRevision must be a positive safe integer",
    ]));
    expect(issues(() => parseUpdateDocumentRequest({ operationId, baseRevision: 1, markdown: "가".repeat(Math.floor(MAX_MARKDOWN_BYTES / 3) + 1) }))).toContain(`markdown must be at most ${MAX_MARKDOWN_BYTES} UTF-8 bytes`);
  });
});
