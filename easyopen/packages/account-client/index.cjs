const ORIGIN='https://easyopen-api.mano.io.kr';
class AccountClient{
  constructor(storage,platform,fetcher=fetch){this.storage=storage;this.platform=platform;this.fetcher=fetcher;this.pending=null;this.queue=Promise.resolve();this.state={status:'signed-out',email:null,entitlements:[],userCode:null,message:'앱 계정을 연결할 수 있습니다.'};}
  run(work){const result=this.queue.then(work);this.queue=result.catch(()=>{});return result;}
  snapshot(){return {...this.state,entitlements:[...this.state.entitlements]};}
  async request(path,options={}){const response=await this.fetcher(ORIGIN+path,{...options,redirect:'error',signal:AbortSignal.timeout(10000),headers:{'content-type':'application/json',...options.headers}});const body=await response.json();return {response,body};}
  begin(){return this.run(async()=>{
    await this.storage.ready();
    if(await this.storage.get())throw new Error('먼저 현재 계정에서 로그아웃해 주세요.');
    const {response,body}=await this.request('/v1/auth/device/start',{method:'POST',body:JSON.stringify({platform:this.platform})});
    if(!response.ok||!/^[a-f0-9]{64}$/.test(body.deviceCode)||!/^([A-F0-9]{4}-){2}[A-F0-9]{4}$/.test(body.userCode))throw new Error('계정 연결을 시작하지 못했습니다. 서버 배포 상태와 네트워크를 확인하세요.');
    this.pending={deviceCode:body.deviceCode,expires:Date.now()+600000};
    this.state={status:'pending',email:null,entitlements:[],userCode:body.userCode,message:'브라우저에서 이 코드를 입력하고 연결을 승인하세요. 10분 동안 유효합니다.'};
    return this.snapshot();
  });}
  check(){return this.run(async()=>{
    try{
      if(this.pending){
        if(Date.now()>=this.pending.expires){this.pending=null;this.state={status:'signed-out',email:null,entitlements:[],userCode:null,message:'연결 시간이 만료됐습니다. 다시 시작하세요.'};return this.snapshot();}
        const {response,body}=await this.request('/v1/auth/device/exchange',{method:'POST',body:JSON.stringify({deviceCode:this.pending.deviceCode})});
        if(body.error==='authorization_pending'||body.error==='slow_down')return this.snapshot();
        if(!response.ok){if(body.error==='expired_or_used'){this.pending=null;this.state={status:'signed-out',email:null,entitlements:[],userCode:null,message:'연결 코드가 만료되었거나 이미 사용됐습니다. 다시 연결하세요.'};return this.snapshot();}throw new Error('연결을 확인하지 못했습니다. 잠시 후 다시 확인하세요.');}
        if(!/^[a-f0-9]{64}$/.test(body.token))throw new Error('잘못된 서버 응답입니다.');
        try{await this.storage.set(body.token);}catch(error){try{await this.request('/v1/auth/device/session',{method:'DELETE',headers:{authorization:'Bearer '+body.token}});}catch{}this.pending=null;throw error;}this.pending=null;
      }
      const token=await this.storage.get();
      if(!token){if(this.state.status!=='signed-out')this.state={status:'signed-out',email:null,entitlements:[],userCode:null,message:'앱 계정을 연결할 수 있습니다.'};return this.snapshot();}
      const {response,body}=await this.request('/v1/auth/device/session',{headers:{authorization:'Bearer '+token}});
      if(response.status===401){await this.storage.clear();this.state={status:'signed-out',email:null,entitlements:[],userCode:null,message:'로그인이 만료됐습니다. 다시 연결하세요.'};return this.snapshot();}
      if(!response.ok||typeof body.email!=='string'||!Array.isArray(body.entitlements)||!body.entitlements.every(key=>typeof key==='string'))throw new Error('계정 정보를 조회하지 못했습니다. 다시 확인하세요.');
      this.state={status:'connected',email:body.email,entitlements:body.entitlements,userCode:null,message:'이 기기에서 계정 연결을 확인했습니다.'};
    }catch(error){this.state={...this.state,status:this.pending?'pending':'error',entitlements:[],message:error instanceof Error?error.message:'계정 연결을 확인하지 못했습니다.'};}
    return this.snapshot();
  });}
  logout(){return this.run(async()=>{
    this.pending=null;let revoked=true;
    let token=null;try{token=await this.storage.get();}catch{revoked=false;}
    if(token)try{revoked=(await this.request('/v1/auth/device/session',{method:'DELETE',headers:{authorization:'Bearer '+token}})).response.ok;}catch{revoked=false;}
    try{await this.storage.clear();}catch{this.state={status:'error',email:null,entitlements:[],userCode:null,message:'기기의 계정 저장 정보를 삭제하지 못했습니다. 저장소 잠금을 해제한 뒤 다시 로그아웃하세요.'};return this.snapshot();}
    this.state={status:'signed-out',email:null,entitlements:[],userCode:null,message:revoked?'앱에서 로그아웃했습니다. 브라우저 로그인은 별도로 유지됩니다.':'이 기기에서 로그아웃했습니다. 서버에 연결하지 못해 서버 세션은 최대 7일간 남을 수 있습니다.'};return this.snapshot();
  });}
}
module.exports={AccountClient};
