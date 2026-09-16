import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "../app/page";

describe("home page shell", () => {
  it("renders semantic navigation and the primary workspace heading", () => {
    render(<HomePage />);

    expect(screen.getByRole("link", { name: "본문으로 바로가기" })).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("heading", { level: 1, name: "내 기록" })).toBeInTheDocument();
  });

  it("communicates the incomplete state without claiming save or sync readiness", () => {
    render(<HomePage />);

    expect(screen.getByText("로컬 작업 공간")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "기록을 선택해 주세요" })).toBeInTheDocument();
    expect(screen.getByText(/새로고침하면 초기화됩니다/)).toBeInTheDocument();
    expect(screen.queryByText(/동기화 완료/)).not.toBeInTheDocument();
  });
});
