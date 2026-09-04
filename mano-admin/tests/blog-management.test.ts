import assert from "node:assert/strict";
import test from "node:test";
import { blogNeighborPriority, blogReplySourceKey, earliestBlogReplyDate, groupBlogReplyDuplicates, nonNegativeMetric, normalizeBlogSearchTags, optionalGrowthMetric, validNaverBlogUrl } from "../src/lib/blog-rules.ts";
import { drawNeighborIndex } from "../src/lib/blog-lottery.ts";
import { readFileSync } from "node:fs";

test("prioritizes explicit return-visit promises", () => {
  assert.equal(blogNeighborPriority("댓글 답방 100% 갑니다"), 0);
  assert.equal(blogNeighborPriority("서이추 환영해요"), 1);
  assert.equal(blogNeighborPriority("이웃 소통 환영"), 2);
  assert.equal(blogNeighborPriority("오늘의 카페 기록"), 3);
});

test("collected comment identity is stable and content-sensitive", () => {
  const item={postUrl:"https://blog.naver.com/example/123",commenter:"이웃",commentExcerpt:"잘 보고 가요",commentedAt:"2026-09-04T01:00:00.000Z"};
  assert.equal(blogReplySourceKey(item),blogReplySourceKey({...item}));
  assert.notEqual(blogReplySourceKey(item),blogReplySourceKey({...item,commentExcerpt:"다른 댓글"}));
  assert.equal(blogReplySourceKey(item),blogReplySourceKey({...item,postUrl:"https://m.blog.naver.com/PostView.naver?blogId=example&logNo=123&proxyReferer=x",commenter:" 이웃 ",commentExcerpt:"잘   보고 가요",commentedAt:"2026-09-04T01:00:45.000Z"}));
  assert.notEqual(blogReplySourceKey(item),blogReplySourceKey({...item,commentedAt:"2026-09-04T01:01:00.000Z"}));
});

test("groups historical URL and whitespace variants for cleanup",()=>{
  const first={postUrl:"https://blog.naver.com/example/123",commenter:"이웃",commentExcerpt:"잘 보고 가요",commentedAt:"2026-09-04T01:00:00.000Z"},variant={...first,postUrl:"https://m.blog.naver.com/PostView.naver?blogId=example&logNo=123",commentExcerpt:"잘  보고 가요",commentedAt:"2026-09-04T01:00:30.000Z"};
  assert.equal([...groupBlogReplyDuplicates([first,variant]).values()][0].length,2);
});

test("duplicate cleanup preserves the earliest existing reply completion",()=>{
  const later=new Date("2026-09-04T03:00:00.000Z"),earlier=new Date("2026-09-04T02:00:00.000Z");
  assert.equal(earliestBlogReplyDate([null,later,earlier])?.toISOString(),earlier.toISOString());
  assert.equal(earliestBlogReplyDate([null,null]),null);
});

test("accepts only secure Naver Blog post URLs", () => {
  assert.equal(validNaverBlogUrl("https://blog.naver.com/example/123"), true);
  assert.equal(validNaverBlogUrl("https://m.blog.naver.com/example/123"), true);
  assert.equal(validNaverBlogUrl("http://blog.naver.com/example/123"), false);
  assert.equal(validNaverBlogUrl("https://example.com/post"), false);
});

test("growth metrics require non-negative safe integers", () => {
  assert.equal(nonNegativeMetric("0"), 0);
  assert.equal(nonNegativeMetric("42"), 42);
  assert.equal(nonNegativeMetric("-1"), null);
  assert.equal(nonNegativeMetric("1.5"), null);
  assert.equal(nonNegativeMetric("nope"), null);
  assert.equal(optionalGrowthMetric("1,234"), 1234);
  assert.equal(optionalGrowthMetric(""), null);
});

test("normalizes collected blog tags for discovery searches",()=>{
  assert.deepEqual(normalizeBlogSearchTags(["#성수맛집 (12)","성수맛집 12"," 태그 ","제주 여행\n#카페투어"]),["성수맛집","제주 여행","카페투어"]);
  assert.equal(normalizeBlogSearchTags(Array.from({length:250},(_,index)=>`태그-${index}`)).length,200);
});

test("neighbor lottery handles empty and single pools", () => {
  assert.equal(drawNeighborIndex(0, null, () => 0), null);
  assert.equal(drawNeighborIndex(1, 0, () => 0.9), 0);
});

test("neighbor lottery avoids immediately repeating the current neighbor", () => {
  assert.equal(drawNeighborIndex(3, null, () => 0.99), 2);
  assert.equal(drawNeighborIndex(3, 0, () => 0), 1);
  assert.equal(drawNeighborIndex(3, 1, () => 0), 0);
  assert.equal(drawNeighborIndex(3, 1, () => 0.99), 2);
});

test("comment inbox and growth snapshot are independently collapsible",()=>{
  const source=readFileSync(new URL("../src/components/blog-management.tsx",import.meta.url),"utf8");
  assert.equal(source.match(/className="blog-collapsible"/g)?.length,2);
  assert.match(source,/미답글 댓글함/);
  assert.match(source,/성장 스냅샷/);
  assert.doesNotMatch(source,/className="blog-collapsible" open/);
  assert.match(source,/날짜별 기록 \{growthSnapshots\.length\}개/);
  assert.match(source,/"미수집"/);
  assert.match(source,/\?\.toLocaleString\("ko-KR"\)\?\?"—"/);
});

test("blog discovery hides manual exclusions and exposes collected tags",()=>{
  const source=readFileSync(new URL("../src/components/blog-discovery.tsx",import.meta.url),"utf8");
  assert.doesNotMatch(source,/<summary>검색 제외 목록<\/summary>/);
  assert.match(source,/내 블로그 태그/);
});

test("partial neighbor snapshots cannot remove most existing relationships",()=>{
  const source=readFileSync(new URL("../src/lib/blog-discovery.ts",import.meta.url),"utf8");
  assert.match(source,/normalized\.size<Math\.ceil\(previousTotal\*0\.8\)/);
});

test("growth values require a known collection source before display",()=>{
  const source=readFileSync(new URL("../src/lib/blog-discovery.ts",import.meta.url),"utf8");
  assert.match(source,/r\.visitors_observed&&r\.visitors_source/);
  assert.match(source,/visitors_source=CASE WHEN EXCLUDED\.visitors_observed/);
});

test("reply reset is scoped and guarded by a confirmation token",()=>{
  const component=readFileSync(new URL("../src/components/blog-management.tsx",import.meta.url),"utf8"),actions=readFileSync(new URL("../src/app/workspaces/actions.ts",import.meta.url),"utf8"),repository=readFileSync(new URL("../src/lib/blog-discovery.ts",import.meta.url),"utf8");
  assert.match(component,/window\.confirm/);
  assert.match(component,/성장 기록과 이웃 데이터는 유지됩니다/);
  assert.match(actions,/confirmation"\)!=="RESET"/);
  assert.match(repository,/DELETE FROM blog_reply_items WHERE workspace_id=\$1/);
});
