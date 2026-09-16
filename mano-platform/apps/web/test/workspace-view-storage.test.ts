import { describe, expect, it } from "vitest";

import {
  WORKSPACE_VIEW_STORAGE_KEY,
  loadWorkspaceView,
  saveWorkspaceView,
} from "../lib/workspace-view-storage";

describe("workspace view storage", () => {
  it("returns an empty view when none is stored", () => {
    expect(loadWorkspaceView(window.localStorage)).toEqual({
      status: "empty",
      view: { openTabIds: [], activeTabId: null },
    });
  });

  it("round-trips tab order and the active tab", () => {
    saveWorkspaceView(window.localStorage, { openTabIds: ["one", "two"], activeTabId: "one" });
    expect(loadWorkspaceView(window.localStorage)).toEqual({
      status: "loaded",
      view: { openTabIds: ["one", "two"], activeTabId: "one" },
    });
  });

  it("recovers malformed and duplicate tab data", () => {
    window.localStorage.setItem(WORKSPACE_VIEW_STORAGE_KEY, JSON.stringify({
      version: 1,
      view: { openTabIds: ["same", "same"], activeTabId: "same" },
    }));
    expect(loadWorkspaceView(window.localStorage)).toMatchObject({ status: "recovered", view: { openTabIds: [] } });
  });

  it("surfaces storage write exceptions", () => {
    const storage = { setItem: () => { throw new DOMException("quota", "QuotaExceededError"); } };
    expect(() => saveWorkspaceView(storage, { openTabIds: [], activeTabId: null })).toThrow("quota");
  });
});
