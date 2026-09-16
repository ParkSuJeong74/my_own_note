import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Workspace } from "../app/workspace";
import { TREE_STORAGE_KEY } from "../lib/tree-storage";
import { createBackup } from "../lib/workspace-backup";

function enterTitle(title: string) {
  fireEvent.change(screen.getByLabelText("새 항목 이름"), { target: { value: title } });
}

describe("workspace tree", () => {
  it("creates and selects root pages", () => {
    render(<Workspace />);
    expect(screen.getByText(/아직 기록이 없어요/)).toBeInTheDocument();

    enterTitle("첫 기록");
    fireEvent.click(screen.getByRole("button", { name: "페이지" }));

    expect(screen.queryByText(/아직 기록이 없어요/)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "첫 기록" })).toBeInTheDocument();
    expect(screen.getByLabelText("전체 1개")).toBeInTheDocument();
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
