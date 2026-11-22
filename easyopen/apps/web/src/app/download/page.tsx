import type {Metadata} from 'next';
import {DownloadPanel} from '@/components/DownloadPanel';
import {buildPageMetadata} from '@/lib/site-metadata';
export const metadata:Metadata=buildPageMetadata({path:'/download/',title:'EasyOpen 다운로드',description:'Windows, macOS, Android용 EasyOpen 공식 다운로드 경로를 확인하세요.'});
export default function Download(){return <section className="shell page-section download-page"><span className="section-kicker">DOWNLOAD EASYOPEN</span><h1 className="page-title">내 기기에 맞는<br/>EasyOpen을 받으세요.</h1><p className="page-desc">공식 배포 경로와 현재 확인된 상태만 안내합니다. 파일 공개와 실제 기기 지원은 서로 다른 단계입니다.</p><DownloadPanel/></section>}
