import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Workspace } from "../app/workspace";
import { TREE_STORAGE_KEY } from "../lib/tree-storage";
import { createBackup } from "../lib/workspace-backup";
import { WORKSPACE_VIEW_STORAGE_KEY } from "../lib/workspace-view-storage";

function enterTitle(title: string) {
  fireEvent.change(screen.getByLabelText("새 항목 이름"), { target: { value: title } });
}

describe("workspace tree", () => {
  it("collapses and restores the explorer without losing the editor", () => {
    render(<Workspace />);

    const explorer = screen.getByRole("complementary");
    const toggle = screen.getByRole("button", { name: "탐색기 닫기" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "탐색기 열기" })).toHaveAttribute("aria-expanded", "false");
    expect(explorer).toHaveAttribute("id", "workspace-sidebar");
    expect(screen.getByRole("region", { name: "문서 편집기" })).toBeInTheDocument();
  });

  it("resizes and resets the explorer with an accessible separator", () => {
    render(<Workspace />);
    const separator = screen.getByRole("separator", { name: "탐색기 너비 조절" });
    expect(separator).toHaveAttribute("aria-valuenow", "304");
    fireEvent.keyDown(separator, { key: "ArrowRight" });
    expect(separator).toHaveAttribute("aria-valuenow", "320");
    fireEvent.keyDown(separator, { key: "Home" });
    expect(separator).toHaveAttribute("aria-valuenow", "220");
    fireEvent.keyDown(separator, { key: "End" });
    expect(separator).toHaveAttribute("aria-valuenow", "480");
    fireEvent.doubleClick(separator);
    expect(separator).toHaveAttribute("aria-valuenow", "304");
  });

  it("keeps backup and trash tools collapsed until requested", () => {
    render(<Workspace />);

    const backup = screen.getByText("↻ 백업 및 복원").closest("details");
    const trash = screen.getByText(/⌫ 휴지통/).closest("details");
    expect(backup).not.toHaveAttribute("open");
    expect(trash).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("↻ 백업 및 복원"));
    expect(backup).toHaveAttribute("open");
  });

  it("focuses creation and search with desktop shortcuts", () => {
    render(<Workspace />);
    fireEvent.keyDown(window, { key: "n", metaKey: true });
    expect(screen.getByLabelText("새 항목 이름")).toHaveFocus();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getByLabelText("전체 검색")).toHaveFocus();
  });

  it("closes the active tab and toggles split directions with shortcuts", () => {
    render(<Workspace />);
    enterTitle("단축키 문서");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));

    fireEvent.keyDown(window, { key: "\\", metaKey: true });
    expect(screen.getByRole("button", { name: "세로 분할" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(window, { key: "\\", metaKey: true, shiftKey: true });
    expect(screen.getByRole("button", { name: "가로 분할" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "세로 분할" })).toHaveAttribute("aria-pressed", "false");

    fireEvent.keyDown(window, { key: "w", ctrlKey: true });
    expect(screen.queryByRole("tab", { name: /단축키 문서/ })).not.toBeInTheDocument();
  });

  it("saves workspace data immediately with the save shortcut", async () => {
    render(<Workspace />);
    enterTitle("즉시 저장");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    fireEvent.change(screen.getByLabelText("페이지 본문"), { target: { value: "저장할 내용" } });
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => expect(window.localStorage.getItem("mano.workspace.documents")).toContain("저장할 내용"));
    expect(screen.getByRole("status")).toHaveTextContent("이 브라우저에 저장됨");
  });

  it("renders a safe Markdown preview without changing the stored source", () => {
    render(<Workspace />);
    enterTitle("Markdown 문서");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    const source = "# 큰 제목\n- 항목\n- [x] 완료\n> 인용\n```ts\nconst safe = true;\n```\n<script>alert(1)</script>";
    fireEvent.change(screen.getByLabelText("페이지 본문"), { target: { value: source } });
    fireEvent.click(within(screen.getByRole("group", { name: "주 편집기 보기" })).getByRole("button", { name: "미리보기" }));

    const preview = screen.getByRole("article", { name: "Markdown 미리보기" });
    expect(within(preview).getByRole("heading", { level: 1, name: "큰 제목" })).toBeInTheDocument();
    expect(within(preview).getByRole("checkbox")).toBeChecked();
    expect(within(preview).getByText("const safe = true;")).toBeInTheDocument();
    expect(within(preview).getByText("<script>alert(1)</script>")).toBeInTheDocument();
    expect(preview.querySelector("script")).toBeNull();
  });

  it("keeps primary and secondary preview modes independent", () => {
    render(<Workspace />);
    enterTitle("분할 Markdown");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    fireEvent.change(screen.getByLabelText("페이지 본문"), { target: { value: "## 양쪽 제목" } });
    fireEvent.click(screen.getByRole("button", { name: "세로 분할" }));
    fireEvent.click(within(screen.getByRole("group", { name: "오른쪽 편집기 보기" })).getByRole("button", { name: "미리보기" }));

    expect(screen.getByLabelText("페이지 본문")).toBeInTheDocument();
    expect(screen.queryByLabelText("페이지 본문 (오른쪽 분할)")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "양쪽 제목" })).toBeInTheDocument();
  });

  it("applies Markdown formatting to the current selection and renders safe inline preview", () => {
    render(<Workspace />);
    enterTitle("서식 문서");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    const editor = screen.getByLabelText("페이지 본문") as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: "강조 링크" } });
    editor.setSelectionRange(0, 2);
    fireEvent.click(within(screen.getByRole("toolbar", { name: "주 Markdown 서식" })).getByRole("button", { name: "굵게" }));
    expect(editor).toHaveValue("**강조** 링크");

    editor.setSelectionRange(7, 9);
    fireEvent.click(within(screen.getByRole("toolbar", { name: "주 Markdown 서식" })).getByRole("button", { name: "링크" }));
    expect(editor).toHaveValue("**강조** [링크](https://)");
    fireEvent.click(within(screen.getByRole("group", { name: "주 편집기 보기" })).getByRole("button", { name: "미리보기" }));
    const preview = screen.getByRole("article", { name: "Markdown 미리보기" });
    expect(within(preview).getByText("강조").tagName).toBe("STRONG");
    expect(within(preview).getByRole("link", { name: "링크" })).toHaveAttribute("href", "https://");
  });

  it("creates and selects root pages", () => {
    render(<Workspace />);
    expect(screen.getByText(/아직 기록이 없어요/)).toBeInTheDocument();

    enterTitle("첫 기록");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));

    expect(screen.queryByText(/아직 기록이 없어요/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "첫 기록" })).toBeInTheDocument();
    expect(screen.getByLabelText("전체 1개")).toBeInTheDocument();
  });

  it("opens unique page tabs, switches them and selects an adjacent tab when closing", () => {
    render(<Workspace />);
    enterTitle("첫 기록");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    enterTitle("둘째 기록");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));

    expect(screen.getAllByRole("tab")).toHaveLength(2);
    const firstTab = screen.getByRole("tab", { name: /첫 기록/ });
    fireEvent.click(firstTab);
    expect(firstTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { level: 2, name: "첫 기록" })).toBeInTheDocument();

    const navigation = screen.getByRole("navigation", { name: "폴더와 페이지" });
    fireEvent.click(within(navigation).getByRole("button", { name: /첫 기록/ }));
    expect(screen.getAllByRole("tab")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "첫 기록 탭 닫기" }));
    expect(screen.queryByRole("tab", { name: /첫 기록/ })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /둘째 기록/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { level: 2, name: "둘째 기록" })).toBeInTheDocument();
  });

  it("reorders tabs with movement controls without changing the active page", async () => {
    render(<Workspace />);
    enterTitle("첫 탭");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    enterTitle("둘째 탭");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    enterTitle("셋째 탭");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));

    fireEvent.click(screen.getByRole("button", { name: "셋째 탭 탭 왼쪽으로 이동" }));
    const tabs = within(screen.getByRole("tablist", { name: "열린 페이지" })).getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["▤첫 탭", "▤셋째 탭", "▤둘째 탭"]);
    expect(screen.getByRole("heading", { level: 2, name: "셋째 탭" })).toBeInTheDocument();
    await waitFor(() => expect(window.localStorage.getItem(WORKSPACE_VIEW_STORAGE_KEY)).toContain('"openTabIds"'));
  });

  it("reorders tabs by dropping one onto another", () => {
    render(<Workspace />);
    enterTitle("앞 탭");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    enterTitle("뒤 탭");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));

    const tablist = screen.getByRole("tablist", { name: "열린 페이지" });
    const frontTab = within(tablist).getByRole("tab", { name: /앞 탭/ }).closest(".editor-tab")!;
    const backTab = within(tablist).getByRole("tab", { name: /뒤 탭/ }).closest(".editor-tab")!;
    fireEvent.dragStart(backTab, { dataTransfer: { effectAllowed: "none", setData: vi.fn() } });
    fireEvent.dragOver(frontTab, { dataTransfer: { dropEffect: "none" } });
    fireEvent.drop(frontTab, { dataTransfer: { dropEffect: "move" } });

    expect(within(tablist).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["▤뒤 탭", "▤앞 탭"]);
  });

  it("opens the active page in a vertical split and keeps both editors synchronized", () => {
    render(<Workspace />);
    enterTitle("분할 문서");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));

    const splitButton = screen.getByRole("button", { name: "세로 분할" });
    expect(splitButton).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(splitButton);

    expect(screen.getByRole("region", { name: "오른쪽 분할 편집기" })).toBeInTheDocument();
    const primaryEditor = screen.getByLabelText("페이지 본문");
    const secondaryEditor = screen.getByLabelText("페이지 본문 (오른쪽 분할)");
    fireEvent.change(secondaryEditor, { target: { value: "두 화면에서 같은 내용" } });
    expect(primaryEditor).toHaveValue("두 화면에서 같은 내용");
    expect(screen.getByRole("button", { name: "세로 분할" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "세로 분할" }));
    expect(screen.queryByRole("region", { name: "오른쪽 분할 편집기" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /분할 문서/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("페이지 본문")).toHaveValue("두 화면에서 같은 내용");
  });

  it("keeps vertical split unavailable without an active page", () => {
    render(<Workspace />);
    expect(screen.getByRole("button", { name: "세로 분할" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "가로 분할" })).toBeDisabled();
  });

  it("switches from vertical to horizontal split without changing the active document", () => {
    render(<Workspace />);
    enterTitle("방향 전환 문서");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    fireEvent.change(screen.getByLabelText("페이지 본문"), { target: { value: "유지할 본문" } });

    fireEvent.click(screen.getByRole("button", { name: "세로 분할" }));
    expect(screen.getByRole("region", { name: "오른쪽 분할 편집기" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "가로 분할" }));

    expect(screen.queryByRole("region", { name: "오른쪽 분할 편집기" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "아래쪽 분할 편집기" })).toBeInTheDocument();
    expect(screen.getByLabelText("페이지 본문 (아래쪽 분할)")).toHaveValue("유지할 본문");
    expect(screen.getByRole("button", { name: "세로 분할" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "가로 분할" })).toHaveAttribute("aria-pressed", "true");
  });

  it("resizes vertical and horizontal split panes with keyboard controls", () => {
    render(<Workspace />);
    enterTitle("크기 조절 문서");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    fireEvent.click(screen.getByRole("button", { name: "세로 분할" }));

    let separator = screen.getByRole("separator", { name: "분할 영역 크기 조절" });
    expect(separator).toHaveAttribute("aria-orientation", "vertical");
    fireEvent.keyDown(separator, { key: "ArrowRight" });
    expect(separator).toHaveAttribute("aria-valuenow", "55");
    fireEvent.keyDown(separator, { key: "End" });
    expect(separator).toHaveAttribute("aria-valuenow", "75");
    fireEvent.doubleClick(separator);
    expect(separator).toHaveAttribute("aria-valuenow", "50");

    fireEvent.click(screen.getByRole("button", { name: "가로 분할" }));
    separator = screen.getByRole("separator", { name: "분할 영역 크기 조절" });
    expect(separator).toHaveAttribute("aria-orientation", "horizontal");
    fireEvent.keyDown(separator, { key: "ArrowUp" });
    expect(separator).toHaveAttribute("aria-valuenow", "45");
    fireEvent.keyDown(separator, { key: "Home" });
    expect(separator).toHaveAttribute("aria-valuenow", "25");
  });

  it("keeps an independently selected document in the secondary pane", () => {
    render(<Workspace />);
    enterTitle("주 문서");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    fireEvent.change(screen.getByLabelText("페이지 본문"), { target: { value: "주 내용" } });
    enterTitle("보조 문서");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    fireEvent.change(screen.getByLabelText("페이지 본문"), { target: { value: "보조 내용" } });
    fireEvent.click(screen.getByRole("button", { name: "세로 분할" }));

    fireEvent.click(screen.getByRole("button", { name: "보조 탭 추가" }));
    const secondaryTabs = screen.getByRole("tablist", { name: "오른쪽 분할 열린 페이지" });
    fireEvent.click(within(secondaryTabs).getByRole("tab", { name: "주 문서" }));
    expect(screen.getByLabelText("페이지 본문 (오른쪽 분할)")).toHaveValue("주 내용");

    const primaryTabs = screen.getByRole("tablist", { name: "열린 페이지" });
    fireEvent.click(within(primaryTabs).getByRole("tab", { name: /보조 문서/ }));
    expect(screen.getByLabelText("페이지 본문")).toHaveValue("보조 내용");
    expect(screen.getByLabelText("페이지 본문 (오른쪽 분할)")).toHaveValue("주 내용");

    fireEvent.change(screen.getByLabelText("페이지 본문 (오른쪽 분할)"), { target: { value: "수정된 주 내용" } });
    fireEvent.click(within(primaryTabs).getByRole("tab", { name: /주 문서/ }));
    expect(screen.getByLabelText("페이지 본문")).toHaveValue("수정된 주 내용");
  });

  it("closes secondary tabs without changing the primary tab collection", () => {
    render(<Workspace />);
    enterTitle("독립 탭");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    fireEvent.click(screen.getByRole("button", { name: "세로 분할" }));

    fireEvent.click(screen.getByRole("button", { name: "독립 탭 보조 탭 닫기" }));
    expect(screen.queryByLabelText("페이지 본문 (오른쪽 분할)")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /독립 탭/ })).toBeInTheDocument();
    expect(screen.getByLabelText("페이지 본문")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "보조 탭 추가" })).toBeEnabled();
  });

  it("restores open tab order and the active page after refresh", async () => {
    window.localStorage.setItem(TREE_STORAGE_KEY, JSON.stringify({
      version: 1,
      tree: { nodes: [
        { id: "one", kind: "page", title: "첫 탭", parentId: null, order: 0, trashed: false },
        { id: "two", kind: "page", title: "둘째 탭", parentId: null, order: 1, trashed: false },
      ] },
    }));
    window.localStorage.setItem(WORKSPACE_VIEW_STORAGE_KEY, JSON.stringify({
      version: 1,
      view: { openTabIds: ["two", "one"], activeTabId: "two" },
    }));

    render(<Workspace />);

    const tabs = await screen.findAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["▤둘째 탭", "▤첫 탭"]);
    expect(screen.getByRole("tab", { name: /둘째 탭/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { level: 2, name: "둘째 탭" })).toBeInTheDocument();
  });

  it("restores split layout, ratio and secondary tabs after refresh", async () => {
    window.localStorage.setItem(TREE_STORAGE_KEY, JSON.stringify({
      version: 1,
      tree: { nodes: [
        { id: "primary", kind: "page", title: "주 복원", parentId: null, order: 0, trashed: false },
        { id: "secondary", kind: "page", title: "보조 복원", parentId: null, order: 1, trashed: false },
      ] },
    }));
    window.localStorage.setItem(WORKSPACE_VIEW_STORAGE_KEY, JSON.stringify({
      version: 1,
      view: { openTabIds: ["primary", "secondary"], activeTabId: "primary", splitMode: "vertical", splitPercent: 65, secondaryTabIds: ["secondary"], secondaryActiveTabId: "secondary" },
    }));

    render(<Workspace />);

    const separator = await screen.findByRole("separator", { name: "분할 영역 크기 조절" });
    expect(separator).toHaveAttribute("aria-orientation", "vertical");
    expect(separator).toHaveAttribute("aria-valuenow", "65");
    expect(within(screen.getByRole("tablist", { name: "오른쪽 분할 열린 페이지" })).getByRole("tab", { name: "보조 복원" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("region", { name: "오른쪽 분할 편집기" })).toHaveTextContent("보조 복원");
  });

  it("restores explorer layout, collapsed folders and preview modes", async () => {
    window.localStorage.setItem(TREE_STORAGE_KEY, JSON.stringify({
      version: 1,
      tree: { nodes: [
        { id: "folder", kind: "folder", title: "접힌 폴더", parentId: null, order: 0, trashed: false },
        { id: "page", kind: "page", title: "미리보기 문서", parentId: "folder", order: 0, trashed: false },
      ] },
    }));
    window.localStorage.setItem("mano.workspace.documents", JSON.stringify({ version: 1, documents: { page: { id: "page", blocks: [{ id: "page:body", type: "paragraph", text: "# 복원 제목" }] } } }));
    window.localStorage.setItem(WORKSPACE_VIEW_STORAGE_KEY, JSON.stringify({
      version: 1,
      view: { openTabIds: ["page"], activeTabId: "page", splitMode: "none", splitPercent: 50, secondaryTabIds: [], secondaryActiveTabId: null, sidebarWidth: 400, sidebarCollapsed: false, collapsedFolderIds: ["folder", "missing"], primaryPreview: true, secondaryPreview: false },
    }));

    render(<Workspace />);

    expect(await screen.findByRole("separator", { name: "탐색기 너비 조절" })).toHaveAttribute("aria-valuenow", "400");
    const navigation = screen.getByRole("navigation", { name: "폴더와 페이지" });
    expect(within(navigation).getByRole("button", { name: "하위 항목 펼치기" })).toBeInTheDocument();
    expect(within(navigation).queryByRole("button", { name: /미리보기 문서/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "복원 제목" })).toBeInTheDocument();
    await waitFor(() => expect(window.localStorage.getItem(WORKSPACE_VIEW_STORAGE_KEY)).not.toContain("missing"));
  });

  it("discards stale and trashed tabs while restoring a valid fallback selection", async () => {
    window.localStorage.setItem(TREE_STORAGE_KEY, JSON.stringify({
      version: 1,
      tree: { nodes: [
        { id: "valid", kind: "page", title: "남은 탭", parentId: null, order: 0, trashed: false },
        { id: "trashed", kind: "page", title: "버린 탭", parentId: null, order: 1, trashed: true },
      ] },
    }));
    window.localStorage.setItem(WORKSPACE_VIEW_STORAGE_KEY, JSON.stringify({
      version: 1,
      view: { openTabIds: ["missing", "valid", "trashed"], activeTabId: "missing" },
    }));

    render(<Workspace />);

    expect(await screen.findAllByRole("tab")).toHaveLength(1);
    expect(screen.getByRole("tab", { name: /남은 탭/ })).toHaveAttribute("aria-selected", "true");
    await waitFor(() => expect(window.localStorage.getItem(WORKSPACE_VIEW_STORAGE_KEY)).not.toContain("missing"));
  });

  it("recovers corrupt tab state without losing saved pages", async () => {
    window.localStorage.setItem(TREE_STORAGE_KEY, JSON.stringify({
      version: 1,
      tree: { nodes: [{ id: "saved", kind: "page", title: "저장된 기록", parentId: null, order: 0, trashed: false }] },
    }));
    window.localStorage.setItem(WORKSPACE_VIEW_STORAGE_KEY, "broken");

    render(<Workspace />);

    expect(await screen.findByRole("alert")).toHaveTextContent("빈 탭 상태로 복구했습니다");
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "폴더와 페이지" });
    expect(within(navigation).getByRole("button", { name: /저장된 기록/ })).toBeInTheDocument();
  });

  it("creates a page inside the selected folder and selects it", () => {
    render(<Workspace />);
    enterTitle("소설");
    fireEvent.click(screen.getByRole("button", { name: "폴더" }));
    expect(screen.getByText("폴더 · 하위 항목 0개")).toBeInTheDocument();

    enterTitle("1장");
    fireEvent.click(screen.getByRole("button", { name: "이 폴더에 페이지 추가" }));

    const navigation = screen.getByRole("navigation", { name: "폴더와 페이지" });
    expect(within(navigation).getByRole("button", { name: /1장/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "1장" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "이 폴더에 페이지 추가" })).not.toBeInTheDocument();
  });

  it("collapses a folder without closing its open child tab", () => {
    render(<Workspace />);
    enterTitle("접을 폴더");
    fireEvent.click(screen.getByRole("button", { name: "폴더" }));
    enterTitle("열린 자식");
    fireEvent.click(screen.getByRole("button", { name: "이 폴더에 페이지 추가" }));

    const navigation = screen.getByRole("navigation", { name: "폴더와 페이지" });
    expect(within(navigation).getByRole("button", { name: /열린 자식/ })).toBeInTheDocument();
    fireEvent.click(within(navigation).getByRole("button", { name: "하위 항목 접기" }));
    expect(within(navigation).queryByRole("button", { name: /열린 자식/ })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /열린 자식/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "열린 자식" })).toBeInTheDocument();

    fireEvent.click(within(navigation).getByRole("button", { name: "하위 항목 펼치기" }));
    expect(within(navigation).getByRole("button", { name: /열린 자식/ })).toBeInTheDocument();
  });

  it("announces blank-title validation and keeps the tree empty", () => {
    render(<Workspace />);
    fireEvent.click(screen.getByRole("button", { name: "폴더" }));

    expect(screen.getByRole("alert")).toHaveTextContent("이름을 입력해 주세요.");
    expect(screen.getByLabelText("전체 0개")).toBeInTheDocument();
    expect(screen.getByText(/아직 기록이 없어요/)).toBeInTheDocument();
  });

  it("switches selection between a folder and page", () => {
    render(<Workspace />);
    enterTitle("자료");
    fireEvent.click(screen.getByRole("button", { name: "폴더" }));
    enterTitle("메모");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));

    const navigation = screen.getByRole("navigation", { name: "폴더와 페이지" });
    fireEvent.click(within(navigation).getByRole("button", { name: /자료/ }));
    expect(screen.getByText("폴더 · 하위 항목 0개")).toBeInTheDocument();
    fireEvent.click(within(navigation).getByRole("button", { name: /메모/ }));
    expect(screen.getByLabelText("페이지 본문")).toBeInTheDocument();
  });

  it("restores a valid tree from browser storage", async () => {
    window.localStorage.setItem(TREE_STORAGE_KEY, JSON.stringify({
      version: 1,
      tree: { nodes: [{ id: "saved", kind: "page", title: "저장된 기록", parentId: null, order: 0, trashed: false }] },
    }));
    render(<Workspace />);

    const navigation = screen.getByRole("navigation", { name: "폴더와 페이지" });
    expect(await within(navigation).findByRole("button", { name: /저장된 기록/ })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("이 브라우저에 저장됨");
  });

  it("persists newly created tree data", async () => {
    render(<Workspace />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("이 브라우저에 저장됨"));
    enterTitle("남는 기록");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));

    await waitFor(() => expect(window.localStorage.getItem(TREE_STORAGE_KEY)).toContain("남는 기록"));
  });

  it("warns and recovers when stored data is corrupt", async () => {
    window.localStorage.setItem(TREE_STORAGE_KEY, "not-json");
    render(<Workspace />);

    expect(await screen.findByRole("alert")).toHaveTextContent("빈 작업 공간으로 복구했습니다");
    expect(screen.getByText(/아직 기록이 없어요/)).toBeInTheDocument();
    expect(window.localStorage.getItem(TREE_STORAGE_KEY)).toBe("not-json");
  });

  it("shows a write failure instead of claiming data was saved", async () => {
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    render(<Workspace />);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("이 브라우저에 저장됨"));
    enterTitle("저장 실패");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));

    expect(await screen.findByText("저장하지 못했습니다")).toBeInTheDocument();
    write.mockRestore();
  });

  it("edits and persists page body text with line breaks", async () => {
    render(<Workspace />);
    enterTitle("일기");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    fireEvent.change(screen.getByLabelText("페이지 본문"), { target: { value: "첫 줄\n둘째 줄" } });

    await waitFor(() => expect(window.localStorage.getItem("mano.workspace.documents")).toContain("첫 줄\\n둘째 줄"));
    expect(screen.getByLabelText("페이지 본문")).toHaveValue("첫 줄\n둘째 줄");
  });

  it("keeps page bodies isolated when switching pages", () => {
    render(<Workspace />);
    enterTitle("첫 페이지");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    fireEvent.change(screen.getByLabelText("페이지 본문"), { target: { value: "첫 내용" } });
    enterTitle("둘째 페이지");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    expect(screen.getByLabelText("페이지 본문")).toHaveValue("");

    const navigation = screen.getByRole("navigation", { name: "폴더와 페이지" });
    fireEvent.click(within(navigation).getByRole("button", { name: /첫 페이지/ }));
    expect(screen.getByLabelText("페이지 본문")).toHaveValue("첫 내용");
  });

  it("restores a saved body and initializes a legacy page without one", async () => {
    window.localStorage.setItem(TREE_STORAGE_KEY, JSON.stringify({
      version: 1,
      tree: { nodes: [
        { id: "saved", kind: "page", title: "저장됨", parentId: null, order: 0, trashed: false },
        { id: "legacy", kind: "page", title: "예전 페이지", parentId: null, order: 1, trashed: false },
      ] },
    }));
    window.localStorage.setItem("mano.workspace.documents", JSON.stringify({
      version: 1,
      documents: { saved: { id: "saved", blocks: [{ id: "saved:body", type: "paragraph", text: "복원된 본문" }] } },
    }));
    render(<Workspace />);
    const navigation = screen.getByRole("navigation", { name: "폴더와 페이지" });
    fireEvent.click(await within(navigation).findByRole("button", { name: /저장됨/ }));
    expect(screen.getByLabelText("페이지 본문")).toHaveValue("복원된 본문");
    fireEvent.click(within(navigation).getByRole("button", { name: /예전 페이지/ }));
    expect(screen.getByLabelText("페이지 본문")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("페이지 본문"), { target: { value: "새 본문" } });
    expect(screen.getByLabelText("페이지 본문")).toHaveValue("새 본문");
  });

  it("recovers corrupt document storage with a visible warning", async () => {
    window.localStorage.setItem("mano.workspace.documents", "broken");
    render(<Workspace />);
    expect(await screen.findByRole("alert")).toHaveTextContent("빈 본문으로 복구했습니다");
    expect(window.localStorage.getItem("mano.workspace.documents")).toBe("broken");
  });

  it("renames a selected page and persists the new title", async () => {
    render(<Workspace />);
    enterTitle("임시 제목");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    fireEvent.change(screen.getByLabelText("이름 변경"), { target: { value: "확정 제목" } });
    fireEvent.click(screen.getByRole("button", { name: "변경" }));

    expect(screen.getByRole("heading", { level: 2, name: "확정 제목" })).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "폴더와 페이지" });
    expect(within(navigation).getByRole("button", { name: /확정 제목/ })).toBeInTheDocument();
    await waitFor(() => expect(window.localStorage.getItem(TREE_STORAGE_KEY)).toContain("확정 제목"));
  });

  it("rejects a blank rename without changing the title", () => {
    render(<Workspace />);
    enterTitle("남을 제목");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    fireEvent.change(screen.getByLabelText("이름 변경"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "변경" }));

    expect(screen.getByRole("alert")).toHaveTextContent("새 이름을 입력해 주세요.");
    expect(screen.getByRole("heading", { level: 2, name: "남을 제목" })).toBeInTheDocument();
  });

  it("moves a page to trash and restores it", () => {
    render(<Workspace />);
    enterTitle("버린 메모");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    fireEvent.click(screen.getByRole("button", { name: "휴지통으로 이동" }));

    const navigation = screen.getByRole("navigation", { name: "폴더와 페이지" });
    expect(within(navigation).queryByRole("button", { name: /버린 메모/ })).not.toBeInTheDocument();
    expect(screen.getByText("버린 메모")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "복원" }));
    expect(within(navigation).getByRole("button", { name: /버린 메모/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "버린 메모" })).toBeInTheDocument();
  });

  it("trashes and restores a folder subtree without losing page body", () => {
    render(<Workspace />);
    enterTitle("보관함");
    fireEvent.click(screen.getByRole("button", { name: "폴더" }));
    enterTitle("중요 문서");
    fireEvent.click(screen.getByRole("button", { name: "이 폴더에 페이지 추가" }));
    fireEvent.change(screen.getByLabelText("페이지 본문"), { target: { value: "사라지면 안 되는 내용" } });

    const navigation = screen.getByRole("navigation", { name: "폴더와 페이지" });
    fireEvent.click(within(navigation).getByRole("button", { name: /보관함/ }));
    fireEvent.click(screen.getByRole("button", { name: "휴지통으로 이동" }));
    expect(within(navigation).queryByRole("button", { name: /중요 문서/ })).not.toBeInTheDocument();
    expect(screen.queryByText("중요 문서")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "복원" }));
    fireEvent.click(within(navigation).getByRole("button", { name: /중요 문서/ }));
    expect(screen.getByLabelText("페이지 본문")).toHaveValue("사라지면 안 되는 내용");
  });

  it("imports a valid backup and replaces the current workspace", async () => {
    render(<Workspace />);
    enterTitle("기존 페이지");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    const backup = createBackup({
      tree: { nodes: [{ id: "imported", kind: "page", title: "가져온 페이지", parentId: null, order: 0, trashed: false }] },
      documents: { imported: { id: "imported", blocks: [{ id: "body", type: "paragraph", text: "가져온 본문" }] } },
    });
    const file = new File([backup], "backup.json", { type: "application/json" });
    fireEvent.change(screen.getByLabelText("백업 가져오기"), { target: { files: [file] } });

    expect(await screen.findByText("백업을 복원했습니다.")).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "폴더와 페이지" });
    expect(within(navigation).queryByRole("button", { name: /기존 페이지/ })).not.toBeInTheDocument();
    fireEvent.click(within(navigation).getByRole("button", { name: /가져온 페이지/ }));
    expect(screen.getByLabelText("페이지 본문")).toHaveValue("가져온 본문");
  });

  it("keeps current data when backup import is invalid", async () => {
    render(<Workspace />);
    enterTitle("지켜야 할 페이지");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    const file = new File(["broken"], "broken.json", { type: "application/json" });
    fireEvent.change(screen.getByLabelText("백업 가져오기"), { target: { files: [file] } });

    expect(await screen.findByText("백업 파일의 JSON을 읽을 수 없습니다.")).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "폴더와 페이지" });
    expect(within(navigation).getByRole("button", { name: /지켜야 할 페이지/ })).toBeInTheDocument();
  });

  it("creates a downloadable backup", async () => {
    const createObjectURL = vi.fn(() => "blob:mano-backup");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    render(<Workspace />);
    await waitFor(() => expect(screen.getByRole("button", { name: "백업 내보내기" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "백업 내보내기" }));

    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mano-backup");
    expect(click).toHaveBeenCalledOnce();
    expect(screen.getByText(/백업 파일을 만들었습니다/)).toBeInTheDocument();
  });

  it("requires an exact title before permanently deleting a trashed page and its body", async () => {
    render(<Workspace />);
    enterTitle("삭제할 페이지");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    fireEvent.change(screen.getByLabelText("페이지 본문"), { target: { value: "삭제할 본문" } });
    await waitFor(() => expect(window.localStorage.getItem("mano.workspace.documents")).toContain("삭제할 본문"));
    fireEvent.click(screen.getByRole("button", { name: "휴지통으로 이동" }));
    fireEvent.click(screen.getByRole("button", { name: "영구 삭제" }));
    fireEvent.change(screen.getByLabelText("확인을 위해 항목 이름 입력"), { target: { value: "다른 이름" } });
    fireEvent.click(screen.getByRole("button", { name: "완전히 삭제" }));

    expect(screen.getByRole("alert")).toHaveTextContent("항목 이름이 일치하지 않습니다.");
    expect(screen.getByText("삭제할 페이지")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("확인을 위해 항목 이름 입력"), { target: { value: "삭제할 페이지" } });
    fireEvent.click(screen.getByRole("button", { name: "완전히 삭제" }));

    expect(screen.queryByText("삭제할 페이지")).not.toBeInTheDocument();
    expect(screen.getByText("휴지통이 비어 있어요.")).toBeInTheDocument();
    await waitFor(() => expect(window.localStorage.getItem("mano.workspace.documents")).not.toContain("삭제할 본문"));
  });

  it("cancels permanent deletion without changing data", () => {
    render(<Workspace />);
    enterTitle("보존할 페이지");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    fireEvent.click(screen.getByRole("button", { name: "휴지통으로 이동" }));
    fireEvent.click(screen.getByRole("button", { name: "영구 삭제" }));
    fireEvent.click(screen.getByRole("button", { name: "취소" }));

    expect(screen.queryByLabelText("확인을 위해 항목 이름 입력")).not.toBeInTheDocument();
    expect(screen.getByText("보존할 페이지")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "복원" })).toBeInTheDocument();
  });

  it("deletes a folder subtree document while preserving unrelated pages", async () => {
    render(<Workspace />);
    enterTitle("삭제 폴더");
    fireEvent.click(screen.getByRole("button", { name: "폴더" }));
    enterTitle("하위 페이지");
    fireEvent.click(screen.getByRole("button", { name: "이 폴더에 페이지 추가" }));
    fireEvent.change(screen.getByLabelText("페이지 본문"), { target: { value: "하위 본문" } });
    enterTitle("남는 페이지");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    fireEvent.change(screen.getByLabelText("페이지 본문"), { target: { value: "남는 본문" } });
    await waitFor(() => expect(window.localStorage.getItem("mano.workspace.documents")).toContain("하위 본문"));

    const navigation = screen.getByRole("navigation", { name: "폴더와 페이지" });
    fireEvent.click(within(navigation).getByRole("button", { name: /삭제 폴더/ }));
    fireEvent.click(screen.getByRole("button", { name: "휴지통으로 이동" }));
    fireEvent.click(screen.getByRole("button", { name: "영구 삭제" }));
    fireEvent.change(screen.getByLabelText("확인을 위해 항목 이름 입력"), { target: { value: "삭제 폴더" } });
    fireEvent.click(screen.getByRole("button", { name: "완전히 삭제" }));

    expect(within(navigation).getByRole("button", { name: /남는 페이지/ })).toBeInTheDocument();
    await waitFor(() => {
      const stored = window.localStorage.getItem("mano.workspace.documents");
      expect(stored).not.toContain("하위 본문");
      expect(stored).toContain("남는 본문");
    });
  });

  it("searches page bodies and opens the selected result", () => {
    render(<Workspace />);
    enterTitle("여행 기록");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    fireEvent.change(screen.getByLabelText("페이지 본문"), { target: { value: "제주 바다에서 보낸 하루" } });
    fireEvent.change(screen.getByLabelText("전체 검색"), { target: { value: "  제주 바다  " } });

    expect(screen.getByText("페이지 본문", { selector: "small" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /여행 기록.*페이지 본문/ }));
    expect(screen.getByLabelText("전체 검색")).toHaveValue("");
    expect(screen.getByRole("heading", { level: 2, name: "여행 기록" })).toBeInTheDocument();
    expect(screen.getByLabelText("페이지 본문")).toHaveValue("제주 바다에서 보낸 하루");
  });

  it("searches folder and page titles case-insensitively", () => {
    render(<Workspace />);
    enterTitle("Projects");
    fireEvent.click(screen.getByRole("button", { name: "폴더" }));
    enterTitle("Release Notes");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));

    fireEvent.change(screen.getByLabelText("전체 검색"), { target: { value: "PROJECTS" } });
    expect(screen.getByText("폴더 제목", { selector: "small" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("전체 검색"), { target: { value: "release" } });
    expect(screen.getByText("페이지 제목", { selector: "small" })).toBeInTheDocument();
  });

  it("shows no results and excludes trashed content", () => {
    render(<Workspace />);
    enterTitle("숨길 페이지");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));
    fireEvent.change(screen.getByLabelText("페이지 본문"), { target: { value: "비밀 검색어" } });
    fireEvent.click(screen.getByRole("button", { name: "휴지통으로 이동" }));
    fireEvent.change(screen.getByLabelText("전체 검색"), { target: { value: "비밀 검색어" } });

    expect(screen.getByText("검색 결과가 없어요.")).toBeInTheDocument();
    expect(screen.queryByText("페이지 본문", { selector: "small" })).not.toBeInTheDocument();
  });
});
