import { describe, expect, it } from "vitest";

import { BackupError, createBackup, parseBackup } from "../lib/workspace-backup";

const data = {
  tree: { nodes: [
    { id: "folder", kind: "folder" as const, title: "Folder", parentId: null, order: 0, trashed: true },
    { id: "page", kind: "page" as const, title: "Page", parentId: "folder", order: 0, trashed: false },
  ] },
  documents: { page: { id: "page", blocks: [{ id: "body", type: "paragraph" as const, text: "첫 줄\n둘째 줄" }] } },
};

describe("workspace backup", () => {
  it("round-trips tree, trash state and document text", () => {
    const backup = createBackup(data, new Date("2026-09-16T00:00:00.000Z"));
    expect(JSON.parse(backup)).toMatchObject({ version: 1, createdAt: "2026-09-16T00:00:00.000Z" });
    expect(parseBackup(backup)).toEqual(data);
  });

  it("supports a valid empty workspace", () => {
    const empty = { tree: { nodes: [] }, documents: {} };
    expect(parseBackup(createBackup(empty))).toEqual(empty);
  });

  it.each([
    ["JSON", "{"],
    ["version", JSON.stringify({ version: 9, createdAt: new Date().toISOString(), tree: { nodes: [] }, documents: {} })],
    ["timestamp", JSON.stringify({ version: 1, createdAt: "not-a-date", tree: { nodes: [] }, documents: {} })],
    ["tree", JSON.stringify({ version: 1, createdAt: new Date().toISOString(), tree: { nodes: [{ id: "x" }] }, documents: {} })],
    ["documents", JSON.stringify({ version: 1, createdAt: new Date().toISOString(), tree: { nodes: [] }, documents: [] })],
  ])("rejects invalid %s", (_case, backup) => {
    expect(() => parseBackup(backup)).toThrow(BackupError);
  });

  it("rejects documents that reference a missing page or folder", () => {
    const missing = { tree: { nodes: [] }, documents: data.documents };
    expect(() => parseBackup(createBackup(missing))).toThrow(/존재하지 않는 페이지/);
    const folder = {
      tree: { nodes: [{ id: "folder", kind: "folder" as const, title: "Folder", parentId: null, order: 0, trashed: false }] },
      documents: { folder: { id: "folder", blocks: [] } },
    };
    expect(() => parseBackup(createBackup(folder))).toThrow(/폴더/);
  });

  it("rejects an invalid backup creation date", () => {
    expect(() => createBackup(data, new Date("invalid"))).toThrow(BackupError);
  });
});
