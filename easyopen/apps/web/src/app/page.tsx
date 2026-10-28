import Link from 'next/link';

const values=[
 ['01','쉽게 찾기','하고 싶은 일을 기준으로 지원 도구와 호환 환경을 확인합니다.'],
 ['02','안에서 실행','검증된 엔진과 웹 화면을 EasyOpen 작업 공간에서 연결합니다.'],
 ['03','한곳에서 관리','실행 상태와 업데이트, 복구, 제거 범위를 구분해 관리합니다.'],
];

export default function Home(){return <>
 <section className="hero"><div className="shell hero-layout hero-layout-simple">
  <div className="hero-main"><div className="eyebrow"><span className="live-dot"/> EASYOPEN</div><h1>좋은 프로그램은<br/><span>더 쉽게 써야 하니까.</span></h1><p>복잡한 설치 과정은 EasyOpen에 맡기고, 지원하는 오픈소스를 한 앱 안에서 사용하세요. 지금은 Jellyfin부터 차근차근 검증하고 있습니다.</p><div className="hero-actions"><Link className="btn btn-primary" href="/download/">EasyOpen 다운로드 <span aria-hidden="true">↓</span></Link><Link className="btn btn-outline" href="/apps/jellyfin/">Jellyfin 알아보기</Link></div><div className="hero-small"><span>무료로 시작</span><span>GitHub 공개 자산 사용</span><span>내 파일은 내 기기에</span></div></div>
 </div></section>
 <section className="section shell product-promise"><div className="section-top"><div><span className="section-kicker">WHY EASYOPEN</span><h2>찾는 순간부터 사용하는 순간까지.</h2><p>도구 수보다 첫 실행 성공과 이해하기 쉬운 복구를 중요하게 생각합니다.</p></div></div><div className="value-cards">{values.map(([number,title,description])=><article className="value-card" key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div></section>
 <section className="section trust-section"><div className="shell"><div className="section-top"><div><span className="section-kicker">BUILT ON TRUST</span><h2>모르는 상태를 완료처럼 보이지 않게.</h2></div></div><div className="trust-grid"><article><h3>공식 출처</h3><p>원작자, 라이선스와 공식 무료 경로를 함께 확인합니다.</p></article><article><h3>상태를 그대로</h3><p>사용 가능, 검증 중, 준비 중, 연결 필요와 오류를 구분합니다.</p></article><article><h3>데이터는 분리</h3><p>앱과 엔진, 설정, 사용자 원본 파일의 제거 범위를 나눕니다.</p></article></div></div></section>
 </>}
