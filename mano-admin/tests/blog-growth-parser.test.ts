import assert from "node:assert/strict";
import test from "node:test";
import { parseGrowthDate, parseGrowthNumber } from "../../browser-extensions/naver-blog-replies/growth-parser.js";

test("parses the date selected in Naver statistics",()=>{
  assert.equal(parseGrowthDate("2026.09.03."),"2026-09-03");
  assert.equal(parseGrowthDate("2026년 9월 3일"),"2026-09-03");
  assert.equal(parseGrowthDate("2026.02.30."),null);
});

test("accepts only standalone growth metric numbers",()=>{
  assert.equal(parseGrowthNumber("1,234"),1234);
  assert.equal(parseGrowthNumber("53명"),53);
  assert.equal(parseGrowthNumber("2026.09.03."),null);
  assert.equal(parseGrowthNumber("조회수 105"),null);
});
