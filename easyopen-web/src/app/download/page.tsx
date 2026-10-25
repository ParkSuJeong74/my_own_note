import type {Metadata} from 'next';
import {DownloadPanel} from '@/components/DownloadPanel';
export const metadata:Metadata={title:'EasyOpen 앱 다운로드',description:'EasyOpen Desktop Windows 베타와 Galaxy·Android 베타 APK를 다운로드하세요.'};
export default function Download(){return <section className="shell page-section"><span className="section-kicker">DOWNLOAD EASYOPEN</span><h1 className="page-title">EasyOpen을 앱으로 만나보세요.</h1><p className="page-desc">현재 버전은 실기기 검증 중인 공개 베타입니다. 운영체제에 맞는 파일과 SHA-256 체크섬을 확인하고 설치해 주세요.</p><DownloadPanel/><div className="note-bar">ⓘ EasyOpen 앱 자체의 배포 파일입니다. 카탈로그에서 소개하는 다른 오픈소스 프로그램은 각 원작자의 공식 배포처를 이용합니다.</div></section>}
