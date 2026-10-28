'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {EasyOpenRelease,RELEASES_API,RELEASES_PAGE,selectEasyOpenRelease} from '@/lib/releases';
import {distributionChannels} from '@/lib/distribution';

function size(bytes:number){return `${(bytes/1024/1024).toFixed(1)} MB`}
function downloads(count:number){return count>0?` · ${count.toLocaleString('ko-KR')}회`:''}

function PlatformIcon({type}:{type:'windows'|'macos'|'android'|'ios'}){
 const paths={
  windows:<path d="M3 4.6 11 3.5v7H3v-6Zm10-1.4L21 2v8.5h-8V3.2ZM3 12.5h8v7L3 18.4v-5.9Zm10 0h8V21l-8-1.2v-7.3Z"/>,
  macos:<><path d="M16.7 12.8c0-2.7 2.2-4 2.3-4.1a5 5 0 0 0-3.9-2.1c-1.7-.2-3.2 1-4 1s-2.1-1-3.5-.9a5.2 5.2 0 0 0-4.4 2.7c-1.9 3.3-.5 8.1 1.3 10.8.9 1.3 2 2.7 3.4 2.6 1.3-.1 1.9-.9 3.5-.9s2.1.9 3.5.8c1.5 0 2.4-1.3 3.3-2.6a12 12 0 0 0 1.5-3.1 4.7 4.7 0 0 1-3-4.2Z"/><path d="M14 4.9A4.8 4.8 0 0 0 15.1 1a4.9 4.9 0 0 0-3.3 1.8 4.5 4.5 0 0 0-1.1 3.7A4.1 4.1 0 0 0 14 4.9Z"/></>,
  android:<><path d="m7.1 7.2-1.6-2.8M16.9 7.2l1.6-2.8"/><path d="M5 10h14v8.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V10Zm2-1a5 5 0 0 1 10 0M8.5 13h.01M15.5 13h.01M8 20.5V23M16 20.5V23M2.5 11v7M21.5 11v7"/></>,
  ios:<><path d="M12 8.5v10M12 4.8v.1"/><circle cx="12" cy="12" r="10"/></>,
 };
 return <span className="platform-icon" aria-hidden="true"><svg viewBox="0 0 24 24">{paths[type]}</svg></span>;
}

function Status({kind,children}:{kind:'testing'|'pending';children:ReactNode}){return <span className={`status-badge status-${kind}`}>{children}</span>}
function ChannelButton({href,children,primary=false}:{href:string|null;children:ReactNode;primary?:boolean}){
 return href?<a className={`btn ${primary?'btn-primary':'btn-outline'}`} href={href} target="_blank" rel="noreferrer noopener">{children} <span aria-hidden="true">↗</span></a>:<span className="btn channel-disabled" aria-disabled="true">{children} · 준비 중</span>;
}

export function DownloadPanel(){
 const [release,setRelease]=useState<EasyOpenRelease|null>(null);
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{let active=true;void fetch(RELEASES_API,{headers:{Accept:'application/vnd.github+json'}}).then(async response=>{if(!response.ok)throw new Error(String(response.status));return response.json()}).then(data=>{if(active)setRelease(selectEasyOpenRelease(data))}).catch(()=>{}).finally(()=>{if(active)setLoaded(true)});return()=>{active=false}},[]);
 return <div className="download-panel">
  <div className="download-status"><div><span className="status-dot status-dot-warning"/><strong>운영체제별 다운로드 현황</strong></div><span>사용 가능한 다운로드만 활성화합니다</span></div>
  <div className="download-grid">
   <article className="download-card download-card-featured"><div className="platform-heading"><PlatformIcon type="windows"/><Status kind="testing">개발 베타</Status></div><div className="platform-copy"><small>WINDOWS 11</small><h2>Windows</h2><p>GitHub에 공개된 Windows 설치 파일을 확인할 수 있습니다. Microsoft Store는 등록된 경우에만 연결됩니다.</p></div><div className="download-actions">{release?.windows?<a className="btn btn-primary" href={release.windows.browser_download_url}>GitHub 다운로드 · {size(release.windows.size)}{downloads(release.windows.download_count)}</a>:<a className="btn btn-outline" href={RELEASES_PAGE} target="_blank" rel="noreferrer noopener">배포 페이지에서 확인 ↗</a>}<ChannelButton href={distributionChannels.microsoftStore}>Microsoft Store</ChannelButton></div><p className="download-warning">개발 베타입니다. 설치 파일의 게시자 확인과 실제 기기 작동 검증이 완료되지 않았을 수 있습니다.</p></article>
   <article className="download-card"><div className="platform-heading"><PlatformIcon type="macos"/>{release?.macos?<Status kind="testing">개발 베타</Status>:<Status kind="pending">준비 중</Status>}</div><div className="platform-copy"><small>MACOS · APPLE SILICON</small><h2>macOS</h2><p>macOS 설치 파일이 공개된 경우 GitHub에서 받을 수 있습니다. Homebrew는 등록된 경우에만 연결됩니다.</p></div><div className="download-actions">{release?.macos?<a className="btn btn-primary" href={release.macos.browser_download_url}>GitHub 다운로드 · {size(release.macos.size)}{downloads(release.macos.download_count)}</a>:<span className="btn channel-disabled" aria-disabled="true">설치 파일 준비 중</span>}<ChannelButton href={distributionChannels.homebrew}>Homebrew Cask</ChannelButton></div></article>
   <article className="download-card"><div className="platform-heading"><PlatformIcon type="android"/>{release?.android?<Status kind="testing">개발 베타</Status>:<Status kind="pending">준비 중</Status>}</div><div className="platform-copy"><small>ANDROID</small><h2>Android</h2><p>Google Play 등록 여부와 별도로, APK가 공개된 경우 GitHub에서 직접 받을 수 있습니다.</p></div><div className="download-actions"><ChannelButton href={distributionChannels.googlePlay} primary>Google Play에서 설치</ChannelButton>{release?.android?<a className="btn btn-outline" href={release.android.browser_download_url}>GitHub APK · {size(release.android.size)}{downloads(release.android.download_count)}</a>:<span className="btn channel-disabled" aria-disabled="true">APK 준비 중</span>}</div><p className="download-warning">APK는 알 수 없는 앱 설치 허용이 필요합니다.</p></article>
   <article className="download-card"><div className="platform-heading"><PlatformIcon type="ios"/>{distributionChannels.testFlight?<Status kind="testing">베타</Status>:<Status kind="pending">준비 중</Status>}</div><div className="platform-copy"><small>IOS · TESTFLIGHT</small><h2>iPhone · iPad</h2><p>iOS 버전은 개발 및 테스트 준비 단계입니다. TestFlight 배포가 시작되면 이곳에서 안내합니다.</p></div><div className="download-actions"><ChannelButton href={distributionChannels.testFlight} primary>TestFlight에서 설치</ChannelButton></div></article>
  </div>
  <div className="download-meta">{!loaded?<span>최신 설치 파일 확인 중…</span>:release?<><span>{release.tag} · {new Date(release.publishedAt).toLocaleDateString('ko-KR')}</span>{release.checksums&&<a href={release.checksums.browser_download_url}>SHA256SUMS <span aria-hidden="true">↗</span></a>}<a href={release.pageUrl}>릴리스 설명 <span aria-hidden="true">↗</span></a></>:<><span>릴리스 정보를 불러오지 못했습니다.</span><a href={RELEASES_PAGE}>GitHub Releases <span aria-hidden="true">↗</span></a></>}</div>
 </div>
}
