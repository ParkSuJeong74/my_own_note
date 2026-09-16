export type HeadingLevel = 1 | 2 | 3;

interface BaseBlock {
  readonly id: string;
  readonly text: string;
}

export interface ParagraphBlock extends BaseBlock {
  readonly type: "paragraph";
}

export interface HeadingBlock extends BaseBlock {
  readonly type: "heading";
  readonly level: HeadingLevel;
}

export interface ChecklistBlock extends BaseBlock {
  readonly type: "checklist";
  readonly checked: boolean;
}

export type DocumentBlock = ParagraphBlock | HeadingBlock | ChecklistBlock;

export interface DocumentState {
  readonly id: string;
  readonly blocks: ReadonlyArray<DocumentBlock>;
}

export type DocumentErrorCode =
  | "BLOCK_INDEX_OUT_OF_RANGE"
  | "BLOCK_NOT_FOUND"
  | "DUPLICATE_BLOCK_ID"
  | "EMPTY_BLOCK_ID"
  | "EMPTY_DOCUMENT_ID"
  | "INVALID_BLOCK_OPERATION"
  | "INVALID_HEADING_LEVEL";

export class DocumentError extends Error {
  public constructor(
    public readonly code: DocumentErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DocumentError";
  }
}

export type NewBlock =
  | { readonly id: string; readonly type: "paragraph"; readonly text?: string }
  | { readonly id: string; readonly type: "heading"; readonly text?: string; readonly level: HeadingLevel }
  | { readonly id: string; readonly type: "checklist"; readonly text?: string; readonly checked?: boolean };

export type BlockConversion =
  | { readonly type: "paragraph" }
  | { readonly type: "heading"; readonly level: HeadingLevel }
  | { readonly type: "checklist"; readonly checked?: boolean };

function requiredId(value: string, code: "EMPTY_DOCUMENT_ID" | "EMPTY_BLOCK_ID"): string {
  const id = value.trim();
  if (id.length === 0) {
    throw new DocumentError(code, code === "EMPTY_DOCUMENT_ID" ? "Document ID is required." : "Block ID is required.");
  }
  return id;
}

function assertHeadingLevel(level: number): asserts level is HeadingLevel {
  if (level !== 1 && level !== 2 && level !== 3) {
    throw new DocumentError("INVALID_HEADING_LEVEL", `Heading level '${level}' is not supported.`);
  }
}

function requireBlock(document: DocumentState, blockId: string): DocumentBlock {
  const block = document.blocks.find((candidate) => candidate.id === blockId);
  if (!block) throw new DocumentError("BLOCK_NOT_FOUND", `Block '${blockId}' was not found.`);
  return block;
}

function assertIndex(index: number, maximum: number): void {
  if (!Number.isInteger(index) || index < 0 || index > maximum) {
    throw new DocumentError("BLOCK_INDEX_OUT_OF_RANGE", `Block index '${index}' is outside the allowed range.`);
  }
}

function materializeBlock(input: NewBlock): DocumentBlock {
  const id = requiredId(input.id, "EMPTY_BLOCK_ID");
  const text = input.text ?? "";
  if (input.type === "paragraph") return { id, type: "paragraph", text };
  if (input.type === "heading") {
    assertHeadingLevel(input.level);
    return { id, type: "heading", text, level: input.level };
  }
  return { id, type: "checklist", text, checked: input.checked ?? false };
}

export function createDocument(id: string): DocumentState {
  return { id: requiredId(id, "EMPTY_DOCUMENT_ID"), blocks: [] };
}

export function insertBlock(document: DocumentState, index: number, input: NewBlock): DocumentState {
  assertIndex(index, document.blocks.length);
  const block = materializeBlock(input);
  if (document.blocks.some((candidate) => candidate.id === block.id)) {
    throw new DocumentError("DUPLICATE_BLOCK_ID", `Block '${block.id}' already exists.`);
  }
  return {
    ...document,
    blocks: [...document.blocks.slice(0, index), block, ...document.blocks.slice(index)],
  };
}

export function updateBlockText(document: DocumentState, blockId: string, text: string): DocumentState {
  requireBlock(document, blockId);
  return {
    ...document,
    blocks: document.blocks.map((block) => block.id === blockId ? { ...block, text } : block),
  };
}

export function convertBlock(
  document: DocumentState,
  blockId: string,
  conversion: BlockConversion,
): DocumentState {
  const current = requireBlock(document, blockId);
  let replacement: DocumentBlock;
  if (conversion.type === "paragraph") {
    replacement = { id: current.id, type: "paragraph", text: current.text };
  } else if (conversion.type === "heading") {
    assertHeadingLevel(conversion.level);
    replacement = { id: current.id, type: "heading", text: current.text, level: conversion.level };
  } else {
    replacement = {
      id: current.id,
      type: "checklist",
      text: current.text,
      checked: conversion.checked ?? false,
    };
  }
  return {
    ...document,
    blocks: document.blocks.map((block) => block.id === blockId ? replacement : block),
  };
}

export function toggleChecklist(document: DocumentState, blockId: string): DocumentState {
  const block = requireBlock(document, blockId);
  if (block.type !== "checklist") {
    throw new DocumentError("INVALID_BLOCK_OPERATION", `Block '${blockId}' is not a checklist.`);
  }
  return {
    ...document,
    blocks: document.blocks.map((candidate) =>
      candidate.id === blockId ? { ...block, checked: !block.checked } : candidate,
    ),
  };
}

export function removeBlock(document: DocumentState, blockId: string): DocumentState {
  requireBlock(document, blockId);
  return { ...document, blocks: document.blocks.filter((block) => block.id !== blockId) };
}

export function reorderBlock(document: DocumentState, blockId: string, targetIndex: number): DocumentState {
  const block = requireBlock(document, blockId);
  assertIndex(targetIndex, document.blocks.length - 1);
  const reordered = document.blocks.filter((candidate) => candidate.id !== blockId);
  reordered.splice(targetIndex, 0, block);
  return { ...document, blocks: reordered };
}
