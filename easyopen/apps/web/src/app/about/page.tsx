import type {Metadata} from 'next';
import Link from 'next/link';

export const metadata:Metadata={title:'EasyOpen 소개'};

export default function About(){return <section className="shell page-section article-narrow">
  <span className="section-kicker">ABOUT EASYOPEN</span>
  <h1 className="page-title">설치보다,<br/>하고 싶은 일에 집중하세요.</h1>
  <p className="page-desc">EasyOpen은 오픈소스 프로그램을 쉽게 준비하고 실행·관리하도록 돕는 앱입니다. 첫 지원 대상인 Jellyfin은 현재 통합 검증 중입니다.</p>
  <div className="content-panel prose">
    <h2>EasyOpen으로 무엇이 달라지나요?</h2>
    <p>복잡한 설치 과정과 설정을 이해하기 쉽게 안내합니다. 지원 도구를 선택하면 현재 기기에 필요한 준비 사항과 다음 단계를 확인할 수 있습니다. 검증이 완료되지 않은 기능은 사용할 수 있는 것처럼 표시하지 않습니다.</p>
    <div className="about-flow"><article><b>1</b><strong>도구 선택</strong><p>하고 싶은 일에 맞는 지원 도구를 찾습니다.</p></article><article><b>2</b><strong>사용 준비</strong><p>필요한 파일과 실행 환경을 확인합니다.</p></article><article><b>3</b><strong>앱 안에서 사용</strong><p>검증된 기능부터 실행과 상태 확인, 문제 해결을 한곳에서 진행합니다.</p></article></div>
    <h2>EasyOpen이 지키는 것</h2>
    <p>지원하지 않는 기능을 사용할 수 있는 것처럼 표시하지 않습니다. 자동 설치 대상으로 사용하는 파일은 출처를 검토한 공개 자료로 제한합니다. 앱 설정과 사용자의 원본 파일도 구분해 관리하도록 설계했습니다.</p>
    <h2>무료로 시작할 수 있나요?</h2>
    <p>기본 기능은 계정이나 결제 없이 시작할 수 있습니다. 각 오픈소스의 원작자, 라이선스와 원본 소스를 함께 표시합니다.</p>
    <div className="guide-actions"><Link className="btn btn-primary" href="/download/">EasyOpen 다운로드 ↓</Link><Link className="btn btn-outline" href="/apps/">지원 도구 보기 →</Link></div>
  </div>
</section>}
