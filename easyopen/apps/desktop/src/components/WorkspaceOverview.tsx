import {ArrowRight,Monitor,PackageCheck,Play,Plus,Workflow} from 'lucide-react';
import type {CatalogApp} from '../types';
import {AppIcon} from './ProgramCard';
type Props={readyApp:CatalogApp|undefined;managedCount:number|null;discoveredCount:number;runningTasks:number;onOpen:(app:CatalogApp)=>void;onDiscover:()=>void;onTasks:()=>void;onConnection:()=>void};
export function WorkspaceOverview({readyApp,managedCount,discoveredCount,runningTasks,onOpen,onDiscover,onTasks,onConnection}:Props){
 return <section className="workspace-overview" aria-label="내 작업 공간 요약">
  <div className="continue-card">
   <div className="continue-copy"><span className="micro-label">{readyApp?'이어서 사용하기':'나만의 작업 공간'}</span><h2>{readyApp?readyApp.name:'첫 프로그램을 준비해 볼까요?'}</h2><p>{readyApp?'실행 응답이 확인된 프로그램을 바로 열어보세요.':'필요한 프로그램을 찾고, 설치부터 실행까지 한곳에서 관리하세요.'}</p><button className="primary-button" onClick={()=>readyApp?onOpen(readyApp):onDiscover()}>{readyApp?<><Play size={16}/>프로그램 열기</>:<><Plus size={16}/>프로그램 추가</>}<ArrowRight size={16}/></button></div>
   <div className="continue-art" aria-hidden="true">{readyApp?<AppIcon app={readyApp} size="lg"/>:<PackageCheck size={50} strokeWidth={1.2}/>}<span className="art-orbit"/></div>
  </div>
  <div className="workspace-shortcuts">
   <div className="workspace-stat"><PackageCheck size={19}/><span><strong>{managedCount===null?'기기 상태 확인 전':`${managedCount}개 프로그램`}</strong><small>EasyOpen으로 관리 중</small></span></div>
   <button className="workspace-stat" onClick={onTasks}><Workflow size={19}/><span><strong>{runningTasks?`${runningTasks}개 작업 진행 중`:'진행 중인 작업 없음'}</strong><small>설치·업데이트 기록 보기</small></span><ArrowRight size={15}/></button>
   <button className="workspace-stat" onClick={onConnection}><Monitor size={19}/><span><strong>다른 기기에서도 이어서</strong><small>휴대폰 연결 안내</small></span><ArrowRight size={15}/></button>
  </div>
  {discoveredCount>0&&<p className="discovered-note">이 PC에서 발견한 기존 프로그램 {discoveredCount}개는 EasyOpen 관리 앱과 구분해 표시합니다.</p>}
 </section>;
}
