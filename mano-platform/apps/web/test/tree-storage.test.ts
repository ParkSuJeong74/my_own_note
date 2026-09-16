import { describe, expect, it, vi } from "vitest";

import { TREE_STORAGE_KEY, loadTree, saveTree } from "../lib/tree-storage";

const validTree = {
  nodes: [{ id: "root", kind: "folder" as const, title: "Root", parentId: null, order: 0, trashed: false }],
};

describe("tree storage", () => {
  it("loads an absent snapshot as an empty workspace", () => {
    expect(loadTree({ getItem: () => null })).toEqual({ status: "empty", tree: { nodes: [] } });
  });

  it("round-trips a valid versioned tree", () => {
    const values = new Map<string, string>();
    saveTree({ setItem: (key, value) => void values.set(key, value) }, validTree);
    expect(loadTree({ getItem: (key) => values.get(key) ?? null })).toEqual({ status: "loaded", tree: validTree });
    expect(values.has(TREE_STORAGE_KEY)).toBe(true);
  });

  it.each([
    ["malformed JSON", "{"],
    ["unsupported version", JSON.stringify({ version: 2, tree: validTree })],
    ["malformed node", JSON.stringify({ version: 1, tree: { nodes: [{ id: "x" }] } })],
    ["duplicate IDs", JSON.stringify({ version: 1, tree: { nodes: [validTree.nodes[0], validTree.nodes[0]] } })],
    ["missing parent", JSON.stringify({ version: 1, tree: { nodes: [{ ...validTree.nodes[0], parentId: "missing" }] } })],
    ["non-contiguous order", JSON.stringify({ version: 1, tree: { nodes: [{ ...validTree.nodes[0], order: 3 }] } })],
  ])("recovers from %s", (_case, raw) => {
    const result = loadTree({ getItem: () => raw });
    expect(result.status).toBe("recovered");
    expect(result.tree).toEqual({ nodes: [] });
  });

  it("surfaces storage write exceptions", () => {
    const failure = new DOMException("quota", "QuotaExceededError");
    const setItem = vi.fn(() => { throw failure; });
    expect(() => saveTree({ setItem }, validTree)).toThrow(failure);
  });

  it("recovers when browser storage cannot be read", () => {
    const result = loadTree({ getItem: () => { throw new DOMException("blocked", "SecurityError"); } });
    expect(result.status).toBe("recovered");
    expect(result.tree).toEqual({ nodes: [] });
  });
});
