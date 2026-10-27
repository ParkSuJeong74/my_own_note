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
  <div className="download-status"><span className="status-dot status-dot-warning"/><span>플랫폼별 준비 상태</span></div>
  <div className="download-grid">
   <article className="download-card download-card-featured"><div className="platform-heading"><span className="platform-icon" aria-hidden="true">W</span><span className="status-badge status-warning">검증 중</span></div><div><small>WINDOWS 11</small><h2>Windows</h2><p>Jellyfin 통합형 Desktop을 준비하고 있습니다. 현재 파일은 서명과 실기기 검증을 마치지 않은 개발 베타입니다.</p></div>{release?.windows?<a className="btn btn-primary wide" href={release.windows.browser_download_url}>검증용 베타 받기 · {size(release.windows.size)}{downloads(release.windows.download_count)}</a>:<a className="btn btn-outline wide" href={RELEASES_PAGE}>GitHub Releases 확인 <span aria-hidden="true">↗</span></a>}<p className="download-warning">Windows가 알 수 없는 게시자 경고를 표시할 수 있습니다. 안정판으로 안내하지 않습니다.</p></article>
   <article className="download-card"><div className="platform-heading"><span className="platform-icon" aria-hidden="true">M</span><span className="status-badge status-pending">준비 중</span></div><div><small>MACOS</small><h2>macOS</h2><p>Apple Silicon 내부 DMG 검증 후 GitHub Releases를 기본 경로로 제공하고 Homebrew Cask를 선택 경로로 안내합니다.</p></div><p className="download-unavailable">서명·공증된 DMG 준비 전</p></article>
   <article className="download-card"><div className="platform-heading"><span className="platform-icon" aria-hidden="true">A</span><span className="status-badge status-pending">준비 중</span></div><div><small>ANDROID</small><h2>Android</h2><p>PC의 Jellyfin 서버에 연결해 EasyOpen 내부에서 재생하는 앱을 Google Play용으로 준비합니다.</p></div><p className="download-unavailable">Google Play 등록·실기기 검증 전</p></article>
   <article className="download-card"><div className="platform-heading"><span className="platform-icon" aria-hidden="true">i</span><span className="status-badge status-pending">준비 중</span></div><div><small>IOS · TESTFLIGHT</small><h2>iOS</h2><p>정식 App Store 출시보다 TestFlight 베타를 먼저 준비합니다. 현재 테스트할 iPhone이 없어 검증 전입니다.</p></div><p className="download-unavailable">TestFlight 초대 링크 준비 전</p></article>
  </div>
  <div className="download-meta">{!loaded?<span>Windows 개발 베타를 확인하고 있어요…</span>:release?<><span>최근 개발 베타 {release.tag} · {new Date(release.publishedAt).toLocaleDateString('ko-KR')}</span>{release.checksums&&<a href={release.checksums.browser_download_url}>SHA256SUMS 확인 <span aria-hidden="true">↗</span></a>}<a href={release.pageUrl}>검증용 릴리스 설명 <span aria-hidden="true">↗</span></a></>:<><span>GitHub에서 개발 베타 정보를 불러오지 못했습니다.</span><a href={RELEASES_PAGE}>전체 Releases 보기 <span aria-hidden="true">↗</span></a></>}</div>
 </div>
}
