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

export function optionalGrowthMetric(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  return nonNegativeMetric(typeof value === "string" ? value.replaceAll(",", "").trim() : value);
}

export function blogNeighborPriority(text: string) {
  return replyPromisePattern.test(text) ? 0 : mutualNeighborPattern.test(text) ? 1 : socialNeighborPattern.test(text) ? 2 : 3;
}

export function blogReplySourceKey(item: CollectedBlogReply) {
  const normalizedText=(value:string)=>value.normalize("NFKC").replace(/\s+/g," ").trim().toLowerCase();
  const canonicalPost=()=>{try{const url=new URL(item.postUrl),parts=url.pathname.split("/").filter(Boolean),blogId=(url.searchParams.get("blogId")||(!/\.naver$/i.test(parts[0]||"")?parts[0]:"")||"").toLowerCase(),logNo=url.searchParams.get("logNo")||parts.find((part,index)=>index>0&&/^\d+$/.test(part))||"";return blogId&&logNo?`${blogId}/${logNo}`:`${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/,"")}`;}catch{return item.postUrl.trim().toLowerCase();}};
  const date=new Date(item.commentedAt),minute=Number.isNaN(date.getTime())?normalizedText(item.commentedAt):String(Math.floor(date.getTime()/60_000));
  return createHash("sha256")
    .update([canonicalPost(), normalizedText(item.commenter), minute, normalizedText(item.commentExcerpt)].join("\n"))
    .digest("hex");
}

export function groupBlogReplyDuplicates<T extends CollectedBlogReply>(items:T[]){
  const groups=new Map<string,T[]>();
  for(const item of items){const key=blogReplySourceKey(item),group=groups.get(key)??[];group.push(item);groups.set(key,group);}
  return groups;
}

export function earliestBlogReplyDate(values: Array<Date | null>) {
  return values.filter((value): value is Date => value !== null).sort((a,b)=>a.getTime()-b.getTime())[0] ?? null;
}
