'use client';
import {useEffect,useMemo,useState} from 'react';
import {EasyOpenRelease,RELEASES_API,RELEASES_PAGE,selectEasyOpenReleases,summarizeDownloads} from '@/lib/releases';

const CLOUDFLARE_ANALYTICS='https://dash.cloudflare.com/?to=/:account/analytics/web-analytics';
type LoadState='loading'|'success'|'empty'|'error';

export function StatsPanel({analyticsEnabled}:{analyticsEnabled:boolean}){
 const [releases,setReleases]=useState<EasyOpenRelease[]>([]);
 const [loadState,setLoadState]=useState<LoadState>('loading');
 useEffect(()=>{
  let active=true;
  const controller=new AbortController();
  const timeout=window.setTimeout(()=>controller.abort(),8000);
  void fetch(RELEASES_API,{headers:{Accept:'application/vnd.github+json'},signal:controller.signal})
   .then(async response=>{if(!response.ok)throw new Error(String(response.status));return response.json()})
   .then(data=>{if(!active)return;const next=selectEasyOpenReleases(data);setReleases(next);setLoadState(next.length?'success':'empty')})
   .catch(()=>{if(active)setLoadState('error')})
   .finally(()=>window.clearTimeout(timeout));
  return()=>{active=false;window.clearTimeout(timeout);controller.abort()};
 },[]);
 const totals=useMemo(()=>summarizeDownloads(releases),[releases]);
 const value=(count:number)=>loadState==='success'?`${count.toLocaleString('ko-KR')}회`:loadState==='loading'?'확인 중':'—';
 return <>
  <div className="stats-grid">
   <article className="stat-card"><small>사이트 방문</small><strong>{analyticsEnabled?'수집 중':'설정 필요'}</strong><p>방문자·페이지 조회·유입 경로는 Cloudflare Web Analytics에서 확인합니다.</p><a href={CLOUDFLARE_ANALYTICS} target="_blank" rel="noreferrer">Cloudflare 통계 열기 ↗</a></article>
   <article className="stat-card"><small>전체 앱 다운로드</small><strong>{value(totals.total)}</strong><p>GitHub Releases에서 공개한 각 운영체제용 앱 파일의 요청 누계입니다.</p><a href={RELEASES_PAGE} target="_blank" rel="noreferrer">GitHub Releases 열기 ↗</a></article>
   <article className="stat-card"><small>Windows</small><strong>{value(totals.windows)}</strong><p>공개 베타 EXE의 누적 다운로드입니다.</p></article>
   <article className="stat-card"><small>macOS</small><strong>{value(totals.macos)}</strong><p>공개 베타 DMG의 누적 다운로드입니다.</p></article>
   <article className="stat-card"><small>Android</small><strong>{value(totals.android)}</strong><p>공개 베타 APK의 누적 다운로드입니다.</p></article>
   <article className="stat-card"><small>iOS</small><strong>{value(totals.ios)}</strong><p>공개 테스트 IPA의 누적 다운로드입니다.</p></article>
  </div>
  <section className="stats-table-wrap"><div className="stats-heading"><div><span className="section-kicker">RELEASE BREAKDOWN</span><h2>릴리스별 다운로드</h2></div><span>{loadState==='success'?`${totals.releaseCount}개 릴리스`:'—'}</span></div>
   {loadState==='loading'?<p role="status">GitHub에서 다운로드 통계를 불러오고 있어요…</p>:loadState==='error'?<p role="alert">GitHub 통계를 불러오지 못했습니다. 잠시 후 다시 시도하거나 GitHub Releases에서 직접 확인해 주세요.</p>:loadState==='empty'?<p>집계할 수 있는 공개 EasyOpen 릴리스가 아직 없습니다.</p>:<div className="stats-table" role="table" aria-label="릴리스별 다운로드 통계">
    <div className="stats-row stats-row-head" role="row"><span>릴리스</span><span>Windows</span><span>macOS</span><span>Android</span><span>iOS</span><span>합계</span></div>
    {releases.map(release=>{const windows=release.windows?.download_count??0;const macos=release.macos?.download_count??0;const android=release.android?.download_count??0;const ios=release.ios?.download_count??0;return <a className="stats-row" role="row" href={release.pageUrl} target="_blank" rel="noreferrer" key={release.tag}><span><b>{release.tag}</b><small>{new Date(release.publishedAt).toLocaleDateString('ko-KR')}</small></span><span>{windows.toLocaleString('ko-KR')}</span><span>{macos.toLocaleString('ko-KR')}</span><span>{android.toLocaleString('ko-KR')}</span><span>{ios.toLocaleString('ko-KR')}</span><span>{(windows+macos+android+ios).toLocaleString('ko-KR')}</span></a>})}
   </div>}
  </section>
  <div className="stats-note"><b>지표 해석</b><p>다운로드 횟수에는 같은 사용자의 재다운로드가 포함될 수 있으며 설치 완료나 활성 사용자 수를 뜻하지 않습니다. 앱을 통한 다운로드와 실제 사용 통계는 별도 이벤트 API와 개인정보 기준을 마련한 뒤 추가합니다.</p></div>
 </>;
}
