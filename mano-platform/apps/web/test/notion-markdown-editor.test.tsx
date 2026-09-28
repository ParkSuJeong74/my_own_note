import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { NotionMarkdownEditor, parseMarkdownLine } from "../app/notion-markdown-editor";

function ControlledEditor({ initial = "" }: { readonly initial?: string }) {
  const [source, setSource] = useState(initial);
  return <><output aria-label="source">{source}</output><NotionMarkdownEditor label="블록 편집기" source={source} onChange={setSource} /></>;
}

describe("NotionMarkdownEditor", () => {
  it("converts a heading marker on Space while preserving Markdown source", () => {
    render(<ControlledEditor />);
    const block = screen.getByRole("paragraph");
    fireEvent.input(block, { target: { textContent: "##" } });
    fireEvent.keyDown(screen.getByRole("paragraph"), { key: " " });

    expect(screen.getByLabelText("source").textContent).toBe("## ");
    expect(screen.getByRole("paragraph").closest(".notion-block")).toHaveAttribute("data-block-kind", "heading-2");
    expect(screen.getByRole("paragraph")).toHaveTextContent("");
  });

  it("continues list and checklist blocks on Enter", () => {
    const first = render(<ControlledEditor initial="- 첫 항목" />);
    fireEvent.keyDown(screen.getByRole("paragraph"), { key: "Enter" });
    expect(screen.getByLabelText("source").textContent).toBe("- 첫 항목\n- ");
    expect(screen.getAllByRole("paragraph")).toHaveLength(2);

    first.unmount();
    render(<ControlledEditor initial="- [x] 완료" />);
    fireEvent.keyDown(screen.getByRole("paragraph"), { key: "Enter" });
    expect(screen.getByLabelText("source").textContent).toBe("- [x] 완료\n- [ ] ");
  });

  it("returns an empty formatted block to a paragraph on Backspace", () => {
    render(<ControlledEditor initial="# " />);
    fireEvent.keyDown(screen.getByRole("paragraph"), { key: "Backspace" });
    expect(screen.getByLabelText("source")).toBeEmptyDOMElement();
    expect(screen.getByRole("paragraph").closest(".notion-block")).toHaveAttribute("data-block-kind", "paragraph");
  });

  it("preserves the caret and DOM node during Korean IME composition", () => {
    render(<ControlledEditor />);
    const block = screen.getByRole("paragraph");
    block.focus();
    fireEvent.compositionStart(block);

    for (const value of ["ㄴ", "나", "난"]) {
      block.textContent = value;
      const range = document.createRange();
      range.setStart(block.firstChild ?? block, value.length);
      range.collapse(true);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      fireEvent.input(block, { inputType: "insertCompositionText", data: value.at(-1) });
      expect(screen.getByRole("paragraph")).toBe(block);
      expect(window.getSelection()?.anchorOffset).toBe(value.length);
    }

    fireEvent.compositionEnd(block, { data: "난" });
    expect(screen.getByLabelText("source").textContent).toBe("난");
    expect(block).toHaveTextContent("난");
  });

  it("renders imported Markdown as editable blocks and keeps raw HTML inert", () => {
    render(<ControlledEditor initial={"# 제목\n- [x] 완료\n<script>alert(1)</script>"} />);
    const editor = screen.getByRole("textbox", { name: "블록 편집기" });
    expect(editor.querySelector('[data-block-kind="heading-1"]')).toHaveTextContent("제목");
    expect(within(editor).getByRole("checkbox")).toBeChecked();
    expect(editor).toHaveTextContent("<script>alert(1)</script>");
    expect(editor.querySelector("script")).toBeNull();
  });

  it("parses supported block prefixes without treating incomplete markers as formatted", () => {
    expect(parseMarkdownLine("> 인용").kind).toBe("quote");
    expect(parseMarkdownLine("1. 순서").kind).toBe("numbered");
    expect(parseMarkdownLine("###").kind).toBe("paragraph");
  });
});
