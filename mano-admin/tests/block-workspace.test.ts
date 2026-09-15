import assert from "node:assert/strict";
import test from "node:test";
import { assertValidWorkspaceParent, buildWorkspacePageTree, nextWorkspaceVersion, validateWorkspaceBlockContent } from "../src/lib/block-workspace.ts";

test("validates every initial editable block content shape", () => {
  assert.deepEqual(validateWorkspaceBlockContent("PARAGRAPH", { text: "hello" }), { text: "hello" });
  assert.deepEqual(validateWorkspaceBlockContent("HEADING", { text: "Title", level: 2 }), { text: "Title", level: 2 });
  assert.deepEqual(validateWorkspaceBlockContent("TODO", { text: "Reply", checked: false }), { text: "Reply", checked: false });
  assert.deepEqual(validateWorkspaceBlockContent("CALLOUT", { text: "Remember", color: "yellow" }), { text: "Remember", color: "yellow" });
  assert.deepEqual(validateWorkspaceBlockContent("DIVIDER", {}), {});
  assert.deepEqual(validateWorkspaceBlockContent("CHILD_PAGE", { pageId: "550e8400-e29b-41d4-a716-446655440000" }), { pageId: "550e8400-e29b-41d4-a716-446655440000" });
});

test("rejects malformed, oversized, and unexpected block content", () => {
  assert.throws(() => validateWorkspaceBlockContent("TODO", { text: "x", checked: "yes" }));
  assert.throws(() => validateWorkspaceBlockContent("HEADING", { text: "x", level: 4 }));
  assert.throws(() => validateWorkspaceBlockContent("PARAGRAPH", { text: "x".repeat(20_001) }));
  assert.throws(() => validateWorkspaceBlockContent("DIVIDER", { text: "hidden" }));
  assert.throws(() => validateWorkspaceBlockContent("CHILD_PAGE", { pageId: "not-a-page" }));
});

test("optimistic versions advance once and reject stale writes", () => {
  assert.equal(nextWorkspaceVersion(3, 3), 4);
  assert.throws(() => nextWorkspaceVersion(3, 2), /changed elsewhere/);
  assert.throws(() => nextWorkspaceVersion(0, 0), /Stored version/);
});

test("page hierarchy rejects self and descendant moves", () => {
  assert.doesNotThrow(() => assertValidWorkspaceParent("page-a", "page-b", ["root"]));
  assert.throws(() => assertValidWorkspaceParent("page-a", "page-a"));
  assert.throws(() => assertValidWorkspaceParent("page-a", "page-c", ["page-a", "page-b"]));
});

test("page tree nests known children and preserves orphaned pages", () => {
  const tree = buildWorkspacePageTree([
    { id: "child", parentId: "root", title: "Child" },
    { id: "root", parentId: null, title: "Root" },
    { id: "orphan", parentId: "missing", title: "Orphan" },
  ]);
  assert.deepEqual(tree.map(node => [node.id, node.children.map(child => child.id)]), [["root", ["child"]], ["orphan", []]]);
});
