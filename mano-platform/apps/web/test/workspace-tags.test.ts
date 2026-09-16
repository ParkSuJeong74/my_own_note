import { describe, expect, it } from "vitest";

import { collectWorkspaceTags, extractTags } from "../lib/workspace-tags";

describe("workspace tags", () => {
  it("extracts unique inline Unicode tags without treating Markdown headings as tags", () => {
    expect(extractTags("# 제목\n본문 #개발 #Dev #개발\n- #할_일 #two-words")).toEqual(["개발", "Dev", "할_일", "two-words"]);
  });

  it("collects normalized page counts and excludes trashed pages", () => {
    const tree = { nodes: [
      { id: "one", kind: "page" as const, title: "하나", parentId: null, order: 0, trashed: false },
      { id: "two", kind: "page" as const, title: "둘", parentId: null, order: 1, trashed: false },
      { id: "gone", kind: "page" as const, title: "삭제", parentId: null, order: 2, trashed: true },
    ] };
    const documents = {
      one: { id: "one", blocks: [{ id: "a", type: "paragraph" as const, text: "#Dev #개인" }] },
      two: { id: "two", blocks: [{ id: "b", type: "paragraph" as const, text: "#dev" }] },
      gone: { id: "gone", blocks: [{ id: "c", type: "paragraph" as const, text: "#숨김" }] },
    };
    expect(collectWorkspaceTags(tree, documents)).toEqual([
      { key: "dev", label: "Dev", pageIds: ["one", "two"] },
      { key: "개인", label: "개인", pageIds: ["one"] },
    ]);
  });
});
