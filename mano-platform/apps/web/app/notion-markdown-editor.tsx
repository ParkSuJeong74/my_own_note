"use client";

import { type ClipboardEvent, type KeyboardEvent, useRef } from "react";

type BlockKind = "paragraph" | "heading-1" | "heading-2" | "heading-3" | "quote" | "bullet" | "numbered" | "checklist";

interface ParsedLine {
  readonly kind: BlockKind;
  readonly prefix: string;
  readonly text: string;
  readonly checked: boolean;
}

const shortcuts: Readonly<Record<string, Pick<ParsedLine, "kind" | "prefix">>> = {
  "#": { kind: "heading-1", prefix: "# " },
  "##": { kind: "heading-2", prefix: "## " },
  "###": { kind: "heading-3", prefix: "### " },
  ">": { kind: "quote", prefix: "> " },
  "-": { kind: "bullet", prefix: "- " },
  "*": { kind: "bullet", prefix: "- " },
  "1.": { kind: "numbered", prefix: "1. " },
  "- [ ]": { kind: "checklist", prefix: "- [ ] " },
  "[]": { kind: "checklist", prefix: "- [ ] " },
};

export function parseMarkdownLine(line: string): ParsedLine {
  const checklist = /^- \[([ xX])\] (.*)$/.exec(line);
  if (checklist) return { kind: "checklist", prefix: `- [${(checklist[1] ?? " ").toLowerCase()}] `, text: checklist[2] ?? "", checked: (checklist[1] ?? "").toLowerCase() === "x" };
  const heading = /^(#{1,3}) (.*)$/.exec(line);
  if (heading) return { kind: `heading-${(heading[1] ?? "#").length}` as BlockKind, prefix: `${heading[1]} `, text: heading[2] ?? "", checked: false };
  const quote = /^> (.*)$/.exec(line);
  if (quote) return { kind: "quote", prefix: "> ", text: quote[1] ?? "", checked: false };
  const bullet = /^[-*] (.*)$/.exec(line);
  if (bullet) return { kind: "bullet", prefix: "- ", text: bullet[1] ?? "", checked: false };
  const numbered = /^\d+\. (.*)$/.exec(line);
  if (numbered) return { kind: "numbered", prefix: `${line.match(/^\d+/)?.[0] ?? "1"}. `, text: numbered[1] ?? "", checked: false };
  return { kind: "paragraph", prefix: "", text: line, checked: false };
}

function replaceLine(source: string, index: number, replacement: readonly string[]): string {
  const lines = source.split("\n");
  lines.splice(index, 1, ...replacement);
  return lines.join("\n");
}

function continuationPrefix(block: ParsedLine): string {
  if (block.kind === "bullet") return "- ";
  if (block.kind === "checklist") return "- [ ] ";
  if (block.kind === "numbered") return `${Number.parseInt(block.prefix, 10) + 1}. `;
  if (block.kind === "quote") return "> ";
  return "";
}

interface NotionMarkdownEditorProps {
  readonly source: string;
  readonly disabled?: boolean;
  readonly label: string;
  readonly onChange: (source: string) => void;
}

export function NotionMarkdownEditor({ source, disabled = false, label, onChange }: NotionMarkdownEditorProps) {
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);
  const lines = source.split("\n");

  function focusLine(index: number) {
    requestAnimationFrame(() => {
      const element = lineRefs.current[index];
      element?.focus();
      if (!element) return;
      const range = document.createRange();
      range.selectNodeContents(element);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
  }

  function updateText(index: number, block: ParsedLine, text: string) {
    onChange(replaceLine(source, index, [`${block.prefix}${text}`]));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>, index: number, block: ParsedLine) {
    const text = event.currentTarget.textContent ?? "";
    if (event.key === " " && block.kind === "paragraph") {
      const shortcut = shortcuts[text];
      if (shortcut) {
        event.preventDefault();
        onChange(replaceLine(source, index, [shortcut.prefix]));
        focusLine(index);
      }
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (block.kind !== "paragraph" && text === "") {
        onChange(replaceLine(source, index, [""]));
        focusLine(index);
        return;
      }
      const nextPrefix = continuationPrefix(block);
      onChange(replaceLine(source, index, [`${block.prefix}${text}`, nextPrefix]));
      focusLine(index + 1);
      return;
    }
    if (event.key === "Backspace" && text === "" && block.prefix !== "") {
      event.preventDefault();
      onChange(replaceLine(source, index, [""]));
      focusLine(index);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>, index: number, block: ParsedLine) {
    const pasted = event.clipboardData.getData("text/plain");
    if (!pasted.includes("\n")) return;
    event.preventDefault();
    const pastedLines = pasted.replace(/\r\n?/g, "\n").split("\n");
    onChange(replaceLine(source, index, [`${block.prefix}${pastedLines[0] ?? ""}`, ...pastedLines.slice(1)]));
    focusLine(index + pastedLines.length - 1);
  }

  return (
    <div className="notion-editor" role="textbox" aria-multiline="true" aria-label={label} aria-disabled={disabled || undefined}>
      {lines.map((line, index) => {
        const block = parseMarkdownLine(line);
        return (
          <div className="notion-block" data-block-kind={block.kind} key={`${index}:${block.kind}`}>
            {block.kind === "checklist" ? <input type="checkbox" aria-label={`할 일 ${index + 1}`} checked={block.checked} disabled={disabled} onChange={(event) => onChange(replaceLine(source, index, [`- [${event.target.checked ? "x" : " "}] ${block.text}`]))} /> : null}
            <div
              ref={(element) => { lineRefs.current[index] = element; }}
              className="notion-block-content"
              contentEditable={!disabled}
              suppressContentEditableWarning
              role="paragraph"
              data-placeholder={index === 0 ? "여기에 기록을 시작하세요…" : "내용을 입력하세요"}
              onInput={(event) => updateText(index, block, event.currentTarget.textContent ?? "")}
              onKeyDown={(event) => handleKeyDown(event, index, block)}
              onPaste={(event) => handlePaste(event, index, block)}
            >{block.text}</div>
          </div>
        );
      })}
    </div>
  );
}
