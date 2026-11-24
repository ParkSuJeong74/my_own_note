import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {mkdir} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
const require=createRequire(new URL('../apps/web/package.json',import.meta.url));const {chromium}=require('@playwright/test');
const directory=fileURLToPath(new URL('../apps/mobile/dist-web/',import.meta.url));
const server=spawn('python3',['-m','http.server','4286','--bind','127.0.0.1','--directory',directory],{stdio:'ignore'});
let browser;
try{
 let ready=false;for(let i=0;i<60;i++){if(server.exitCode!==null)throw new Error('Preview server exited');try{ready=(await fetch('http://127.0.0.1:4286')).ok;}catch{}if(ready)break;await delay(250);}assert.ok(ready);
 if(process.env.EASYOPEN_SCREENSHOT_DIR)await mkdir(process.env.EASYOPEN_SCREENSHOT_DIR,{recursive:true});
 browser=await chromium.launch();let checks=0;
 for(const width of [320,390,768]){
  const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://catalog.easy-open.mano.io.kr/**',route=>route.abort());
  await page.goto('http://127.0.0.1:4286');await page.getByText('PC 연결하기',{exact:true}).waitFor();await page.getByTestId('startup-splash').waitFor({state:'hidden'});
  await page.getByText('레이아웃 미리보기',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(width===390&&process.env.EASYOPEN_SCREENSHOT_DIR)await page.screenshot({path:process.env.EASYOPEN_SCREENSHOT_DIR+'/mobile-home.png'});
  for(const [name,label] of [['내 PC','서버 기기 이름'],['찾기','Jellyfin 상세 보기'],['설정','이 기기의 계정 연결']]){
   await page.getByRole('tab',{name,exact:true}).click();
   if(name==='내 PC')await page.getByRole('textbox',{name:label}).waitFor();else if(name==='찾기')await page.getByRole('button',{name:label}).waitFor();else await page.getByText(label,{exact:true}).waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,name+' at '+width);
   if(width===390&&process.env.EASYOPEN_SCREENSHOT_DIR)await page.screenshot({path:process.env.EASYOPEN_SCREENSHOT_DIR+'/mobile-'+(name==='내 PC'?'connection':name==='찾기'?'discover':'settings')+'.png'});
   checks++;
  }
  await page.getByRole('tab',{name:'찾기',exact:true}).click();await page.getByRole('button',{name:'Jellyfin 상세 보기'}).click();await page.getByRole('button',{name:'프로그램 상세 닫기'}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'detail '+width);
  if(width===390&&process.env.EASYOPEN_SCREENSHOT_DIR)await page.screenshot({path:process.env.EASYOPEN_SCREENSHOT_DIR+'/mobile-detail.png'});
  await page.getByRole('button',{name:'프로그램 상세 닫기'}).click();
  await page.getByRole('tab',{name:'홈',exact:true}).click();
  await page.evaluate(()=>{for(const element of document.querySelectorAll('[dir="auto"]')){const style=getComputedStyle(element);const font=parseFloat(style.fontSize),line=parseFloat(style.lineHeight);element.style.fontSize=font*2+'px';if(Number.isFinite(line))element.style.lineHeight=line*2+'px';}});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'large text '+width);
  assert.deepEqual(errors,[]);checks+=3;await page.close();
 }
 console.log(checks+' React Native Web layout checks passed. Native touch, storage and playback remain device QA.');
}finally{if(browser)await browser.close();server.kill();}
