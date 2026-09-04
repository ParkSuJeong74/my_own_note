import assert from "node:assert/strict";
import test from "node:test";
import { blogNeighborPriority, blogReplySourceKey, nonNegativeMetric, optionalGrowthMetric, validNaverBlogUrl } from "../src/lib/blog-rules.ts";
import { drawNeighborIndex } from "../src/lib/blog-lottery.ts";

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
