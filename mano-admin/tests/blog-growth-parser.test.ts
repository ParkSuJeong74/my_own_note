import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

type GrowthParser = {
  parseGrowthDate(value:unknown):string|null;
  parseGrowthMetricLines(value:unknown,labels:string[]):number|null;
  parseGrowthNumber(value:unknown):number|null;
};
const {parseGrowthDate,parseGrowthMetricLines,parseGrowthNumber}=await import(new URL("../../browser-extensions/naver-blog-replies/growth-parser.js",import.meta.url).href) as GrowthParser;

test("parses the date selected in Naver statistics",()=>{
  assert.equal(parseGrowthDate("2026.09.03."),"2026-09-03");
  assert.equal(parseGrowthDate("2026년 9월 3일"),"2026-09-03");
  assert.equal(parseGrowthDate("2026.02.30."),null);
  assert.equal(parseGrowthDate("2026.09.03. 선택됨"),"2026-09-03");
});

test("accepts only standalone growth metric numbers",()=>{
  assert.equal(parseGrowthNumber("1,234"),1234);
  assert.equal(parseGrowthNumber("53명"),53);
  assert.equal(parseGrowthNumber("2026.09.03."),null);
  assert.equal(parseGrowthNumber("조회수 105"),null);
});

test("reads Naver's split label and value rows",()=>{
  const summary=`조회수\n동영상 재생수\n공감수\n댓글수\n이웃증가수\n105\n0\n34\n20\n0`;
  assert.equal(parseGrowthMetricLines(summary,["조회수"]),105);
  assert.equal(parseGrowthMetricLines("조회수 실시간 39\n동영상 재생수 0",["조회수"]),39);
  assert.equal(parseGrowthMetricLines("오늘 방문자\n53명\n전체글\n42",["오늘 방문자"]),53);
  assert.equal(parseGrowthMetricLines("2026.09.03.\n조회수",["조회수"]),null);
});

test("statistics never guesses visitors or posts from unrelated labels",()=>{
  const source=readFileSync(new URL("../../browser-extensions/naver-blog-replies/growth-parser.js",import.meta.url),"utf8");
  assert.match(source,/\?\{measuredOn,visitors:null,views:find\(\["조회수"\]\),posts:null,source:"STATISTICS"/);
});
