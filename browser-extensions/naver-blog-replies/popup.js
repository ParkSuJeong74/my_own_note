const baseUrl=document.querySelector("#baseUrl"),token=document.querySelector("#token"),status=document.querySelector("#status");
chrome.storage.local.get(["baseUrl","token"],saved=>{if(saved.baseUrl)baseUrl.value=saved.baseUrl;if(saved.token)token.value=saved.token;});
document.querySelector("#save").addEventListener("click",async()=>{await chrome.storage.local.set({baseUrl:baseUrl.value.replace(/\/+$/,""),token:token.value});status.textContent="설정을 저장했어요.";});
function extractVisibleComments(){
  const postUrl=(document.querySelector('link[rel="canonical"]')?.href||location.href).replace(/^http:/,"https:");
  const containers=[...document.querySelectorAll(".u_cbox_comment_box, .comment_item, [class*='CommentItem']")];
  const parseDate=raw=>{const direct=Date.parse(raw);if(!Number.isNaN(direct))return new Date(direct).toISOString();const normalized=raw.replace(/\.\s*/g,"-").replace(/-\s+(\d{1,2}:\d{2})/," $1").replace(/-\s*$/," ").trim();const parsed=Date.parse(normalized);if(!Number.isNaN(parsed))return new Date(parsed).toISOString();return null;};
  return containers.filter(element=>element.getClientRects().length>0&&!element.closest(".u_cbox_reply_area, [class*='reply_area']")).map(element=>{
    const text=selector=>element.querySelector(selector)?.textContent?.trim()||"";
    const rawDate=text(".u_cbox_date, .comment_info_date, [class*='date']");
    return {postUrl,commenter:text(".u_cbox_nick, .comment_nickname, [class*='nickname'], [class*='name']"),commentExcerpt:text(".u_cbox_contents, .comment_text, [class*='content']").slice(0,500),commentedAt:parseDate(rawDate)};
  }).filter(item=>item.commenter&&item.commentExcerpt&&item.commentedAt);
}
document.querySelector("#collect").addEventListener("click",async()=>{
  status.textContent="댓글을 확인하는 중…";
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  if(!tab?.id||!/^https:\/\/(m\.)?blog\.naver\.com\//.test(tab.url||"")){status.textContent="네이버 블로그 글에서 실행해 주세요.";return;}
  const frames=await chrome.scripting.executeScript({target:{tabId:tab.id,allFrames:true},func:extractVisibleComments});
  const map=new Map();for(const frame of frames)for(const item of frame.result||[])map.set([item.postUrl,item.commenter,item.commentedAt,item.commentExcerpt].join("|"),item);
  const comments=[...map.values()];if(!comments.length){status.textContent="보이는 댓글을 찾지 못했어요. 댓글 영역을 먼저 펼쳐 주세요.";return;}
  const settings=await chrome.storage.local.get(["baseUrl","token"]);if(!settings.baseUrl||!settings.token){status.textContent="Mano 주소와 토큰을 먼저 저장해 주세요.";return;}
  try{const response=await fetch(`${settings.baseUrl}/api/integrations/blog/replies`,{method:"POST",headers:{authorization:`Bearer ${settings.token}`,"content-type":"application/json"},body:JSON.stringify({comments})});const result=await response.json();if(!response.ok)throw new Error(result.error||`HTTP ${response.status}`);status.textContent=`${result.accepted}개 추가 · ${result.skipped}개 중복/제외`;}catch(error){status.textContent=`전송 실패: ${error.message}`;}
});
