import assert from "node:assert/strict";
import test from "node:test";
import { normalizeWorkspaceDirection, workspaceDirectionMaxLength } from "../src/lib/workspace-direction.ts";

test("normalizes multiline Workspace direction text", () => {
  assert.equal(normalizeWorkspaceDirection("  첫 번째 방향\r\n두 번째 방향  "), "첫 번째 방향\n두 번째 방향");
  assert.equal(normalizeWorkspaceDirection("   \n"), "");
});

test("accepts the direction length boundary and rejects overflow", () => {
  assert.equal(normalizeWorkspaceDirection("가".repeat(workspaceDirectionMaxLength))?.length, workspaceDirectionMaxLength);
  assert.equal(normalizeWorkspaceDirection("가".repeat(workspaceDirectionMaxLength + 1)), null);
});
