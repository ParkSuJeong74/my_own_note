import type {Metadata} from 'next';
import Link from 'next/link';
import {DownloadPanel} from '@/components/DownloadPanel';
export const metadata:Metadata={title:'EasyOpen 다운로드',description:'Windows, macOS, Android, iOS용 EasyOpen 다운로드 경로를 확인하세요.'};
export default function Download(){return <section className="shell page-section download-page"><span className="section-kicker">DOWNLOAD EASYOPEN</span><h1 className="page-title">내 기기에 맞는<br/>EasyOpen을 받으세요.</h1><p className="page-desc">사용 가능한 경로만 버튼으로 제공합니다. 준비 중인 플랫폼은 현재 상태를 그대로 표시합니다.</p><DownloadPanel/><div className="truth-panel"><span className="support-pill support-integration-testing">Jellyfin 테스트 중</span><strong>설치한 다음에는 Jellyfin부터 살펴보세요.</strong><p>EasyOpen 앱 설치와 Jellyfin 사용 준비는 별도 단계입니다. Jellyfin 통합은 아직 테스트 중이며 정식 지원 단계가 아닙니다.</p><Link className="text-link" href="/apps/jellyfin/">Jellyfin 자세히 보기 →</Link></div></section>}
