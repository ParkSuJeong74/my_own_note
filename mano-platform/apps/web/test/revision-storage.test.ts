import { describe, expect, it, vi } from "vitest";

import { MAX_PAGE_REVISIONS, REVISION_STORAGE_KEY, appendRevision, loadRevisions, saveRevisions } from "../lib/revision-storage";

describe("revision storage", () => {
  it("loads missing data as an empty map and round-trips revisions", () => {
    expect(loadRevisions({ getItem: () => null })).toEqual({ status: "empty", revisions: {} });
    const revisions = appendRevision({}, "page", "첫 버전", 10);
    const values = new Map<string, string>();
    saveRevisions({ setItem: (key, value) => void values.set(key, value) }, revisions);
    expect(loadRevisions({ getItem: (key) => values.get(key) ?? null })).toEqual({ status: "loaded", revisions });
    expect(values.has(REVISION_STORAGE_KEY)).toBe(true);
  });

  it("skips duplicate content, isolates pages and keeps the newest 50 entries", () => {
    let revisions = appendRevision({}, "one", "동일", 1);
    expect(appendRevision(revisions, "one", "동일", 2)).toBe(revisions);
    revisions = appendRevision(revisions, "two", "다른 페이지", 3);
    for (let index = 0; index < MAX_PAGE_REVISIONS + 2; index += 1) {
      revisions = appendRevision(revisions, "one", `버전 ${index}`, index + 10);
    }
    expect(revisions.one).toHaveLength(MAX_PAGE_REVISIONS);
    expect(revisions.one?.[0]?.text).toBe(`버전 ${MAX_PAGE_REVISIONS + 1}`);
    expect(revisions.two?.map((revision) => revision.text)).toEqual(["다른 페이지"]);
  });

  it.each([
    ["bad JSON", "{"],
    ["version", JSON.stringify({ version: 2, revisions: {} })],
    ["map", JSON.stringify({ version: 1, revisions: [] })],
    ["invalid revision", JSON.stringify({ version: 1, revisions: { page: [{ id: "x", createdAt: -1, text: "" }] } })],
    ["duplicate IDs", JSON.stringify({ version: 1, revisions: { page: [{ id: "x", createdAt: 1, text: "a" }, { id: "x", createdAt: 2, text: "b" }] } })],
  ])("recovers from invalid %s data", (_case, raw) => {
    expect(loadRevisions({ getItem: () => raw }).status).toBe("recovered");
  });

  it("recovers from blocked reads and surfaces write failures", () => {
    expect(loadRevisions({ getItem: () => { throw new DOMException("blocked", "SecurityError"); } }).status).toBe("recovered");
    const failure = new DOMException("quota", "QuotaExceededError");
    const setItem = vi.fn(() => { throw failure; });
    expect(() => saveRevisions({ setItem }, {})).toThrow(failure);
  });
});
