import test from 'node:test';
import assert from 'node:assert/strict';
import {findJellyfinMacApp,isJellyfinLocalServerRunning,isPrivateIpv4,jellyfinLanUrl,jellyfinMacCandidates,readJellyfinMacStatus,selectLanIpv4} from '../electron/jellyfin.ts';

test('Jellyfin macOS 앱은 시스템과 사용자 Applications 경로만 탐색',()=>{
  assert.deepEqual(jellyfinMacCandidates('/Users/test'),['/Applications/Jellyfin.app','/Users/test/Applications/Jellyfin.app']);
});

test('첫 번째로 실제 접근 가능한 Jellyfin 앱만 반환',async()=>{
  const visited=[];
  const found=await findJellyfinMacApp('/Users/test',async path=>{visited.push(path);if(path.startsWith('/Applications/'))throw new Error('missing');});
  assert.equal(found,'/Users/test/Applications/Jellyfin.app');
  assert.equal(visited.length,2);
});

test('로컬 Jellyfin health는 성공한 JSON 응답만 실행 중으로 인정',async()=>{
  const json=async()=>new Response('{}',{status:200,headers:{'content-type':'application/json'}});
  const html=async()=>new Response('<html>',{status:200,headers:{'content-type':'text/html'}});
  assert.equal(await isJellyfinLocalServerRunning(json),true);
  assert.equal(await isJellyfinLocalServerRunning(html),false);
  assert.equal(await isJellyfinLocalServerRunning(async()=>{throw new Error('offline');}),false);
});

test('기존 설치 호환 감지와 사용 상태를 사용자 용어로 분리',async()=>{
  const status=await readJellyfinMacStatus('/Users/test',async()=>undefined,async()=>new Response('',{status:503}));
  assert.equal(status.installed,true);
  assert.equal(status.running,false);
  assert.match(status.message,/기존 Jellyfin.*멈춰/);
  assert.doesNotMatch(status.message,/설치되어/);
});

test('LAN 연결 주소는 사설 IPv4만 사용하고 en0를 우선',()=>{
  const entry=(address,internal=false)=>({address,netmask:'255.255.255.0',family:'IPv4',mac:'00:00:00:00:00:00',internal,cidr:`${address}/24`});
  assert.equal(isPrivateIpv4('192.168.0.7'),true);
  assert.equal(isPrivateIpv4('8.8.8.8'),false);
  assert.equal(selectLanIpv4({docker0:[entry('172.17.0.1')],en1:[entry('10.0.0.4')],en0:[entry('192.168.0.7')],lo0:[entry('127.0.0.1',true)]}),'192.168.0.7');
  assert.equal(selectLanIpv4({docker0:[entry('172.17.0.1')]}),null);
  assert.equal(jellyfinLanUrl('192.168.0.7'),'http://192.168.0.7:8096');
  assert.equal(jellyfinLanUrl('8.8.8.8'),null);
});
