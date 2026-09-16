import { describe, expect, it } from "vitest";

import {
  PageTreeError,
  createNode,
  deleteNodePermanently,
  isNodeInTrash,
  moveNode,
  reorderNode,
  renameNode,
  restoreNode,
  trashNode,
  type PageTreeState,
} from "../src/index.js";

const empty: PageTreeState = { nodes: [] };

function expectCode(operation: () => unknown, code: PageTreeError["code"]): void {
  try {
    operation();
  } catch (error) {
    expect(error).toBeInstanceOf(PageTreeError);
    expect((error as PageTreeError).code).toBe(code);
    return;
  }
  throw new Error(`Expected ${code}.`);
}

describe("page tree", () => {
  it("creates root and nested folders and pages while trimming user text", () => {
    const root = createNode(empty, { id: " root ", kind: "folder", title: " Workspace " });
    const chapter = createNode(root, { id: "chapter", kind: "folder", title: "Chapter", parentId: "root" });
    const page = createNode(chapter, { id: "draft", kind: "page", title: " Draft ", parentId: "chapter" });

    expect(page.nodes).toEqual([
      { id: "root", kind: "folder", title: "Workspace", parentId: null, order: 0, trashed: false },
      { id: "chapter", kind: "folder", title: "Chapter", parentId: "root", order: 0, trashed: false },
      { id: "draft", kind: "page", title: "Draft", parentId: "chapter", order: 0, trashed: false },
    ]);
  });

  it("renames and moves nodes to a folder or the root", () => {
    const withFolders = createNode(createNode(empty,
      { id: "a", kind: "folder", title: "A" }),
      { id: "b", kind: "folder", title: "B" });
    const withPage = createNode(withFolders, { id: "p", kind: "page", title: "Old", parentId: "a" });

    const moved = moveNode(renameNode(withPage, "p", " New "), "p", "b");
    const rooted = moveNode(moved, "p", null);

    expect(moved.nodes.find((node) => node.id === "p")).toEqual(
      { id: "p", kind: "page", title: "New", parentId: "b", order: 0, trashed: false },
    );
    expect(rooted.nodes.find((node) => node.id === "p")?.parentId).toBeNull();
  });

  it("trashes and restores pages and complete folder visibility", () => {
    const root = createNode(empty, { id: "root", kind: "folder", title: "Root" });
    const page = createNode(root, { id: "page", kind: "page", title: "Page", parentId: "root" });
    const trashed = trashNode(page, "root");

    expect(isNodeInTrash(trashed, "root")).toBe(true);
    expect(isNodeInTrash(trashed, "page")).toBe(true);

    const restored = restoreNode(trashed, "root");
    expect(isNodeInTrash(restored, "root")).toBe(false);
    expect(isNodeInTrash(restored, "page")).toBe(false);
  });

  it("preserves an independently trashed child when its parent is restored", () => {
    const root = createNode(empty, { id: "root", kind: "folder", title: "Root" });
    const page = createNode(root, { id: "page", kind: "page", title: "Page", parentId: "root" });
    const childTrashed = trashNode(page, "page");
    const allTrashed = trashNode(childTrashed, "root");
    const parentRestored = restoreNode(allTrashed, "root");

    expect(isNodeInTrash(parentRestored, "root")).toBe(false);
    expect(isNodeInTrash(parentRestored, "page")).toBe(true);
  });

  it("permanently deletes only directly trashed nodes and their deep descendants", () => {
    const root = createNode(empty, { id: "root", kind: "folder", title: "Root" });
    const child = createNode(root, { id: "child", kind: "folder", title: "Child", parentId: "root" });
    const deep = createNode(child, { id: "deep", kind: "page", title: "Deep", parentId: "child" });
    const other = createNode(deep, { id: "other", kind: "page", title: "Other" });

    expectCode(() => deleteNodePermanently(other, "root"), "NODE_NOT_TRASHED");
    const deleted = deleteNodePermanently(trashNode(other, "root"), "root");
    expect(deleted.nodes).toEqual([
      { id: "other", kind: "page", title: "Other", parentId: null, order: 0, trashed: false },
    ]);
  });

  it("blocks editing, moving and restoring nodes hidden by a trashed ancestor", () => {
    const root = createNode(empty, { id: "root", kind: "folder", title: "Root" });
    const child = createNode(root, { id: "child", kind: "folder", title: "Child", parentId: "root" });
    const page = createNode(child, { id: "page", kind: "page", title: "Page", parentId: "child" });
    const trashed = trashNode(page, "root");

    expectCode(() => renameNode(trashed, "page", "Changed"), "NODE_IN_TRASH");
    expectCode(() => moveNode(trashed, "page", null), "NODE_IN_TRASH");
    expectCode(() => restoreNode(trashed, "page"), "NODE_NOT_TRASHED");
    expectCode(() => createNode(trashed, { id: "new", kind: "page", title: "New", parentId: "child" }), "NODE_IN_TRASH");
  });

  it("blocks moving active content into a trashed folder", () => {
    const folder = createNode(empty, { id: "folder", kind: "folder", title: "Folder" });
    const page = createNode(folder, { id: "page", kind: "page", title: "Page" });
    const trashedFolder = trashNode(page, "folder");

    expectCode(() => moveNode(trashedFolder, "page", "folder"), "NODE_IN_TRASH");
  });

  it("requires restoring a trashed ancestor before a directly trashed child", () => {
    const root = createNode(empty, { id: "root", kind: "folder", title: "Root" });
    const page = createNode(root, { id: "page", kind: "page", title: "Page", parentId: "root" });
    const childTrashed = trashNode(page, "page");
    const allTrashed = trashNode(childTrashed, "root");

    expectCode(() => restoreNode(allTrashed, "page"), "NODE_IN_TRASH");
  });

  it("keeps trash lifecycle operations immutable on success and failure", () => {
    const state = createNode(empty, { id: "page", kind: "page", title: "Page" });
    const snapshot = structuredClone(state);
    const trashed = trashNode(state, "page");

    expect(state).toEqual(snapshot);
    expect(trashed).not.toBe(state);
    expectCode(() => deleteNodePermanently(state, "page"), "NODE_NOT_TRASHED");
    expect(state).toEqual(snapshot);
    expect(restoreNode(trashed, "page")).toEqual(state);
  });

  it("rejects invalid identity, title, lookup and parent operations", () => {
    const folder = createNode(empty, { id: "folder", kind: "folder", title: "Folder" });
    const page = createNode(folder, { id: "page", kind: "page", title: "Page" });

    expectCode(() => createNode(empty, { id: " ", kind: "page", title: "Page" }), "EMPTY_NODE_ID");
    expectCode(() => createNode(empty, { id: "page", kind: "page", title: " " }), "EMPTY_NODE_TITLE");
    expectCode(() => createNode(page, { id: "page", kind: "page", title: "Again" }), "DUPLICATE_NODE_ID");
    expectCode(() => createNode(page, { id: "child", kind: "page", title: "Child", parentId: "missing" }), "PARENT_NOT_FOUND");
    expectCode(() => createNode(page, { id: "child", kind: "page", title: "Child", parentId: "page" }), "INVALID_PARENT_KIND");
    expectCode(() => renameNode(page, "missing", "Title"), "NODE_NOT_FOUND");
    expectCode(() => moveNode(page, "missing", null), "NODE_NOT_FOUND");
  });

  it("rejects moving a folder into itself or any depth of descendants", () => {
    const root = createNode(empty, { id: "root", kind: "folder", title: "Root" });
    const child = createNode(root, { id: "child", kind: "folder", title: "Child", parentId: "root" });
    const deep = createNode(child, { id: "deep", kind: "folder", title: "Deep", parentId: "child" });

    expectCode(() => moveNode(deep, "root", "root"), "MOVE_CYCLE");
    expectCode(() => moveNode(deep, "root", "deep"), "MOVE_CYCLE");
  });

  it("never mutates the input state on success or failure", () => {
    const state = createNode(empty, { id: "root", kind: "folder", title: "Root" });
    const snapshot = structuredClone(state);
    const next = createNode(state, { id: "page", kind: "page", title: "Page", parentId: "root" });

    expect(state).toEqual(snapshot);
    expect(next).not.toBe(state);
    expectCode(() => moveNode(state, "root", "root"), "MOVE_CYCLE");
    expect(state).toEqual(snapshot);
  });

  it("appends new siblings and reorders first, middle and last positions", () => {
    const one = createNode(empty, { id: "one", kind: "page", title: "One" });
    const two = createNode(one, { id: "two", kind: "page", title: "Two" });
    const three = createNode(two, { id: "three", kind: "page", title: "Three" });

    expect(three.nodes.map((node) => node.order)).toEqual([0, 1, 2]);
    const first = reorderNode(three, "three", 0);
    expect([...first.nodes].sort((a, b) => a.order - b.order).map((node) => node.id))
      .toEqual(["three", "one", "two"]);
    const middle = reorderNode(first, "three", 1);
    expect([...middle.nodes].sort((a, b) => a.order - b.order).map((node) => node.id))
      .toEqual(["one", "three", "two"]);
    const last = reorderNode(middle, "three", 2);
    expect([...last.nodes].sort((a, b) => a.order - b.order).map((node) => node.id))
      .toEqual(["one", "two", "three"]);
  });

  it("moves to the target end and compacts the source sibling order", () => {
    const source = createNode(empty, { id: "source", kind: "folder", title: "Source" });
    const target = createNode(source, { id: "target", kind: "folder", title: "Target" });
    const one = createNode(target, { id: "one", kind: "page", title: "One", parentId: "source" });
    const two = createNode(one, { id: "two", kind: "page", title: "Two", parentId: "source" });
    const existing = createNode(two, { id: "existing", kind: "page", title: "Existing", parentId: "target" });
    const moved = moveNode(existing, "one", "target");

    expect(moved.nodes.find((node) => node.id === "two")?.order).toBe(0);
    expect(moved.nodes.find((node) => node.id === "existing")?.order).toBe(0);
    expect(moved.nodes.find((node) => node.id === "one")?.order).toBe(1);
  });

  it("rejects invalid reorder indices, missing nodes and trash contents", () => {
    const one = createNode(empty, { id: "one", kind: "page", title: "One" });
    const two = createNode(one, { id: "two", kind: "page", title: "Two" });

    expectCode(() => reorderNode(two, "one", -1), "REORDER_INDEX_OUT_OF_RANGE");
    expectCode(() => reorderNode(two, "one", 2), "REORDER_INDEX_OUT_OF_RANGE");
    expectCode(() => reorderNode(two, "one", 0.5), "REORDER_INDEX_OUT_OF_RANGE");
    expectCode(() => reorderNode(two, "missing", 0), "NODE_NOT_FOUND");
    expectCode(() => reorderNode(trashNode(two, "one"), "one", 1), "NODE_IN_TRASH");
  });

  it("handles a single sibling reorder without mutating prior state", () => {
    const state = createNode(empty, { id: "only", kind: "page", title: "Only" });
    const snapshot = structuredClone(state);
    const reordered = reorderNode(state, "only", 0);

    expect(reordered).toEqual(state);
    expect(state).toEqual(snapshot);
  });
});
