'use client';
import {useEffect,useState} from 'react';
import {EasyOpenRelease,RELEASES_API,RELEASES_PAGE,selectEasyOpenRelease} from '@/lib/releases';

function size(bytes:number){return `${(bytes/1024/1024).toFixed(1)} MB`}
function downloads(count:number){return count>0?` · 누적 ${count.toLocaleString('ko-KR')}회`:''}

export function DownloadPanel(){
 const [release,setRelease]=useState<EasyOpenRelease|null>(null);
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{let active=true;void fetch(RELEASES_API,{headers:{Accept:'application/vnd.github+json'}}).then(async response=>{if(!response.ok)throw new Error(String(response.status));return response.json()}).then(data=>{if(active)setRelease(selectEasyOpenRelease(data))}).catch(()=>{}).finally(()=>{if(active)setLoaded(true)});return()=>{active=false}},[]);
 return <div className="download-panel">
  <div className="download-status"><span className="live-dot"/><span>{release?`${release.tag} · 공개 베타`:'EasyOpen 공개 베타'}</span></div>
  <div className="download-grid">
   <article className="download-card"><span className="download-icon">▣</span><div><small>WINDOWS 11</small><h2>EasyOpen Desktop</h2><p>프로그램 탐색과 제한된 WinGet 시험 관리 기능을 제공합니다.</p></div>{release?.windows?<a className="btn btn-primary wide" href={release.windows.browser_download_url}>EXE 다운로드 · {size(release.windows.size)}{downloads(release.windows.download_count)} <span>↓</span></a>:<a className="btn btn-outline wide" href={RELEASES_PAGE}>GitHub Releases에서 확인 ↗</a>}<p className="download-warning">코드 서명 전 베타입니다. Windows가 알 수 없는 게시자 경고를 표시할 수 있습니다.</p></article>
   <article className="download-card"><span className="download-icon">◫</span><div><small>GALAXY · ANDROID</small><h2>EasyOpen Android</h2><p>프로그램 탐색, 한국어 가이드와 공식 스토어 이동을 제공합니다.</p></div>{release?.android?<a className="btn btn-primary wide" href={release.android.browser_download_url}>APK 다운로드 · {size(release.android.size)}{downloads(release.android.download_count)} <span>↓</span></a>:<a className="btn btn-outline wide" href={RELEASES_PAGE}>GitHub Releases에서 확인 ↗</a>}<p className="download-warning">서명된 베타 APK입니다. Play·Galaxy Store 출시 전 직접 설치 승인이 필요합니다.</p></article>
  </div>
  <div className="download-meta">{!loaded?<span>최신 릴리스를 확인하고 있어요…</span>:release?<><span>배포일 {new Date(release.publishedAt).toLocaleDateString('ko-KR')}</span>{release.checksums&&<a href={release.checksums.browser_download_url}>SHA256SUMS 확인 ↗</a>}<a href={release.pageUrl}>릴리스 설명 ↗</a></>:<><span>GitHub에서 최신 파일을 불러오지 못했습니다.</span><a href={RELEASES_PAGE}>전체 Releases 보기 ↗</a></>}</div>
 </div>
}
