import assert from "node:assert/strict";
import test from "node:test";
import { normalizeWorkspaceDirection, parseWorkspaceDirection, workspaceDirectionMaxLength } from "../src/lib/workspace-direction.ts";

test("normalizes multiline Workspace direction text", () => {
  assert.equal(normalizeWorkspaceDirection("  첫 번째 방향\r\n두 번째 방향  "), "첫 번째 방향\n두 번째 방향");
  assert.equal(normalizeWorkspaceDirection("   \n"), "");
});

test("accepts the direction length boundary and rejects overflow", () => {
  assert.equal(normalizeWorkspaceDirection("가".repeat(workspaceDirectionMaxLength))?.length, workspaceDirectionMaxLength);
  assert.equal(normalizeWorkspaceDirection("가".repeat(workspaceDirectionMaxLength + 1)), null);
});

test("parses headings, paragraphs, and consecutive list items for presentation", () => {
  assert.deepEqual(parseWorkspaceDirection("# 나의 삶\n오래 즐겁게 일한다.\n두 번째 문장\n\n## 원칙\n- 건강\n* 관계\n\n마무리"), [
    { type: "heading", level: 1, text: "나의 삶" },
    { type: "paragraph", text: "오래 즐겁게 일한다.\n두 번째 문장" },
    { type: "heading", level: 2, text: "원칙" },
    { type: "list", items: ["건강", "관계"] },
    { type: "paragraph", text: "마무리" },
  ]);
});

test("keeps unsupported markdown and empty content safe as plain text", () => {
  assert.deepEqual(parseWorkspaceDirection("#### 그대로\n1. 번호 목록"), [
    { type: "paragraph", text: "#### 그대로\n1. 번호 목록" },
  ]);
  assert.deepEqual(parseWorkspaceDirection(" \n\n"), []);
});
