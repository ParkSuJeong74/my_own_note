import { describe, expect, it } from "vitest";

import {
  DocumentError,
  convertBlock,
  createDocument,
  insertBlock,
  removeBlock,
  reorderBlock,
  toggleChecklist,
  updateBlockText,
  type DocumentState,
} from "../src/document.js";

function expectCode(operation: () => unknown, code: DocumentError["code"]): void {
  try {
    operation();
  } catch (error) {
    expect(error).toBeInstanceOf(DocumentError);
    expect((error as DocumentError).code).toBe(code);
    return;
  }
  throw new Error(`Expected ${code}.`);
}

function populatedDocument(): DocumentState {
  const empty = createDocument("document");
  const paragraph = insertBlock(empty, 0, { id: "p", type: "paragraph", text: "Paragraph" });
  const heading = insertBlock(paragraph, 0, { id: "h", type: "heading", level: 2, text: "Heading" });
  return insertBlock(heading, 2, { id: "c", type: "checklist", text: "Task" });
}

describe("document blocks", () => {
  it("creates an empty document and inserts each supported block at ordered positions", () => {
    const document = populatedDocument();

    expect(document).toEqual({
      id: "document",
      blocks: [
        { id: "h", type: "heading", level: 2, text: "Heading" },
        { id: "p", type: "paragraph", text: "Paragraph" },
        { id: "c", type: "checklist", checked: false, text: "Task" },
      ],
    });
  });

  it("updates text without changing block identity or type", () => {
    const document = populatedDocument();
    const updated = updateBlockText(document, "h", "Changed");

    expect(updated.blocks[0]).toEqual({ id: "h", type: "heading", level: 2, text: "Changed" });
    expect(document.blocks[0]).toEqual({ id: "h", type: "heading", level: 2, text: "Heading" });
  });

  it("converts blocks while preserving identity and text", () => {
    const document = populatedDocument();
    const checklist = convertBlock(document, "p", { type: "checklist", checked: true });
    const heading = convertBlock(checklist, "p", { type: "heading", level: 3 });
    const paragraph = convertBlock(heading, "p", { type: "paragraph" });

    expect(checklist.blocks[1]).toEqual({ id: "p", type: "checklist", text: "Paragraph", checked: true });
    expect(heading.blocks[1]).toEqual({ id: "p", type: "heading", text: "Paragraph", level: 3 });
    expect(paragraph.blocks[1]).toEqual({ id: "p", type: "paragraph", text: "Paragraph" });
  });

  it("toggles checklist completion and rejects other block types", () => {
    const document = populatedDocument();
    const checked = toggleChecklist(document, "c");
    const unchecked = toggleChecklist(checked, "c");

    expect(checked.blocks[2]).toMatchObject({ checked: true });
    expect(unchecked.blocks[2]).toMatchObject({ checked: false });
    expectCode(() => toggleChecklist(document, "p"), "INVALID_BLOCK_OPERATION");
  });

  it("reorders and removes blocks including the final remaining block", () => {
    const document = populatedDocument();
    const reordered = reorderBlock(document, "c", 0);
    expect(reordered.blocks.map((block) => block.id)).toEqual(["c", "h", "p"]);

    const one = removeBlock(removeBlock(reordered, "h"), "p");
    const empty = removeBlock(one, "c");
    expect(empty.blocks).toEqual([]);
  });

  it("accepts a no-op reorder without changing content", () => {
    const document = populatedDocument();
    expect(reorderBlock(document, "p", 1)).toEqual(document);
  });

  it("rejects empty and duplicate IDs", () => {
    expectCode(() => createDocument(" "), "EMPTY_DOCUMENT_ID");
    const document = populatedDocument();
    expectCode(() => insertBlock(document, 0, { id: " ", type: "paragraph" }), "EMPTY_BLOCK_ID");
    expectCode(() => insertBlock(document, 0, { id: "p", type: "paragraph" }), "DUPLICATE_BLOCK_ID");
  });

  it("rejects invalid indices and heading levels", () => {
    const document = populatedDocument();
    expectCode(() => insertBlock(document, -1, { id: "new", type: "paragraph" }), "BLOCK_INDEX_OUT_OF_RANGE");
    expectCode(() => insertBlock(document, 4, { id: "new", type: "paragraph" }), "BLOCK_INDEX_OUT_OF_RANGE");
    expectCode(() => reorderBlock(document, "p", 3), "BLOCK_INDEX_OUT_OF_RANGE");
    expectCode(
      () => insertBlock(document, 0, { id: "bad", type: "heading", level: 4 as 1 }),
      "INVALID_HEADING_LEVEL",
    );
  });

  it("rejects operations for missing blocks", () => {
    const document = populatedDocument();
    expectCode(() => updateBlockText(document, "missing", "Text"), "BLOCK_NOT_FOUND");
    expectCode(() => convertBlock(document, "missing", { type: "paragraph" }), "BLOCK_NOT_FOUND");
    expectCode(() => removeBlock(document, "missing"), "BLOCK_NOT_FOUND");
    expectCode(() => reorderBlock(document, "missing", 0), "BLOCK_NOT_FOUND");
  });

  it("does not mutate input on successful or failed commands", () => {
    const document = populatedDocument();
    const snapshot = structuredClone(document);
    const updated = updateBlockText(document, "p", "New");

    expect(updated).not.toBe(document);
    expect(document).toEqual(snapshot);
    expectCode(() => removeBlock(document, "missing"), "BLOCK_NOT_FOUND");
    expect(document).toEqual(snapshot);
  });
});
