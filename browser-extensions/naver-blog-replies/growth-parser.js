export function parseGrowthNumber(value) {
  const normalized=String(value??"").replace(/,/g,"").trim();
  const match=normalized.match(/^(\d+)(?:\s*(?:명|회|개))?$/);
  return match?Number(match[1]):null;
}

export function parseGrowthDate(value) {
  const match=String(value??"").match(/(20\d{2})\s*(?:[.\-/년])\s*(\d{1,2})\s*(?:[.\-/월])\s*(\d{1,2})(?:\s*일)?/);
  if(!match)return null;
  const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]),date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day?`${match[1]}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`:null;
}

export function parseGrowthMetricLines(value,labels) {
  const lines=String(value??"").split(/\n+/).map(line=>line.replace(/\s+/g," ").trim()).filter(Boolean);
  for(let index=0;index<lines.length;index++){
    const label=labels.find(candidate=>lines[index]===candidate||lines[index].startsWith(`${candidate} `));
    if(!label)continue;
    const inline=parseGrowthNumber(lines[index].slice(label.length));if(inline!==null)return inline;
    for(const candidate of lines.slice(index+1,index+12)){const number=parseGrowthNumber(candidate);if(number!==null)return number;}
  }
  return null;
}

export function extractGrowth(){
  const number=value=>{const normalized=String(value??"").replace(/,/g,"").trim(),match=normalized.match(/^(\d+)(?:\s*(?:명|회|개))?$/);return match?Number(match[1]):null;};
  const normalized=value=>String(value??"").replace(/\s+/g," ").trim();
  const escaped=value=>value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const find=labels=>{
    for(const element of document.querySelectorAll("dt, dd, th, td, li, div, span, strong")){
      const text=normalized(element.textContent);if(!text||text.length>50)continue;
      for(const label of labels){
        if(text===label){
          const candidates=[element.nextElementSibling,...(element.parentElement?.children??[])];
          for(const candidate of candidates){if(candidate===element)continue;const value=number(candidate?.textContent);if(value!==null)return value;}
        }
        const inline=text.match(new RegExp(`^${escaped(label)}\\s+([\\d,]+)(?:\\s*(?:명|회|개))?$`));
        if(inline)return Number(inline[1].replace(/,/g,""));
      }
    }
    const lines=String(document.body?.innerText??"").split(/\n+/).map(line=>normalized(line)).filter(Boolean);
    for(let index=0;index<lines.length;index++){
      const label=labels.find(candidate=>lines[index]===candidate||lines[index].startsWith(`${candidate} `));if(!label)continue;
      const inline=number(lines[index].slice(label.length));if(inline!==null)return inline;
      for(const candidate of lines.slice(index+1,index+12)){const value=number(candidate);if(value!==null)return value;}
    }
    return null;
  };
  const parseDate=value=>{const match=String(value??"").match(/(20\d{2})\s*(?:[.\-/년])\s*(\d{1,2})\s*(?:[.\-/월])\s*(\d{1,2})(?:\s*일)?/);if(!match)return null;const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]),date=new Date(Date.UTC(year,month-1,day));return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day?`${match[1]}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`:null;};
  const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()),pageText=normalized(document.body?.innerText),statistics=location.hostname==="blog.stat.naver.com"||/일간 현황/.test(pageText)||(/조회수/.test(pageText)&&/공감수/.test(pageText)&&/이웃증가수/.test(pageText));
  let measuredOn=today;
  if(statistics){
    const dateElements=document.querySelectorAll("input[type='date'], time[datetime], [aria-current='date'], [aria-selected='true'], [class*='date'], [class*='calendar'], h1, h2, h3, strong");
    for(const element of dateElements){const candidate=parseDate(element.value||element.getAttribute?.("datetime")||element.textContent);if(candidate){measuredOn=candidate;break;}}
  }
  return statistics
    ?{measuredOn,visitors:find(["방문자","방문자수","순방문자"]),views:find(["조회수"]),posts:null,source:"STATISTICS"}
    :{measuredOn,visitors:find(["오늘 방문자","오늘 방문자수","방문자"]),views:null,posts:find(["전체글","전체 글","게시글"]),source:"BLOG_HOME"};
}
