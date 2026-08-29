"use client";

import { useState } from "react";
import {
  completeBlogDiscoveryItemAction,
  hideBlogDiscoveryItemAction,
  rerollBlogDiscoveryAction,
  saveBlogDiscoveryKeywordsAction,
} from "@/app/workspaces/actions";
import type { BlogDiscoveryItem } from "@/lib/blog-discovery";

type Postit = { id: string; title: string; content: string };
async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

export function BlogDiscovery({
  workspaceId,
  configured,
  keywords,
  recentYears,
  lastKeyword,
  error,
  items,
  postits,
}: {
  workspaceId: string;
  configured: boolean;
  keywords: string[];
  recentYears: 1 | 2;
  lastKeyword: string;
  error: string;
  items: BlogDiscoveryItem[];
  postits: Postit[];
}) {
  const [postitId, setPostitId] = useState(postits[0]?.id ?? ""),
    comment = postits.find((item) => item.id === postitId)?.content ?? "";
  return (
    <section className="blog-discovery">
      <div className="section-head">
        <div>
          <p className="eyebrow">BLOG DISCOVERY</p>
          <h2>이웃 탐색</h2>
          <p>
            키워드와 비슷한 네이버 블로그 글을 찾고 포스트잇 댓글을 복사해 직접
            방문합니다.
          </p>
        </div>
        <div className="blog-discovery-search-actions">
          <form action={rerollBlogDiscoveryAction}>
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <button disabled={!configured || keywords.length === 0}>↻ 일반 찾기</button>
          </form>
          <form action={rerollBlogDiscoveryAction}>
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="discoveryMode" value="MUTUAL" />
            <button className="mutual-search" disabled={!configured || keywords.length === 0}>이웃 태그 전체 찾기</button>
          </form>
        </div>
      </div>
      <div className="blog-discovery-controls">
        <details>
          <summary>검색 키워드 설정</summary>
          <form action={saveBlogDiscoveryKeywordsAction}>
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <textarea
              name="keywords"
              defaultValue={keywords.join("\n")}
              placeholder={"맛집\n일상\n서울 여행"}
            />
            <small>한 줄에 하나씩 입력하세요.</small>
            <label><span>검색 기간</span><select name="recentYears" defaultValue={recentYears}><option value="1">최근 1년</option><option value="2">최근 2년</option></select></label>
            <button>키워드 저장</button>
          </form>
        </details>
        <label>
          <span>댓글로 사용할 포스트잇</span>
          <select
            value={postitId}
            onChange={(event) => setPostitId(event.target.value)}
          >
            <option value="">포스트잇 선택</option>
            {postits.map((postit) => (
              <option value={postit.id} key={postit.id}>
                {postit.title || postit.content.slice(0, 30)}
              </option>
            ))}
          </select>
        </label>
        <div className="blog-discovery-state">
          <span>
            {lastKeyword
              ? `최근 키워드 · ${lastKeyword}`
              : "아직 검색하지 않음"}
          </span>
          <small>최신순 · 최근 {recentYears}년 · 블로거별 1개 추천</small>
        </div>
      </div>
      {!configured && (
        <p className="blog-discovery-error">
          홈서버에 NAVER_SEARCH_CLIENT_ID와 NAVER_SEARCH_CLIENT_SECRET을
          설정하세요.
        </p>
      )}
      {error && <p className="blog-discovery-error">{error}</p>}
      <div className="blog-discovery-list">
        {items.map((item) => (
          <article
            className={item.status === "DONE" ? "done" : ""}
            key={item.id}
          >
            <div>
              <span>
                {item.bloggerName || "네이버 블로그"}
                {item.publishedOn ? ` · ${item.publishedOn}` : ""}
                {item.neighborLabel ? <b className={`mutual-neighbor-badge ${item.mutualNeighbor ? "strong" : "social"}`}>{item.neighborLabel}</b> : null}
              </span>
              <h3>{item.title}</h3>
              <p>{item.excerpt}</p>
            </div>
            <div className="blog-discovery-actions">
              <form
                action={completeBlogDiscoveryItemAction}
                onSubmit={(event) => {
                  if (!comment) {
                    event.preventDefault();
                    return;
                  }
                  window.open(item.url, "_blank", "noopener,noreferrer");
                  void copyText(comment);
                }}
              >
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <button disabled={!comment}>
                  {item.status === "DONE" ? "다시 열기" : "댓글 쓰러가기"}
                </button>
              </form>
              <form action={hideBlogDiscoveryItemAction}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <button className="secondary">숨기기</button>
              </form>
            </div>
          </article>
        ))}
      </div>
      {items.length === 0 && !error && (
        <div className="board-empty compact">
          키워드를 저장하고 리롤을 눌러 글을 찾아보세요.
        </div>
      )}
      <p className="blog-discovery-note">
        서이추환영·서로이웃환영·이웃추가환영·이웃환영은 최우선, 이웃소통·소통환영·답방은 그다음으로 표시합니다. 네이버 공식 검색 API는 실제 태그 목록과 이웃 수를 제공하지 않으므로 방문 후 확인해야 합니다.
      </p>
    </section>
  );
}
