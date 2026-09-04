import { createHash } from "node:crypto";

export const replyPromisePattern = /(답방\s*(?:무조건|100\s*%|꼭|갑니다|가요|보장)|댓글\s*답방|공감\s*답방|늦어도\s*답방)/i;
export const mutualNeighborPattern = /(서이추(?:환영|해요|구해요)?|서로\s*이웃(?:추가|환영)?|이웃\s*(?:추가\s*환영|추가|환영))/i;
export const socialNeighborPattern = /(이웃\s*소통|소통\s*(?:환영|해요)|답방\s*(?:가요|환영)?)/i;

export type CollectedBlogReply = {
  postUrl: string;
  commenter: string;
  commentExcerpt: string;
  commentedAt: string;
};

export function validNaverBlogUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "blog.naver.com" || url.hostname === "m.blog.naver.com");
  } catch {
    return false;
  }
}

export function nonNegativeMetric(value: unknown) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

export function blogNeighborPriority(text: string) {
  return replyPromisePattern.test(text) ? 0 : mutualNeighborPattern.test(text) ? 1 : socialNeighborPattern.test(text) ? 2 : 3;
}

export function blogReplySourceKey(item: CollectedBlogReply) {
  return createHash("sha256")
    .update([item.postUrl.trim(), item.commenter.trim(), item.commentedAt.trim(), item.commentExcerpt.trim()].join("\n"))
    .digest("hex");
}
