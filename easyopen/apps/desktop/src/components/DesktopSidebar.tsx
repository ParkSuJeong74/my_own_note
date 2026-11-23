import {Home,Monitor,PackageCheck,Search,Settings2,ShieldCheck,type LucideIcon} from 'lucide-react';
import type {Page} from '../view-model';

const navigation: {page:Page; label:string;icon:LucideIcon;children?:Page[]}[] = [
  {page:'installed',label:'내 프로그램',icon:PackageCheck},
  {page:'discover',label:'프로그램 찾기',icon:Search},
  {page:'home',label:'기기 현황',icon:Home},
  {page:'settings',label:'설정',icon:Settings2,children:['updates','library','tasks','runtime']},
];

type DesktopSidebarProps={
  page:Page;
  platform:string|undefined;
  attentionCount:number;
  onNavigate:(page:Page)=>void;
};
export function DesktopSidebar({page,platform,attentionCount,onNavigate}:DesktopSidebarProps){
  return <aside className="eo-sidebar" aria-label="EasyOpen 기본 메뉴">
      <button className="brand-lockup" onClick={()=>onNavigate('installed')} aria-label="내 프로그램으로">
        <span className="logo-box" aria-hidden="true">e.</span>
        <span className="brand-title">easy<span>open</span><small>by MANO</small></span>
      </button>
      <div className="sidebar-caption">WORKSPACE</div>
      <nav className="primary-nav" aria-label="주 메뉴">
        {navigation.map(({page:id,label,icon:Icon,children=[]})=>{const selectedPage=page===id||children.includes(page);return <button key={id} className={`nav-link ${selectedPage?'is-selected':''}`} onClick={()=>onNavigate(id)} aria-current={selectedPage?'page':undefined}>
          <Icon size={18} strokeWidth={1.9}/><span>{label}</span>
          {id==='settings'&&attentionCount>0&&<span className="nav-number" title="확인할 항목">{attentionCount}</span>}
        </button>})}
      </nav>
      <div className="sidebar-spacer"/>
      <div className="sidebar-device"><span className="device-circle"><Monitor size={17}/></span><span><strong>이 기기</strong><small>{platform==='win32'?'Windows':platform==='darwin'?'macOS':platform??'기기 정보 확인 전'}</small></span><span className="live-dot" aria-hidden="true"/></div>
      <div className="sidebar-foot"><ShieldCheck size={14}/> 공식 출처를 우선합니다 <span>v0.1 beta</span></div>
    </aside>;
}
