import assert from 'node:assert/strict';
import test from 'node:test';
import {probeJellyfin,readJellyfinContainerStatus} from '../electron/jellyfin-container-status.ts';

const container={id:'abc',name:'easyopen-jellyfin',image:'approved',status:'Up',state:'running'};
test('Docker 조회 실패는 미설치와 구분한다',async()=>{
 const result=await readJellyfinContainerStatus(async()=>{throw Error('daemon down')});
 assert.equal(result.state,'unknown');assert.equal(result.running,false);
});
test('관리 컨테이너가 없으면 다른 서버가 응답해도 실행 중으로 표시하지 않는다',async()=>{
 let probes=0;
 const result=await readJellyfinContainerStatus(async()=>[],async()=>{probes++;return true});
 assert.equal(result.state,'missing');assert.equal(probes,0);
});
test('중지된 컨테이너와 실행 중이지만 준비되지 않은 컨테이너를 구분한다',async()=>{
 assert.equal((await readJellyfinContainerStatus(async()=>[{...container,state:'exited'}],async()=>true)).state,'stopped');
 assert.equal((await readJellyfinContainerStatus(async()=>[container],async()=>false)).state,'starting');
 assert.equal((await readJellyfinContainerStatus(async()=>[container],async()=>{throw Error()})).state,'starting');
 assert.equal((await readJellyfinContainerStatus(async()=>[container],async()=>true)).state,'running');
});
test('health는 Jellyfin public metadata만 허용한다',async()=>{
 const response=(value,status=200,type='application/json')=>async()=>new Response(JSON.stringify(value),{status,headers:{'content-type':type}});
 assert.equal(await probeJellyfin(response({Id:'server',ServerName:'Jellyfin'})),true);
 assert.equal(await probeJellyfin(response({ok:true})),false);
 assert.equal(await probeJellyfin(response({Id:'',ServerName:'server'})),false);
 assert.equal(await probeJellyfin(response({Id:'x',ServerName:'name'},503)),false);
 assert.equal(await probeJellyfin(response({Id:'x',ServerName:'name'},200,'text/html')),false);
 assert.equal(await probeJellyfin(async()=>{throw Error('connection refused')}),false);
});
