import type {Metadata} from 'next';
import Link from 'next/link';

export const metadata:Metadata={title:'EasyOpen 소개'};

export default function About(){return <section className="shell page-section article-narrow">
  <span className="section-kicker">ABOUT EASYOPEN</span>
  <h1 className="page-title">설치보다,<br/>하고 싶은 일에 집중하세요.</h1>
  <p className="page-desc">EasyOpen은 복잡한 오픈소스 사용 준비와 실행을 한 앱 안에 모으는 작업 공간입니다.</p>
  <div className="content-panel prose">
    <h2>EasyOpen으로 무엇이 달라지나요?</h2>
    <p>GitHub 파일, 실행 환경, 포트와 명령어를 처음부터 알아낼 필요가 없도록 돕습니다. 지원 도구를 선택하면 현재 기기에서 필요한 준비와 다음 행동을 EasyOpen이 순서대로 안내합니다.</p>
    <div className="about-flow"><article><b>1</b><strong>도구 선택</strong><p>하고 싶은 일에 맞는 지원 도구를 찾습니다.</p></article><article><b>2</b><strong>사용 준비</strong><p>필요한 파일과 실행 환경을 확인합니다.</p></article><article><b>3</b><strong>앱 안에서 사용</strong><p>실행, 업데이트와 문제 해결을 한곳에서 이어갑니다.</p></article></div>
    <h2>EasyOpen이 지키는 것</h2>
    <p>지원하지 않는 기능을 사용할 수 있는 것처럼 표시하지 않습니다. 자동으로 준비하는 Runtime과 모델은 검토한 공개 GitHub 자산으로 제한하고, 앱과 설정, 사용자의 원본 파일을 서로 구분해 관리합니다.</p>
    <h2>무료로 시작할 수 있나요?</h2>
    <p>기본 기능은 계정이나 결제 없이 시작할 수 있습니다. 각 오픈소스의 원작자, 라이선스와 원본 소스를 함께 표시합니다.</p>
    <div className="guide-actions"><Link className="btn btn-primary" href="/download/">EasyOpen 다운로드 ↓</Link><Link className="btn btn-outline" href="/apps/">지원 도구 보기 →</Link></div>
  </div>
</section>}
