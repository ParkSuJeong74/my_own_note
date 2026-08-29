"use client";

import { useState } from "react";

import {
  completeBlogDiscoveryItemAction,
  excludeBlogDiscoveryAction,
  hideBlogDiscoveryItemAction,
  rerollBlogDiscoveryAction,
  saveBlogDiscoveryExclusionsAction,
  saveBlogDiscoveryKeywordsAction,
} from "@/app/workspaces/actions";
import type { BlogDiscoveryItem } from "@/lib/blog-discovery";

const GENERAL_COMMENT = "포스팅 재밌게 잘 보고 가요ㅎㅎ 앞으로 자주 놀러올게요! 편하게 소통하면서 지내요☺️💛";
const FOOD_COMMENT = "저도 최근에 여기 다녀왔는데 괜히 반갑네용ㅋㅋㅋ 진짜 맛있었어요ㅠㅠ 🤤 사진 보니까 또 먹고 싶어지네용ㅎㅎ";
const TRAVEL_COMMENT = "저도 최근에 비슷한 곳 다녀왔는데 괜히 반갑네용ㅎㅎ 사진 보니까 또 놀러 가고 싶어져요☺️ 잘 보고 가요 ㅎㅎ";
const NEIGHBOR_MESSAGE = "안녕하세요 ㅎㅎ 포스팅 구경하고 서이추 걸고 가요 💛\n앞으로 자주 놀러올게요! 편하게 소통하면서 지내요 😊";
const commentFor = (item: BlogDiscoveryItem) => item.commentKind === "FOOD" ? FOOD_COMMENT : item.commentKind === "TRAVEL" ? TRAVEL_COMMENT : GENERAL_COMMENT;

export function BlogDiscovery({
  workspaceId,
  configured,
  foodKeywords,
  travelKeywords,
  recentYears,
  lastKeyword,
  error,
  items,
  exclusionIds,
}: {
  workspaceId: string;
  configured: boolean;
  foodKeywords: string[];
  travelKeywords: string[];
  recentYears: 1 | 2;
  lastKeyword: string;
  error: string;
  items: BlogDiscoveryItem[];
  exclusionIds: string[];
}) {
  const hasKeywords = foodKeywords.length + travelKeywords.length > 0;
  const [copied, setCopied] = useState("");
  const copy = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    window.setTimeout(() => setCopied((current) => current === key ? "" : current), 1600);
  };
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
            <button disabled={!configured || !hasKeywords}>↻ 일반 찾기</button>
          </form>
          <form action={rerollBlogDiscoveryAction}>
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="discoveryMode" value="MUTUAL" />
            <button className="mutual-search" disabled={!configured || !hasKeywords}>키워드+이웃 태그</button>
          </form>
          <form action={rerollBlogDiscoveryAction}>
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="discoveryMode" value="TAGS_ONLY" />
            <button className="mutual-search" disabled={!configured}>이웃 태그만 찾기</button>
          </form>
        </div>
      </div>
      <div className="blog-discovery-controls">
        <details>
          <summary>검색 키워드 설정</summary>
          <form action={saveBlogDiscoveryKeywordsAction}>
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <label><span>맛집 · 내가 다녀온 곳</span><textarea name="foodKeywords" defaultValue={foodKeywords.join("\n")} placeholder={"성수 맛집\n연남동 카페\n제주 흑돼지"} /></label>
            <label><span>여행 · 내가 다녀온 곳</span><textarea name="travelKeywords" defaultValue={travelKeywords.join("\n")} placeholder={"강릉 여행\n제주 애월\n경주 황리단길"} /></label>
            <small>한 줄에 한 장소나 검색어를 입력하세요. 검색할 때 두 목록 중 하나를 골라 사용합니다.</small>
            <label><span>검색 기간</span><select name="recentYears" defaultValue={recentYears}><option value="1">최근 1년</option><option value="2">최근 2년</option></select></label>
            <button>키워드 저장</button>
          </form>
        </details>
        <details>
          <summary>검색 제외 목록</summary>
          <form action={saveBlogDiscoveryExclusionsAction}>
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <label><span>등록된 블로그 · {exclusionIds.length}개</span><textarea value={exclusionIds.join("\n")} readOnly placeholder="아직 등록된 블로그가 없어요." /></label>
            <label><span>제외 목록에 추가</span><textarea name="exclusionIds" placeholder="블로그 ID 또는 주소를 여러 줄로 붙여넣으세요." /></label>
            <label><span>네이버 이웃 OPML 추가</span><input type="file" name="exclusionOpml" accept=".opml,.xml,text/xml" /></label>
            <small>기존 목록은 그대로 유지됩니다. 새 ID나 OPML이 중복돼도 한 번만 등록됩니다.</small>
            <button>제외 목록에 추가</button>
          </form>
        </details>
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
              <div className="blog-discovery-copy-preview">
                <span>추천 댓글</span>
                <p>{commentFor(item)}</p>
              </div>
            </div>
            <div className="blog-discovery-actions">
              <form
                action={completeBlogDiscoveryItemAction}
                onSubmit={() => {
                  window.open(item.url, "_blank", "noopener,noreferrer");
                }}
              >
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <button>
                  {item.status === "DONE" ? "다시 열기" : "블로그 방문"}
                </button>
              </form>
              <button type="button" className="comment-copy" onClick={() => copy(`${item.id}-comment`, commentFor(item))}>
                {copied === `${item.id}-comment` ? "댓글 복사됨 ✓" : "댓글 복사"}
              </button>
              <button type="button" className="neighbor-copy" onClick={() => copy(`${item.id}-neighbor`, NEIGHBOR_MESSAGE)}>
                {copied === `${item.id}-neighbor` ? "서이 문구 복사됨 ✓" : "서이 문구 복사"}
              </button>
              <form action={hideBlogDiscoveryItemAction}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <button className="secondary">숨기기</button>
              </form>
              <form action={excludeBlogDiscoveryAction}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="workspaceId" value={workspaceId} />
                <button className="secondary">검색에서 제외</button>
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
