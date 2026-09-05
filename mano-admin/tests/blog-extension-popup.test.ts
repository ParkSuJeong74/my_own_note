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
  assert.match(popupScript,/args:\[scope,saved\.ownerBlogId\]/);
  assert.match(popupScript,/next\.item\.click\(\)/);
  assert.match(popupScript,/value&&value!==previous/);
  assert.match(popupScript,/select\.dispatchEvent\(new Event\("change"/);
  assert.match(popupScript,/extractNeighbors=extractNeighborPageV2/);
  assert.match(popupScript,/completeSnapshot:false/);
});

test("following neighbors are read from the dedicated endpoint and Naver param classes",async()=>{
  const source=popupScript.match(/async function extractNeighborPageV2\(scope,ownerId\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(source);
  const name={textContent:"이웃 이름"},row={className:"buddy_item _param(https://blog.naver.com|friend_1)",innerText:"이웃 이름 서로이웃",textContent:"",contains:()=>false,getAttribute:()=>"",querySelectorAll:()=>[],querySelector:()=>name};
  const parsedDocument={querySelectorAll:(selector:string)=>selector.startsWith("li, tr")?[row]:[]},document={querySelectorAll:()=>[]};
  class DOMParser{parseFromString(){return parsedDocument;}}
  const fetch=async(url:string)=>({ok:true,status:200,text:async()=>url});
  const result=await Function("document","location","fetch","DOMParser",`return (${source})("FOLLOWING","mano_s2")`)(document,{href:"https://admin.blog.naver.com/mano_s2/config/bloginfo"},fetch,DOMParser);
  assert.equal(result.debug.endpoint,true);
  assert.equal(result.neighbors[0].bloggerKey,"friend_1");
  assert.equal(result.neighbors[0].relation,"MUTUAL");
  assert.equal(result.neighbors[0].bloggerName,"이웃 이름");
});

test("following neighbor collection continues beyond Naver's first 50 rows",async()=>{
  const source=popupScript.match(/async function extractNeighborPageV2\(scope,ownerId\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(source);
  const rows=(start:number,count:number)=>Array.from({length:count},(_,offset)=>{const key=`friend_${start+offset}`,name={textContent:key};return{className:`buddy_item _param(https://blog.naver.com|${key})`,innerText:key,textContent:key,contains:()=>false,getAttribute:()=>"",querySelectorAll:()=>[],querySelector:()=>name};}),doc=(items:unknown[])=>({querySelectorAll:(selector:string)=>selector.startsWith("li, tr")?items:[]}),first=doc(rows(1,50)),second=doc(rows(51,31)),empty=doc([]),document={querySelectorAll:()=>[]};
  class DOMParser{parseFromString(value:string){return value==="second"?second:value==="empty"?empty:first;}}
  const fetch=async(url:string)=>{const page=new URL(url).searchParams.get("currentPage");return{ok:true,status:200,text:async()=>page==="2"?"second":page?"empty":"first"};};
  const result=await Function("document","location","fetch","DOMParser",`return (${source})("FOLLOWING","mano_s2")`)(document,{href:"https://admin.blog.naver.com/mano_s2/buddy/manage"},fetch,DOMParser);
  assert.equal(result.neighbors.length,81);
  assert.equal(result.pages,2);
  assert.equal(result.neighbors.at(-1).bloggerKey,"friend_81");
});

test("comment management collection has a dedicated paginated and batched path",()=>{
  assert.match(popupHtml,/id="managed-comments"/);
  assert.match(popupScript,/extractManagedComments/);
  assert.match(popupScript,/index\+=100/);
  assert.match(popupScript,/repliedComments:\[\]/);
  assert.match(popupScript,/querySelectorAll\("tr, li, article, div"\)/);
  assert.match(popupScript,/postUrl=`https:\/\/blog\.naver\.com/);
  assert.match(popupScript,/extractManagedCommentRows/);
  assert.match(popupScript,/frames\.map\(frame=>frame\.result\)\.filter\(Boolean\)/);
  assert.match(popupScript,/extractManagedCommentsAll/);
  assert.match(popupScript,/ownerTimes/);
  assert.match(popupScript,/extractManagedCommentRows=extractManagedCommentsV2/);
  assert.match(popupScript,/results=frames\.map\(frame=>frame\.result\)\.filter\(Boolean\)/);
  assert.match(popupScript,/entryMap=new Map/);
  assert.match(popupScript,/relativeDates/);
  assert.match(popupScript,/iframe\[src\]/);
  assert.match(popupScript,/AdminNaverCommentManageView/);
  assert.match(popupScript,/endpointUrls=/);
  assert.match(popupScript,/paginationParam/);
  assert.match(popupScript,/기존 \$\{completed\}개 완료/);
  assert.match(popupScript,/\(\?:\\\[글\\\]\\s\*\)\?/);
});

test("managed comments resolve relative time and a parent post link",async()=>{
  const source=popupScript.match(/async function extractManagedCommentsV2\(ownerId,collectedAt=Date\.now\(\)\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(source);
  const link={getAttribute:(name:string)=>name==="href"?"/mano/2233445566":""};
  const row={innerText:"방문자\nvisitor1\n최근 글 댓글입니다\n3분 전",textContent:"",parentElement:null,contains:()=>false,getAttribute:()=>"",querySelectorAll:()=>[link],querySelector:()=>null};
  const document={body:{innerText:row.innerText},querySelectorAll:(selector:string)=>selector==="tr, li, article, [class*='comment'], [class*='Comment']"?[row]:[]};
  const before=Date.now(),result=await Function("document","location",`return (${source})("mano")`)(document,{href:"https://admin.blog.naver.com/comments",hostname:"admin.blog.naver.com"}),after=Date.now(),entry=result.entries[0];
  assert.equal(entry.postUrl,"https://blog.naver.com/mano/2233445566");
  assert.equal(entry.commenter,"방문자");
  assert.ok(new Date(entry.commentedAt).getTime()>=before-3*60_000);
  assert.ok(new Date(entry.commentedAt).getTime()<=after-3*60_000);
});

test("managed comments skip entries whose post identity is unknown",async()=>{
  const source=popupScript.match(/async function extractManagedCommentsV2\(ownerId,collectedAt=Date\.now\(\)\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(source);
  const row={innerText:"방문자\nvisitor1\n댓글\n방금 전",textContent:"",parentElement:null,contains:()=>false,getAttribute:()=>"",querySelectorAll:()=>[],querySelector:()=>null};
  const document={body:{innerText:row.innerText},querySelectorAll:(selector:string)=>selector.startsWith("tr, li")?[row]:[]};
  const result=await Function("document","location",`return (${source})("mano")`)(document,{href:"https://admin.blog.naver.com/comments",hostname:"admin.blog.naver.com"});
  assert.deepEqual(result.entries,[]);
  assert.equal(result.debug.missingPosts,1);
});

test("managed comments use author links and remove title prefixes and exact repetition",async()=>{
  const source=popupScript.match(/async function extractManagedCommentsV2\(ownerId,collectedAt=Date\.now\(\)\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(source);
  const post={textContent:"글",getAttribute:(name:string)=>name==="href"?"https://blog.naver.com/mano/2233445566":""},author={textContent:"온모밀",getAttribute:(name:string)=>name==="href"?"https://blog.naver.com/visitor1":""},name={textContent:"온모밀"};
  const row={innerText:"온모밀\n[글] 남자친구와 신당에서의 하루 - 데이트코스 너무 알찬데요?데이트코스 너무 알찬데요?\n2026. 9. 5. 오전 11:45:00",textContent:"",parentElement:null,contains:()=>false,getAttribute:()=>"",querySelectorAll:()=>[post,author],querySelector:()=>name};
  const document={body:{innerText:row.innerText},querySelectorAll:(selector:string)=>selector.startsWith("tr, li")?[row]:[]};
  const result=await Function("document","location",`return (${source})("mano")`)(document,{href:"https://admin.blog.naver.com/comments",hostname:"admin.blog.naver.com"});
  assert.equal(result.entries[0].commenter,"온모밀");
  assert.equal(result.entries[0].commentExcerpt,"데이트코스 너무 알찬데요?");
});

test("managed comment collection continues past the recent first page",async()=>{
  const source=popupScript.match(/async function extractManagedCommentsV2\(ownerId,collectedAt=Date\.now\(\)\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(source);
  const rows=(start:number,count:number)=>Array.from({length:count},(_,offset)=>{const index=start+offset,post={getAttribute:(name:string)=>name==="href"?`https://blog.naver.com/mano/${2233440000+index}`:""};return{innerText:`이웃 ${index}\nvisitor_${index}\n[글] 제목 - 댓글 ${index}\n2026. 9. 5. 오전 11:45:00`,textContent:"",parentElement:null,contains:()=>false,getAttribute:()=>"",querySelectorAll:()=>[post],querySelector:()=>null};}),doc=(items:unknown[])=>({body:{innerText:"댓글 관리"},querySelectorAll:(selector:string)=>selector.startsWith("tr, li")?items:[]}),first=doc(rows(1,50)),second=doc(rows(51,20)),empty=doc([]);
  class DOMParser{parseFromString(value:string){return value==="second"?second:empty;}}
  const fetch=async(url:string)=>{const page=new URL(url).searchParams.get("currentPage");return{ok:true,status:200,text:async()=>page==="2"?"second":"empty"};};
  const location={href:"https://admin.blog.naver.com/AdminNaverCommentManageView.naver?blogId=mano",hostname:"admin.blog.naver.com"},result=await Function("document","location","fetch","DOMParser",`return (${source})("mano")`)(first,location,fetch,DOMParser);
  assert.equal(result.entries.length,70);
  assert.equal(result.pages,2);
  assert.equal(result.debug.paginationParam,"currentPage");
});

test("growth failure exposes inspected frame diagnostics",()=>{
  assert.ok(manifest.host_permissions.includes("https://*.naver.com/*"));
  assert.match(popupScript,/주입된 프레임 없음/);
  assert.match(popupScript,/debug\?\.host/);
});

test("blog tags can be collected from Naver tag management",()=>{
  assert.match(popupHtml,/id="tags"/);
  assert.match(popupScript,/extractBlogTags/);
  assert.match(popupScript,/\/api\/integrations\/blog\/tags/);
  assert.match(popupScript,/내 블로그 태그 관리 화면/);
  assert.match(popupScript,/managedFrames=frames\.filter\(frame=>frame\.result\?\.managed\)/);
  assert.match(popupScript,/managedFrames\.flatMap\(frame=>frame\.result\?\.tags/);
  assert.match(popupScript,/선택 \$\{value\?\.checkboxes/);
});

test("blog tag collection ignores hashed Naver service-menu links",()=>{
  const source=popupScript.match(/function extractBlogTags\(\)\{.*?\}(?=\nasync function extractManagedCommentsAll)/s)?.[0];
  assert.ok(source);
  const element=(text:string,href:string,className="")=>({
    innerText:text,textContent:text,className,
    getAttribute:(name:string)=>name==="href"?href:"",
    querySelector:()=>null,
  });
  const service=element("#네이버게임","https://www.naver.com/more.html"),
    realLink=element("#티원 12","/PostList.naver?tagName=%ED%8B%B0%EC%9B%90","tag_item"),
    realRow=element("#가족여행 (3)","","TagList_item");
  const document={
    body:{innerText:"글 관리 태그 최근순 인기순 가나다순 #네이버게임 #티원 #가족여행"},
    querySelectorAll:(selector:string)=>selector.startsWith("input")?[]:[service,realLink,realRow],
  };
  const result=Function("document","location",`return (${source})()`)(document,{href:"https://admin.blog.naver.com/tag",hostname:"admin.blog.naver.com"});
  assert.deepEqual(result.tags,["티원","가족여행"]);
  assert.equal(result.managed,true);
});

test("blog tag collection does not fall back to page-wide hashes outside tag management",()=>{
  const source=popupScript.match(/function extractBlogTags\(\)\{.*?\}(?=\nasync function extractManagedCommentsAll)/s)?.[0];
  assert.ok(source);
  const service={innerText:"#날씨",textContent:"#날씨",className:"",getAttribute:()=>"https://weather.naver.com",querySelector:()=>null};
  const document={body:{innerText:"사용자 링크 서비스 더보기 #날씨"},querySelectorAll:(selector:string)=>selector.startsWith("input")?[]:[service]};
  const result=Function("document","location",`return (${source})()`)(document,{href:"https://blog.naver.com/example",hostname:"blog.naver.com"});
  assert.deepEqual(result.tags,[]);
  assert.equal(result.managed,false);
});

test("API calls normalize the Mano origin and explain HTML responses",()=>{
  assert.match(popupScript,/new URL\(saved\.baseUrl\)\.origin/);
  assert.match(popupScript,/새 태그 API가 서버에 없어요/);
  assert.match(popupScript,/response\.url\|\|endpoint/);
});
