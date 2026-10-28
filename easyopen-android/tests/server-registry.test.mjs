import {test} from 'node:test';
import assert from 'node:assert/strict';
import {addServer,emptyServerRegistry,isAllowedJellyfinNavigation,jellyfinWebUrl,normalizeLanServerUrl,parseServerRegistry,removeServer,setDefaultServer,updateServerStatus} from '../src/server-registry.ts';

test('사설 LAN 주소와 local 이름만 8096으로 정규화',()=>{
  assert.equal(normalizeLanServerUrl('192.168.0.8'),'http://192.168.0.8:8096');
  assert.equal(normalizeLanServerUrl('http://easyopen-mac.local:8096/'),'http://easyopen-mac.local:8096');
  assert.equal(normalizeLanServerUrl('https://192.168.0.8:8096'),null);
  assert.equal(normalizeLanServerUrl('http://8.8.8.8:8096'),null);
  assert.equal(normalizeLanServerUrl('http://192.168.0.8:9000'),null);
});

test('여러 서버 등록과 기본 서버 전환',()=>{
  let registry=addServer(emptyServerRegistry(),{id:'windows-a',name:'Windows PC',url:'10.0.0.2'});
  registry=addServer(registry,{id:'mac-b',name:'MacBook',url:'10.0.0.3'});
  assert.equal(registry.defaultServerId,'windows-a');
  assert.equal(setDefaultServer(registry,'mac-b').defaultServerId,'mac-b');
});

test('같은 ID 또는 주소는 중복 대신 갱신',()=>{
  let registry=addServer(emptyServerRegistry(),{id:'one',name:'Old',url:'192.168.1.2'});
  registry=addServer(registry,{id:'one',name:'New',url:'192.168.1.3'});
  assert.equal(registry.servers.length,1);
  assert.equal(registry.servers[0].name,'New');
});

test('기본 서버 제거 시 남은 서버를 기본값으로 선택',()=>{
  let registry=addServer(emptyServerRegistry(),{id:'one',name:'One',url:'192.168.1.2'});
  registry=addServer(registry,{id:'two',name:'Two',url:'192.168.1.3'});
  registry=removeServer(registry,'one');
  assert.equal(registry.defaultServerId,'two');
});

test('상태 갱신과 손상된 저장값 복구',()=>{
  let registry=addServer(emptyServerRegistry(),{id:'one',name:'One',url:'172.16.0.2'});
  registry=updateServerStatus(registry,'one','online','2026-10-27T00:00:00.000Z');
  assert.equal(registry.servers[0].status,'online');
  assert.deepEqual(parseServerRegistry({servers:[{id:'bad',name:'Bad',url:'https://example.com'}]}),emptyServerRegistry());
});

test('Jellyfin 화면은 등록한 서버의 같은 origin 안에서만 이동',()=>{
  const server='http://192.168.1.20:8096';
  assert.equal(jellyfinWebUrl(server),'http://192.168.1.20:8096/web/index.html');
  assert.equal(isAllowedJellyfinNavigation(server,'http://192.168.1.20:8096/web/index.html#!/home.html'),true);
  assert.equal(isAllowedJellyfinNavigation(server,'http://192.168.1.20:8096/Items/1'),true);
  assert.equal(isAllowedJellyfinNavigation(server,'http://192.168.1.21:8096/web/index.html'),false);
  assert.equal(isAllowedJellyfinNavigation(server,'https://example.com'),false);
  assert.equal(isAllowedJellyfinNavigation(server,'javascript:alert(1)'),false);
});
