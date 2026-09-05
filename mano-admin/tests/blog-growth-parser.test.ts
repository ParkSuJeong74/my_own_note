import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

type GrowthParser = {
  parseGrowthDate(value:unknown):string|null;
  parseGrowthMetricLines(value:unknown,labels:string[]):number|null;
  parseGrowthNumber(value:unknown):number|null;
};
const {parseGrowthDate,parseGrowthMetricLines,parseGrowthNumber}=await import(new URL("../../browser-extensions/naver-blog-replies/growth-parser.js",import.meta.url).href) as GrowthParser;
const growthSource=readFileSync(new URL("../../browser-extensions/naver-blog-replies/growth-parser.js",import.meta.url),"utf8");

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
  assert.match(growthSource,/\?\{measuredOn,visitors:null,views:find\(\["조회수"\]\),posts:null,source:"STATISTICS"/);
});

test("reads the statmain iframe directly when only the outer admin page is injected",async()=>{
  const source=growthSource.match(/export async function extractGrowth\(\)\{[\s\S]*?\n\}/)?.[0].replace(/^export /,"");
  assert.ok(source);
  const iframe={getAttribute:(name:string)=>name==="src"?"https://blog.stat.naver.com/blog/daily/daily/cv?blogId=mano_s2":""},outer={body:{innerText:"일간 현황 조회수"},querySelectorAll:(selector:string)=>selector==="iframe[src]"?[iframe]:[]},inner={body:{innerText:"2026.09.05.\n조회수\n123\n공감수\n4\n이웃증가수\n0"},querySelectorAll:()=>[]};
  class DOMParser{parseFromString(){return inner;}}
  const fetch=async()=>({ok:true,text:async()=>"stat html"});
  const result=await Function("document","location","fetch","DOMParser",`return (${source})()`)(outer,{href:"https://admin.blog.naver.com/mano_s2/stat/today"},fetch,DOMParser);
  assert.equal(result.measuredOn,"2026-09-05");
  assert.equal(result.views,123);
  assert.equal(result.source,"STATISTICS");
  assert.equal(result.debug.direct,true);
});
