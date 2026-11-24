import {useEffect,useState} from 'react';
import type {AccountState} from '@easyopen/account-client';
export function AccountPanel(){
  const [state,setState]=useState<AccountState|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function action(kind:'accountState'|'accountConnect'|'accountLogout'){
    if(!window.easyopen)return;
    setBusy(true);setError('');
    try{setState(await window.easyopen[kind]());}catch{setError('계정 연결을 처리하지 못했습니다. 안전한 저장소와 네트워크를 확인하세요.');}finally{setBusy(false);}
  }
  useEffect(()=>{void action('accountState');},[]);
  useEffect(()=>{if(state?.status!=='pending')return;const timer=setInterval(()=>{if(!busy)void action('accountState');},5500);return()=>clearInterval(timer);},[state?.status,busy]);
  if(!window.easyopen)return <section className="online-workspace-card"><p>계정 연결은 설치한 EasyOpen 앱에서 이용할 수 있습니다.</p></section>;
  return <section className="online-workspace-card"><div className="account-copy"><span className="micro-label">EASYOPEN ACCOUNT</span><h2>이 기기의 계정 연결</h2>{state?.email&&<p>{state.email}</p>}<p role="status">{error||state?.message||'계정 상태를 확인하고 있습니다.'}</p>{state?.userCode&&<p>연결 코드: <strong>{state.userCode}</strong></p>}{state?.status==='connected'&&<p>{state.entitlements.length?'등록된 이용 권한: '+state.entitlements.join(', '):'등록된 유료 이용 권한이 없습니다.'}</p>}<p>무료 프로그램은 계정 연결 없이 이용할 수 있습니다.</p></div><div className="account-actions">{state?.status==='signed-out'&&<button className="soft-action" disabled={busy} onClick={()=>void action('accountConnect')}>Google 계정 연결 ↗</button>}{state?.status==='pending'&&<button className="soft-action" disabled={busy} onClick={()=>{void window.easyopen?.accountVerification().catch(()=>setError('브라우저를 열지 못했습니다.'));}}>브라우저에서 승인하기 ↗</button>}<button className="soft-action" disabled={busy} onClick={()=>void action('accountState')}>연결 상태 확인</button>{state&&state.status!=='signed-out'&&<button className="soft-action" disabled={busy} onClick={()=>void action('accountLogout')}>{state.status==='pending'?'연결 취소':'앱 로그아웃'}</button>}</div></section>;
}
