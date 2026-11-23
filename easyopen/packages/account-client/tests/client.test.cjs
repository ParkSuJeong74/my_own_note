const assert=require('node:assert/strict');const test=require('node:test');const {AccountClient}=require('../index.cjs');
const secret='a'.repeat(64),token='b'.repeat(64);
function fixture(responses){let stored=null;const calls=[];const storage={async ready(){},async get(){return stored;},async set(t){stored=t;},async clear(){stored=null;}};const client=new AccountClient(storage,'desktop',async(url,options)=>{assert.ok(url.startsWith('https://easyopen-api.mano.io.kr/'));assert.equal(options.redirect,'error');calls.push({url,options});const next=responses.shift();if(next instanceof Error)throw next;return new Response(JSON.stringify(next.body),{status:next.status??200});});return {client,storage,calls,getStored:()=>stored};}
const start={body:{deviceCode:secret,userCode:'ABCD-1234-5678'}};
test('only approved exchange stores a token; public state never leaks credentials',async()=>{
 const f=fixture([start,{status:400,body:{error:'authorization_pending'}},{body:{token}},{body:{email:'test@example.invalid',entitlements:[]}}]);
 assert.equal((await f.client.begin()).status,'pending');assert.equal(f.getStored(),null);
 assert.equal((await f.client.check()).status,'pending');
 const state=await f.client.check();assert.equal(state.status,'connected');assert.equal(state.email,'test@example.invalid');assert.equal(f.getStored(),token);assert.ok(!JSON.stringify(state).includes(token));assert.ok(!JSON.stringify(state).includes(secret));
});
test('expiry, network errors and revocation never grant cached entitlements',async()=>{
 const f=fixture([new Error('offline'),{status:401,body:{error:'unauthorized'}}]);await f.storage.set(token);
 assert.equal((await f.client.check()).status,'error');assert.equal(f.getStored(),token);
 assert.equal((await f.client.check()).status,'signed-out');assert.equal(f.getStored(),null);
});
test('logout cancels pending exchange and clears local storage even if server is offline',async()=>{
 const f=fixture([new Error('offline')]);await f.storage.set(token);const state=await f.client.logout();assert.equal(state.status,'signed-out');assert.equal(f.getStored(),null);assert.match(state.message,/7일/);
});
test('unsafe storage is rejected before creating a connection request',async()=>{
 const f=fixture([]);f.storage.ready=async()=>{throw new Error('unsafe');};await assert.rejects(f.client.begin(),/unsafe/);assert.equal(f.calls.length,0);
});
test('storage failure after exchange attempts revocation and does not expose token',async()=>{
 const f=fixture([start,{body:{token}},{body:{ok:true}}]);await f.client.begin();f.storage.set=async()=>{throw new Error('locked');};assert.equal((await f.client.check()).status,'error');assert.equal(f.calls.at(-1).options.method,'DELETE');assert.equal(f.getStored(),null);
});
test('redirected or malformed server payload cannot become an authenticated state',async()=>{
 const f=fixture([{body:{deviceCode:'bad',userCode:'bad'}}]);await assert.rejects(f.client.begin());assert.equal(f.getStored(),null);
});
test('pending connection expires locally without another exchange request',async()=>{
 const f=fixture([start]);await f.client.begin();f.client.pending.expires=0;assert.equal((await f.client.check()).status,'signed-out');assert.equal(f.calls.length,1);
});
test('queued logout cannot leave a token saved by an in-flight exchange',async()=>{
 const f=fixture([start,{body:{token}},{body:{email:'qa@example.invalid',entitlements:[]}},{body:{ok:true}}]);await f.client.begin();const checking=f.client.check();const logout=f.client.logout();await checking;await logout;assert.equal(f.getStored(),null);assert.equal(f.client.snapshot().status,'signed-out');
});
test('server-expired connection clears the public code and permits a fresh login',async()=>{
 const f=fixture([start,{status:400,body:{error:'expired_or_used'}},start]);await f.client.begin();const state=await f.client.check();assert.equal(state.status,'signed-out');assert.equal(state.userCode,null);assert.equal((await f.client.begin()).status,'pending');
});
test('local logout storage failure clears visible identity and entitlements without claiming success',async()=>{
 const f=fixture([{body:{email:'qa@example.invalid',entitlements:['commercial:cosyvoice-studio']}},{body:{ok:true}}]);await f.storage.set(token);await f.client.check();f.storage.clear=async()=>{throw new Error('locked');};const state=await f.client.logout();assert.equal(state.status,'error');assert.equal(state.email,null);assert.deepEqual(state.entitlements,[]);assert.equal(state.userCode,null);assert.equal(f.getStored(),token);assert.match(state.message,/삭제하지 못했습니다/);
});
