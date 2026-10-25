import {useEffect,useMemo,useState} from 'react';
import {ArrowDownToLine,ArrowLeft,ArrowRight,BookOpen,CheckCircle2,ChevronDown,ChevronRight,CircleHelp,CloudDownload,Command,Compass,ExternalLink,FileText,Filter,HardDrive,Info,LayoutGrid,Monitor,Package,RefreshCw,Search,Settings2,ShieldCheck,SlidersHorizontal,Smartphone, Sparkles, X, Zap} from 'lucide-react';
import data from '../resources/catalog.json';
import type {Action,CatalogApp,Machine} from './types';
const apps=data as CatalogApp[];
type Tab='discover'|'installed'|'updates'|'library';
type InstallStatus='installed'|'not-installed'|'unknown';
const labels:Record<Tab,string>={discover:'둘러보기',installed:'내 프로그램',updates:'업데이트',library:'라이브러리'};
const icons:Record<string,string>={'AI · 음성':'🎙','AI · 모델':'✦','영상 · 방송':'▣','파일 · 공유':'↔','문서 · 업무':'▤','여행 · 지도':'⌖','학습 · 생산성':'◈'};
const kinds:Record<Action,string>={install:'설치',update:'업데이트',remove:'제거'};
function iconName(app:CatalogApp){return icons[app.category]??'◇'}
const osOk=(a:CatalogApp)=>a.os.includes('windows');
function AppTile({app,status,onSelect}: {app:CatalogApp;status:InstallStatus;onSelect:()=>void}) {
  return <button className="app-tile" onClick={onSelect}>
    <span className={'app-symbol symbol-'+app.id}>{iconName(app)}</span>
    <span className="app-meta"><strong>{app.name}</strong><small>{app.summary}</small><span className="chips"><span className="chip">{app.category}</span>{app.id==='cosyvoice'&&<span className="chip violet">필수 지원 예정</span>}</span></span>
    <span className="tile-foot">{status==='installed'?<span className="green-dot">설치 감지</span>:<span>{app.install.windows?.method==='winget'?'Windows 시험 지원':'공식 가이드'}</span>}<ChevronRight size={17}/></span>
  </button>
}
function App(){
  const [tab,setTab]=useState<Tab>('discover');
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('전체');
  const [selected,setSelected]=useState<CatalogApp|null>(null);
  const [advanced,setAdvanced]=useState(false);
  const [machine,setMachine]=useState<Machine|null>(null);
  const [status,setStatus]=useState<Record<string,InstallStatus>>({});
  const [confirm,setConfirm]=useState<{app:CatalogApp;kind:Action}|null>(null);
  const [busy,setBusy]=useState(false);
  const [log,setLog]=useState('');
  const [notice,setNotice]=useState('');
  const [favorites,setFavorites]=useState<string[]>(()=>{try{return JSON.parse(localStorage.getItem('easyopen-favorites')||'[]')}catch{return []}});
  useEffect(()=>{localStorage.setItem('easyopen-favorites',JSON.stringify(favorites));},[favorites]);
  const onRefresh=async()=>{
    if(!window.easyopen){setNotice('브라우저 미리보기에서는 설치 상태를 조회할 수 없습니다. Electron으로 실행하세요.');return;}
    const m=await window.easyopen.machine();
    const results=await Promise.all(apps.map(a=>window.easyopen!.status(a.id)));
    setMachine(m);setStatus(Object.fromEntries(apps.map((a,i)=>[a.id,results[i]])));
  };
  useEffect(()=>{void onRefresh();const off=window.easyopen?.onLog((_id,msg)=>setLog(p=>(p+'\n'+msg).slice(-7000)));return off;},[]);
  const categories=['전체',...new Set(apps.filter(osOk).map(a=>a.category))];
  const filtered=useMemo(()=>apps.filter(a=>osOk(a)&&(category==='전체'||a.category===category)&&((a.name+a.summary+a.category).toLowerCase().includes(query.trim().toLowerCase()))),[category,query]);
  const displayed=tab==='installed'?filtered.filter(a=>status[a.id]==='installed') : tab==='library'?filtered.filter(a=>favorites.includes(a.id)):filtered;
  const canManage=(app:CatalogApp)=> Boolean(window.easyopen&&machine?.platform==='win32'&&app.install.windows?.method==='winget');
  function toggleSave(id:string){setFavorites(list=>list.includes(id)?list.filter(x=>x!==id):[...list,id]);}
  async function official(app:CatalogApp){if(window.easyopen){await window.easyopen.official(app.id)}else{window.open(app.officialUrl,'_blank','noopener,noreferrer')}}
  async function run(){if(!confirm||busy)return;const {app,kind}=confirm;setConfirm(null);setBusy(true);setLog('작업을 시작합니다...');setNotice('');try{
    if(!window.easyopen)throw new Error('Electron 앱에서만 실행할 수 있어요.');
    const res=await window.easyopen.action(app.id,kind);
    setNotice(res.ok?`${app.name}: ${kinds[kind]} 명령이 완료되었어요. 실제 상태를 확인하세요.`:`${app.name}: ${res.message||'작업이 실패했습니다.'}`);
    await onRefresh();
  }catch(e){setNotice(e instanceof Error?e.message:'알 수 없는 오류')}finally{setBusy(false)}}
  const title=tab==='discover'?'좋은 도구를 더 쉽게.':tab==='installed'?'내 프로그램을 한눈에.':tab==='updates'?'업데이트를 놓치지 않게.':'나만의 도구 모음.';
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><span className="brandmark"><Package size={21}/></span><div><strong>EasyOpen</strong><small>by MANO</small></div></div>
      <div className="side-caption">워크스페이스</div>
      <nav aria-label="주 메뉴">{([['discover',Compass],['installed',LayoutGrid],['updates',RefreshCw],['library',BookOpen]] as const).map(([id,Icon])=><button key={id} className={'nav-item '+(tab===id?'active':'')} onClick={()=>{setTab(id);setSelected(null)}}><Icon size={18}/><span>{labels[id]}</span>{id==='library'&&favorites.length>0&&<small className="nav-count">{favorites.length}</small>}</button>)}</nav>
      <div className="side-caption categories-caption">카테고리</div>
      <nav aria-label="카테고리">{categories.map(item=><button key={item} className={'category-item '+(category===item?'category-active':'')} onClick={()=>{setCategory(item);setTab('discover');setSelected(null)}}><span className="category-bullet">{item==='전체'?'◦':icons[item]??'·'}</span><span>{item}</span></button>)}</nav>
      <div className="sidebar-bottom"><div className="side-help"><span className="help-icon"><CircleHelp size={19}/></span><strong>도움이 필요하신가요?</strong><p>오픈소스를 쉽게 시작하는 한국어 사용 가이드를 살펴보세요.</p><button onClick={()=>{setSelected(apps[0]);setAdvanced(false)}}>첫 사용 가이드 <ArrowRight size={14}/></button></div><div className="side-footer">EasyOpen 0.1 · 초기 개발용</div></div>
    </aside>
    <main className="main">
      <div className="topbar"><span className="breadcrumb">EasyOpen <ChevronRight size={14}/> {labels[tab]}</span><div className="top-actions"><span className="local-badge"><span/> 로컬 중심</span><button className="icon-button" aria-label="상태 새로고침" title="새로고침" onClick={()=>void onRefresh()}><RefreshCw size={17}/></button><span className="avatar">M</span></div></div>
      <div className="main-content">
        <div className="page-heading"><div><div className="eyebrow"><Sparkles size={14}/> YOUR OPEN SOURCE SPACE</div><h1>{title}</h1><p>원하는 일을 고르면, 설치와 사용법까지 차근차근 안내해 드려요.</p></div><div className="device-chip"><Monitor size={17}/><span>{machine?machine.platform==='win32'?'Windows 환경':'현재 기기 확인됨':'설치 환경 확인 전'}</span></div></div>
        {tab==='discover'&&category==='전체'&&!query&&<section className="hero"><div><span className="hero-kicker"><Zap size={13}/> 처음 시작하는 분도 편하게</span><h2>오픈소스, 어렵지 않게<br/><em>내 도구로 만드는 시간.</em></h2><p>프로그램을 찾고, 내 PC에 맞는지 살펴보고,<br/>실제 설치와 사용까지 한곳에서 관리해 보세요.</p><button onClick={()=>{setSelected(apps[0]);setAdvanced(false)}}>CosyVoice 살펴보기 <ArrowRight size={17}/></button></div><div className="hero-visual"><span className="floating f1"><Package size={20}/></span><span className="floating f2"><ShieldCheck size={20}/></span><span className="floating f3"><CloudDownload size={22}/></span><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="center-tile">E<span>O</span></div></div></section>}
        {tab==='updates'&&<div className="notice-card"><Info size={19}/><div><strong>업데이트는 검증된 앱만 진행해요.</strong><p>Windows WinGet 시험 대상은 앱 상세에서 개별 업데이트를 실행할 수 있어요. 자동 일괄 업데이트는 아직 지원하지 않아요.</p></div></div>}
        <div className="section-row"><div><h2>{tab==='discover'?'프로그램 둘러보기':labels[tab]}</h2><p>{tab==='installed'?'Windows WinGet에서 감지한 앱만 표시해요.':tab==='library'?'북마크해 둔 프로그램을 모았어요.':`${displayed.length}개의 프로그램을 살펴볼 수 있어요.`}</p></div><button className="subtle-button" onClick={()=>{setQuery('');setCategory('전체');setTab('discover')}}><Filter size={16}/> 필터 초기화</button></div>
        <div className="toolbar"><label className="search-field"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} aria-label="프로그램 검색" placeholder="프로그램 이름이나 할 일을 검색하세요"/></label><div className="filter-tags"><SlidersHorizontal size={16}/><span>Windows</span><ChevronDown size={14}/></div></div>
        {notice&&<div className="notice" role="status"><Info size={16}/><span>{notice}</span><button onClick={()=>setNotice('')} aria-label="안내 닫기"><X size={16}/></button></div>}
        <div className="app-grid">{displayed.map(a=><AppTile key={a.id} app={a} status={status[a.id]??'unknown'} onSelect={()=>{setSelected(a);setAdvanced(false);setLog('')}}/>)}</div>
        {displayed.length===0&&<div className="empty"><Search size={29}/><strong>아직 해당하는 앱이 없어요</strong><p>다른 검색어나 카테고리를 확인해 주세요.</p></div>}
        <footer className="main-footer"><span>EasyOpen · 원작자를 존중하는 오픈소스 플랫폼</span><span>검증되지 않은 설치는 지원하지 않습니다.</span></footer>
      </div>
    </main>
    {selected&&<div className="drawer-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><section className="drawer" role="dialog" aria-modal="true" aria-label={`${selected.name} 상세`}><div className="drawer-head"><button className="back-button" onClick={()=>setSelected(null)}><ArrowLeft size={17}/> 목록</button><button className="icon-button" onClick={()=>setSelected(null)} aria-label="상세 닫기"><X size={19}/></button></div><div className="drawer-body"><span className={'app-symbol drawer-symbol symbol-'+selected.id}>{iconName(selected)}</span><div className="drawer-eyebrow">{selected.category} · 공식 오픈소스</div><h2>{selected.name}</h2><p className="drawer-description">{selected.summary}</p><div className="drawer-status"><ShieldCheck size={17}/><span>공식 출처 안내 · Windows 설치는 기기별 미검증 베타</span></div><div className="detail-actions"><button className="primary" onClick={()=>{if(canManage(selected))setConfirm({app:selected,kind:status[selected.id]==='installed'?'update':'install'});else void official(selected)}}>{canManage(selected)?(status[selected.id]==='installed'?'업데이트 시도':'Windows 시험 설치'):'공식 사이트 열기'}<ArrowDownToLine size={16}/></button><button className="outlined" onClick={()=>toggleSave(selected.id)}>{favorites.includes(selected.id)?'저장 해제':'내 라이브러리 저장'}</button></div>
        {canManage(selected)&&<div className="warning"><Info size={17}/><div>WinGet ID가 등록된 시험 버전입니다. 패키지와 설치 성공은 실제 Windows에서 아직 확인하지 않았어요. 작업 전 설치 내용을 확인하세요.</div></div>}
        <h3>이 앱에 필요한 준비</h3><p className="detail-copy">{selected.requirements}</p><h3>처음 사용하기</h3><p className="detail-copy">{selected.guide}</p><h3>출처 및 라이선스</h3><div className="info-grid"><span>공식 출처</span><button className="inline-link" onClick={()=>void official(selected)}>원본 사이트 열기 <ExternalLink size={13}/></button><span>라이선스</span><strong>{selected.license}</strong><span>라이선스 검토</span><strong className="muted">판매·재배포 전 추가 확인</strong><span>EasyOpen 설치 검증</span><strong className="muted">Windows 실기기 검증 전</strong></div>
        <button className="advanced-toggle" onClick={()=>setAdvanced(v=>!v)} aria-expanded={advanced}><Settings2 size={17}/> 상세 정보 및 관리 {advanced?<ChevronDown size={17}/>:<ChevronRight size={17}/>}</button>
        {advanced&&<div className="advanced-panel"><div><span>관리 방식</span><strong>{selected.install.windows?.method==='winget'?'WinGet 시험 연동':'공식 다운로드 연결'}</strong></div><div><span>패키지 ID</span><code>{selected.install.windows?.packageId??'없음'}</code></div><div><span>OS</span><strong>{selected.os.join(', ')}</strong></div>{canManage(selected)&&<button className="danger-button" onClick={()=>setConfirm({app:selected,kind:'remove'})}>WinGet에서 제거 시도</button>}</div>}
        {log&&<div className="logs"><strong>최근 작업 로그</strong><pre>{log.slice(-4000)}</pre></div>}
      </div></section></div>}
    {confirm&&<div className="modal-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setConfirm(null)}}><div className="confirm" role="alertdialog" aria-modal="true" aria-label="작업 승인"><div className="confirm-icon"><ShieldCheck size={22}/></div><h2>{confirm.app.name} {kinds[confirm.kind]}</h2><p>Windows WinGet에서 아래 패키지에 대해 <strong>{kinds[confirm.kind]}</strong> 명령을 실행해요. 시스템 권한 확인 창이 나타날 수 있어요.</p><div className="confirm-detail"><span>패키지 식별자</span><strong>{confirm.app.install.windows?.packageId}</strong><span>검증 상태</span><strong>Windows 실기기 미검증</strong></div>{confirm.kind==='remove'&&<div className="warning">기존 앱의 설정·데이터가 삭제될 수도 있어요. 삭제 전 백업을 확인하세요.</div>}<div className="confirm-buttons"><button className="outlined" onClick={()=>setConfirm(null)}>취소</button><button className="primary" onClick={()=>void run()}>{kinds[confirm.kind]} 진행</button></div></div></div>}
    {busy&&<div className="busy-banner"><span className="spinner"/> WinGet 작업 진행 중 · 완료되면 결과가 표시됩니다.</div>}
  </div>
}
export default App;
