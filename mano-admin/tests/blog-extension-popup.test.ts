import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const popupHtml=readFileSync(new URL("../../browser-extensions/naver-blog-replies/popup.html",import.meta.url),"utf8");
const popupScript=readFileSync(new URL("../../browser-extensions/naver-blog-replies/popup.js",import.meta.url),"utf8");
const popupStyles=readFileSync(new URL("../../browser-extensions/naver-blog-replies/popup.css",import.meta.url),"utf8");

test("live status appears before controls and stays visible",()=>{
  assert.ok(popupHtml.indexOf('id="status"')<popupHtml.indexOf('id="baseUrl"'));
  assert.match(popupHtml,/aria-live="polite"/);
  assert.match(popupStyles,/output\{position:sticky/);
});

test("neighbor collection uses explicit controls for all three independent scopes",()=>{
  for(const scope of ["FOLLOWING","FOLLOWERS","REQUESTS"])assert.match(popupHtml,new RegExp(`data-neighbor-scope="${scope}"`));
  assert.doesNotMatch(popupHtml,/id="neighbors"/);
  assert.match(popupScript,/args:\[scope\]/);
});

test("comment management collection has a dedicated paginated and batched path",()=>{
  assert.match(popupHtml,/id="managed-comments"/);
  assert.match(popupScript,/extractManagedComments/);
  assert.match(popupScript,/index\+=100/);
  assert.match(popupScript,/repliedComments:\[\]/);
});
