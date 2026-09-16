import { describe, expect, it } from "vitest";

import { collectPageReferences, extractReferenceTitles } from "../lib/workspace-references";

describe("workspace references", () => {
  it("extracts trimmed, unique wiki reference titles", () => {
    expect(extractReferenceTitles("[[ 계획 ]] [[계획]] [[다음 문서]] [[]] [[줄\n바꿈]]")).toEqual(["계획", "다음 문서"]);
  });

  it("resolves unique active titles, derives backlinks and leaves ambiguous titles unresolved", () => {
    const tree = { nodes: [
      { id: "current", kind: "page" as const, title: "현재", parentId: null, order: 0, trashed: false },
      { id: "target", kind: "page" as const, title: "대상", parentId: null, order: 1, trashed: false },
      { id: "back", kind: "page" as const, title: "역링크", parentId: null, order: 2, trashed: false },
      { id: "dup1", kind: "page" as const, title: "중복", parentId: null, order: 3, trashed: false },
      { id: "dup2", kind: "page" as const, title: "중복", parentId: null, order: 4, trashed: false },
      { id: "gone", kind: "page" as const, title: "삭제됨", parentId: null, order: 5, trashed: true },
    ] };
    const documents = {
      current: { id: "current", blocks: [{ id: "a", type: "paragraph" as const, text: "[[대상]] [[중복]] [[없음]] [[삭제됨]]" }] },
      target: { id: "target", blocks: [] },
      back: { id: "back", blocks: [{ id: "b", type: "paragraph" as const, text: "[[현재]]" }] },
      dup1: { id: "dup1", blocks: [] }, dup2: { id: "dup2", blocks: [] }, gone: { id: "gone", blocks: [] },
    };
    const result = collectPageReferences(tree, documents, "current");
    expect(result.outgoing.map((page) => page.id)).toEqual(["target"]);
    expect(result.backlinks.map((page) => page.id)).toEqual(["back"]);
    expect(result.unresolved).toEqual(["중복", "없음", "삭제됨"]);
  });
});
