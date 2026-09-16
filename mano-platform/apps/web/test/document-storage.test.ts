import { describe, expect, it, vi } from "vitest";

import { DOCUMENT_STORAGE_KEY, loadDocuments, saveDocuments } from "../lib/document-storage";

const documents = {
  page: { id: "page", blocks: [{ id: "body", type: "paragraph" as const, text: "내용\n둘째 줄" }] },
};

describe("document storage", () => {
  it("loads missing data as an empty map", () => {
    expect(loadDocuments({ getItem: () => null })).toEqual({ status: "empty", documents: {} });
  });

  it("round-trips documents without changing text", () => {
    const values = new Map<string, string>();
    saveDocuments({ setItem: (key, value) => void values.set(key, value) }, documents);
    expect(loadDocuments({ getItem: (key) => values.get(key) ?? null })).toEqual({ status: "loaded", documents });
    expect(values.has(DOCUMENT_STORAGE_KEY)).toBe(true);
  });

  it.each([
    ["bad JSON", "{"],
    ["version", JSON.stringify({ version: 2, documents })],
    ["map", JSON.stringify({ version: 1, documents: [] })],
    ["mismatched ID", JSON.stringify({ version: 1, documents: { other: documents.page } })],
    ["duplicate blocks", JSON.stringify({ version: 1, documents: { page: { id: "page", blocks: [documents.page.blocks[0], documents.page.blocks[0]] } } })],
    ["invalid block", JSON.stringify({ version: 1, documents: { page: { id: "page", blocks: [{ id: "x", type: "video", text: "" }] } } })],
  ])("recovers from invalid %s data", (_case, raw) => {
    const result = loadDocuments({ getItem: () => raw });
    expect(result.status).toBe("recovered");
    expect(result.documents).toEqual({});
  });

  it("recovers from blocked reads and surfaces write failures", () => {
    expect(loadDocuments({ getItem: () => { throw new DOMException("blocked", "SecurityError"); } }).status).toBe("recovered");
    const failure = new DOMException("quota", "QuotaExceededError");
    const setItem = vi.fn(() => { throw failure; });
    expect(() => saveDocuments({ setItem }, documents)).toThrow(failure);
  });
});
