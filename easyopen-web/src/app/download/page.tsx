import type {Metadata} from 'next';
import {DownloadPanel} from '@/components/DownloadPanel';
export const metadata:Metadata={title:'EasyOpen 배포 현황',description:'Windows, macOS, Android, iOS용 EasyOpen의 실제 준비 상태와 검증용 배포 경로를 확인하세요.'};
export default function Download(){return <section className="shell page-section download-page"><span className="section-kicker">PLATFORM STATUS</span><h1 className="page-title">내 기기에서 사용할 준비가<br/>어디까지 되었는지 확인하세요.</h1><p className="page-desc">아직 모든 플랫폼이 출시된 것은 아닙니다. 실제 링크와 실기기 검증이 준비된 경로만 다운로드 행동으로 제공합니다.</p><DownloadPanel/><div className="truth-panel"><strong>EasyOpen 앱과 지원 도구는 다릅니다.</strong><p>이 화면은 EasyOpen 앱 자체의 배포 상태입니다. Jellyfin Server 등 지원 도구의 원본과 라이선스는 각 공식 출처에서 별도로 확인하며, EasyOpen이 검증하지 않은 설치를 완료된 기능처럼 표시하지 않습니다.</p></div></section>}
