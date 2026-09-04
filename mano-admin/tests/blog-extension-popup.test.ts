import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const popupHtml=readFileSync(new URL("../../browser-extensions/naver-blog-replies/popup.html",import.meta.url),"utf8");
const popupScript=readFileSync(new URL("../../browser-extensions/naver-blog-replies/popup.js",import.meta.url),"utf8");
const popupStyles=readFileSync(new URL("../../browser-extensions/naver-blog-replies/popup.css",import.meta.url),"utf8");
const manifest=JSON.parse(readFileSync(new URL("../../browser-extensions/naver-blog-replies/manifest.json",import.meta.url),"utf8"));

test("live status appears before controls and stays visible",()=>{
  assert.ok(popupHtml.indexOf('id="status"')<popupHtml.indexOf('id="baseUrl"'));
  assert.match(popupHtml,/aria-live="polite"/);
  assert.match(popupStyles,/output\{position:sticky/);
});

test("neighbor collection uses explicit controls for all three independent scopes",()=>{
  for(const scope of ["FOLLOWING","FOLLOWERS","REQUESTS"])assert.match(popupHtml,new RegExp(`data-neighbor-scope="${scope}"`));
  assert.doesNotMatch(popupHtml,/id="neighbors"/);
  assert.match(popupScript,/args:\[scope\]/);
  assert.match(popupScript,/next\.item\.click\(\)/);
  assert.match(popupScript,/value&&value!==previous/);
  assert.match(popupScript,/select\.dispatchEvent\(new Event\("change"/);
});

test("comment management collection has a dedicated paginated and batched path",()=>{
  assert.match(popupHtml,/id="managed-comments"/);
  assert.match(popupScript,/extractManagedComments/);
  assert.match(popupScript,/index\+=100/);
  assert.match(popupScript,/repliedComments:\[\]/);
  assert.match(popupScript,/querySelectorAll\("tr, li, article, div"\)/);
  assert.match(popupScript,/postUrl=`https:\/\/blog\.naver\.com/);
});

test("growth failure exposes inspected frame diagnostics",()=>{
  assert.ok(manifest.host_permissions.includes("https://*.naver.com/*"));
  assert.match(popupScript,/주입된 프레임 없음/);
  assert.match(popupScript,/debug\?\.host/);
});
