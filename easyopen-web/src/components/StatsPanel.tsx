'use client';
import {useEffect,useMemo,useState} from 'react';
import {EasyOpenRelease,RELEASES_API,RELEASES_PAGE,selectEasyOpenReleases,summarizeDownloads} from '@/lib/releases';

const CLOUDFLARE_ANALYTICS='https://dash.cloudflare.com/?to=/:account/analytics/web-analytics';

export function StatsPanel({analyticsEnabled}:{analyticsEnabled:boolean}){
 const [releases,setReleases]=useState<EasyOpenRelease[]>([]);
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{let active=true;void fetch(RELEASES_API,{headers:{Accept:'application/vnd.github+json'}}).then(async response=>{if(!response.ok)throw new Error(String(response.status));return response.json()}).then(data=>{if(active)setReleases(selectEasyOpenReleases(data))}).catch(()=>{}).finally(()=>{if(active)setLoaded(true)});return()=>{active=false}},[]);
 const totals=useMemo(()=>summarizeDownloads(releases),[releases]);
 return <>
  <div className="stats-grid">
   <article className="stat-card"><small>사이트 방문</small><strong>{analyticsEnabled?'수집 중':'설정 필요'}</strong><p>방문자·페이지 조회·유입 경로는 Cloudflare Web Analytics에서 확인합니다.</p><a href={CLOUDFLARE_ANALYTICS} target="_blank" rel="noreferrer">Cloudflare 통계 열기 ↗</a></article>
   <article className="stat-card"><small>전체 앱 다운로드</small><strong>{loaded?`${totals.total.toLocaleString('ko-KR')}회`:'확인 중'}</strong><p>GitHub Releases의 Windows EXE와 Android APK 요청 누계입니다.</p><a href={RELEASES_PAGE} target="_blank" rel="noreferrer">GitHub Releases 열기 ↗</a></article>
   <article className="stat-card"><small>Windows</small><strong>{loaded?`${totals.windows.toLocaleString('ko-KR')}회`:'—'}</strong><p>모든 EasyOpen 공개 베타 EXE의 누적 다운로드입니다.</p></article>
   <article className="stat-card"><small>Android</small><strong>{loaded?`${totals.android.toLocaleString('ko-KR')}회`:'—'}</strong><p>모든 EasyOpen 공개 베타 APK의 누적 다운로드입니다.</p></article>
  </div>
  <section className="stats-table-wrap"><div className="stats-heading"><div><span className="section-kicker">RELEASE BREAKDOWN</span><h2>릴리스별 다운로드</h2></div><span>{totals.releaseCount}개 릴리스</span></div>
   {!loaded?<p>GitHub에서 다운로드 통계를 불러오고 있어요…</p>:releases.length===0?<p>통계를 불러오지 못했습니다. GitHub Releases에서 직접 확인해 주세요.</p>:<div className="stats-table" role="table" aria-label="릴리스별 다운로드 통계">
    <div className="stats-row stats-row-head" role="row"><span>릴리스</span><span>Windows</span><span>Android</span><span>합계</span></div>
    {releases.map(release=>{const windows=release.windows?.download_count??0;const android=release.android?.download_count??0;return <a className="stats-row" role="row" href={release.pageUrl} target="_blank" rel="noreferrer" key={release.tag}><span><b>{release.tag}</b><small>{new Date(release.publishedAt).toLocaleDateString('ko-KR')}</small></span><span>{windows.toLocaleString('ko-KR')}</span><span>{android.toLocaleString('ko-KR')}</span><span>{(windows+android).toLocaleString('ko-KR')}</span></a>})}
   </div>}
  </section>
  <div className="stats-note"><b>지표 해석</b><p>다운로드 횟수에는 같은 사용자의 재다운로드가 포함될 수 있으며 설치 완료나 활성 사용자 수를 뜻하지 않습니다. 앱을 통한 다운로드와 실제 사용 통계는 별도 이벤트 API와 개인정보 기준을 마련한 뒤 추가합니다.</p></div>
 </>;
}
