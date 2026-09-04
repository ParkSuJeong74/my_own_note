"use client";

import { useState } from "react";

import {
  completeBlogDiscoveryItemAction,
  excludeBlogDiscoveryAction,
  hideBlogDiscoveryItemAction,
  rerollBlogDiscoveryAction,
  saveBlogDiscoveryKeywordsAction,
} from "@/app/workspaces/actions";
import type { BlogDiscoveryItem, BlogNeighbor } from "@/lib/blog-discovery";
import { drawNeighborIndex } from "@/lib/blog-lottery";

const GENERAL_COMMENT = "포스팅 재밌게 잘 보고 가요ㅎㅎ 앞으로 자주 놀러올게요! 편하게 소통하면서 지내요☺️💛";
const FOOD_COMMENT = "저도 최근에 여기 다녀왔는데 괜히 반갑네용ㅋㅋㅋ 진짜 맛있었어요ㅠㅠ 🤤 사진 보니까 또 먹고 싶어지네용ㅎㅎ";
const TRAVEL_COMMENT = "저도 최근에 비슷한 곳 다녀왔는데 괜히 반갑네용ㅎㅎ 사진 보니까 또 놀러 가고 싶어져요☺️ 잘 보고 가요 ㅎㅎ";
const CONTENT_COMMENT = "저도 이 작품 봤는데 괜히 반갑네용ㅎㅎ 리뷰 읽으니까 기억이 새록새록 나네요☺️ 재밌게 잘 보고 가요!";
const NEIGHBOR_MESSAGE = "안녕하세요 ㅎㅎ 포스팅 구경하고 서이추 걸고 가요 💛\n앞으로 자주 놀러올게요! 편하게 소통하면서 지내요 😊";
const commentFor = (item: BlogDiscoveryItem) => item.commentKind === "FOOD" ? FOOD_COMMENT : item.commentKind === "TRAVEL" ? TRAVEL_COMMENT : item.commentKind === "CONTENT" ? CONTENT_COMMENT : GENERAL_COMMENT;
export function BlogDiscovery({
  workspaceId,
  configured,
  foodKeywords,
  travelKeywords,
  contentKeywords,
  blogTags,
  recentYears,
  lastKeyword,
  error,
  items,
  neighbors,
}: {
  workspaceId: string;
  configured: boolean;
  foodKeywords: string[];
  travelKeywords: string[];
  contentKeywords: string[];
  blogTags: string[];
  recentYears: 1 | 2;
  lastKeyword: string;
  error: string;
  items: BlogDiscoveryItem[];
  neighbors: BlogNeighbor[];
}) {
  const hasKeywords = foodKeywords.length + travelKeywords.length + contentKeywords.length + blogTags.length > 0;
  const [copied, setCopied] = useState("");
  const [drawnNeighborIndex, setDrawnNeighborIndex] = useState<number | null>(null);
  const drawnNeighbor = drawnNeighborIndex === null ? null : neighbors[drawnNeighborIndex];
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
          <form action={rerollBlogDiscoveryAction} className="blog-discovery-direct-search">
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="discoveryMode" value="MUTUAL" />
            <input name="customKeyword" required maxLength={80} placeholder="직접 검색어 입력" aria-label="직접 검색어" />
            <button className="mutual-search" disabled={!configured}>검색어+서이추 태그</button>
          </form>
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
        <section className="neighbor-lottery" aria-live="polite">
          <div>
            <strong>🎟️ 오늘의 이웃 제비뽑기</strong>
            <small>등록된 이웃 {neighbors.length}명 중 한 명을 골라드려요.</small>
          </div>
          {drawnNeighbor ? (
            <div className="neighbor-lottery-result">
              <span>오늘 놀러 갈 이웃</span>
              <b>{drawnNeighbor.name}</b>
              <a href={drawnNeighbor.url} target="_blank" rel="noreferrer">최근 글 보러 가기 ↗</a>
            </div>
          ) : null}
          <button
            type="button"
            disabled={neighbors.length === 0}
            onClick={() => setDrawnNeighborIndex((current) => drawNeighborIndex(neighbors.length, current))}
          >
            {drawnNeighbor ? "다시 뽑기" : "이웃 뽑기"}
          </button>
          {neighbors.length === 0 ? <small>확장 프로그램에서 이웃 목록을 먼저 수집해 주세요.</small> : null}
        </section>
        <details>
          <summary>검색 키워드 설정</summary>
          <form action={saveBlogDiscoveryKeywordsAction}>
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <label><span>맛집 · 내가 다녀온 곳</span><textarea name="foodKeywords" defaultValue={foodKeywords.join("\n")} placeholder={"성수 맛집\n연남동 카페\n제주 흑돼지"} /></label>
            <label><span>여행 · 내가 다녀온 곳</span><textarea name="travelKeywords" defaultValue={travelKeywords.join("\n")} placeholder={"강릉 여행\n제주 애월\n경주 황리단길"} /></label>
            <label><span>콘텐츠 · 내가 본/읽은 작품</span><textarea name="contentKeywords" defaultValue={contentKeywords.join("\n")} placeholder={"영화 파묘\n드라마 폭싹 속았수다\n소설 채식주의자"} /></label>
            <small>한 줄에 한 장소나 검색어를 입력하세요. 검색할 때 두 목록 중 하나를 골라 사용합니다.</small>
            <label><span>검색 기간</span><select name="recentYears" defaultValue={recentYears}><option value="1">최근 1년</option><option value="2">최근 2년</option></select></label>
            <button>키워드 저장</button>
          </form>
        </details>
        <details>
          <summary>내 블로그 태그 · {blogTags.length}개</summary>
          <p>{blogTags.length ? blogTags.map((tag)=><span key={tag}>#{tag} </span>) : "네이버 관리의 글 관리 > 태그 화면에서 확장 프로그램으로 수집해 주세요."}</p>
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
                {item.neighborLabel ? <b className={`mutual-neighbor-badge ${item.neighborLabel === "답방 약속" ? "reply" : item.mutualNeighbor ? "strong" : "social"}`}>{item.neighborLabel}</b> : null}
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
        답방 무조건·답방 100%·댓글 답방을 최우선으로, 서이추 환영과 일반 소통 문구를 그다음으로 표시합니다. 문구 기반 추천이므로 방문 후 실제 활동을 확인해 주세요.
      </p>
    </section>
  );
}
