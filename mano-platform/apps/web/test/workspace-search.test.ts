import { describe, expect, it } from "vitest";

import { searchWorkspace } from "../lib/workspace-search";

const tree = {
  nodes: [
    { id: "folder", kind: "folder" as const, title: "소설", parentId: null, order: 0, trashed: false },
    { id: "chapter", kind: "page" as const, title: "Chapter One", parentId: "folder", order: 0, trashed: false },
    { id: "notes", kind: "page" as const, title: "메모", parentId: null, order: 1, trashed: false },
    { id: "trash", kind: "folder" as const, title: "비밀", parentId: null, order: 2, trashed: true },
    { id: "hidden", kind: "page" as const, title: "찾으면 안 됨", parentId: "trash", order: 0, trashed: false },
  ],
};
const documents = {
  chapter: { id: "chapter", blocks: [{ id: "a", type: "paragraph" as const, text: "Dragon arrives" }] },
  notes: { id: "notes", blocks: [
    { id: "a", type: "heading" as const, level: 2 as const, text: "아이디어" },
    { id: "b", type: "paragraph" as const, text: "두 번째 장면" },
  ] },
  hidden: { id: "hidden", blocks: [{ id: "a", type: "paragraph" as const, text: "숨겨진 본문" }] },
};

describe("workspace search", () => {
  it("finds normalized title matches in deterministic tree order", () => {
    expect(searchWorkspace(tree, documents, "  CHAPTER  ")).toEqual([
      { node: tree.nodes[1], matchedBy: "title" },
    ]);
    expect(searchWorkspace(tree, documents, "소설")).toEqual([
      { node: tree.nodes[0], matchedBy: "title" },
    ]);
  });

  it("finds text across page blocks", () => {
    expect(searchWorkspace(tree, documents, "dragon")[0]).toMatchObject({ matchedBy: "body", node: { id: "chapter" } });
    expect(searchWorkspace(tree, documents, "두 번째")[0]).toMatchObject({ matchedBy: "body", node: { id: "notes" } });
  });

  it("prefers a title reason when both title and body match", () => {
    const both = { ...documents, notes: { ...documents.notes, blocks: [{ id: "x", type: "paragraph" as const, text: "메모" }] } };
    expect(searchWorkspace(tree, both, "메모")[0]?.matchedBy).toBe("title");
  });

  it("excludes directly and indirectly trashed nodes and bodies", () => {
    expect(searchWorkspace(tree, documents, "비밀")).toEqual([]);
    expect(searchWorkspace(tree, documents, "숨겨진")).toEqual([]);
    expect(searchWorkspace(tree, documents, "찾으면")).toEqual([]);
  });

  it("returns no results for an empty query or missing text", () => {
    expect(searchWorkspace(tree, documents, "   ")).toEqual([]);
    expect(searchWorkspace(tree, documents, "없는 검색어")).toEqual([]);
  });
});
