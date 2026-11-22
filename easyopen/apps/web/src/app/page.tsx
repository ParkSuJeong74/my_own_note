import Link from 'next/link';

const values=[
 ['01','시작은 더 간단하게','설치 방법과 준비 과정을 여기저기 찾아다니는 수고를 줄여 드립니다.'],
 ['02','관리는 한곳에서','프로그램을 준비하고 실행 상태를 확인하는 흐름을 EasyOpen 안에 모읍니다.'],
 ['03','중요한 정보는 분명하게','설치 전 알아야 할 내용과 데이터에 미치는 영향을 숨기지 않고 안내합니다.'],
];

export default function Home(){return <>
 <section className="hero"><div className="shell hero-layout">
  <div className="hero-main"><div className="eyebrow"><span className="live-dot"/> EASYOPEN BETA</div><h1>좋은 프로그램은<br/><span>더 쉽게 써야 하니까</span></h1><p>복잡한 준비는 EasyOpen에 맡기고, 하고 싶은 일에 더 빠르게 집중하세요. 여러 무료 오픈소스 프로그램을 하나의 익숙한 앱에서 시작하고 관리할 수 있도록 돕습니다.</p><div className="hero-actions"><Link className="btn btn-primary" href="/download/">EasyOpen 다운로드</Link><a className="btn btn-outline" href="#why">EasyOpen 살펴보기 <span aria-hidden="true">↓</span></a></div><div className="hero-small"><span>무료로 시작</span><span>공식 배포 경로</span><span>쉬운 한국어 안내</span></div></div>
  <div className="hero-visual" role="img" aria-label="EasyOpen에서 프로그램을 준비하고 관리하는 흐름을 표현한 그림"><div className="visual-top"><span className="visual-dots" aria-hidden="true">● ● ●</span><span>start / use / manage</span></div><div className="visual-canvas"><div className="floating-label float-one">✦ 복잡한 준비는 줄이고</div><div className="center-icon">e.</div><div className="float-card float-two"><span aria-hidden="true">▶</span><div><b>간단한 시작</b><small>안내에 따라 차근차근</small></div><span aria-hidden="true">→</span></div><div className="float-card float-three"><span aria-hidden="true">✓</span><div><b>한곳에서 관리</b><small>상태를 보기 쉽게</small></div><span aria-hidden="true">→</span></div><div className="orbit orbit-a"/><div className="orbit orbit-b"/></div><div className="visual-bottom"><span>OPEN SOURCE, MADE EASIER</span><span>EASYOPEN</span></div></div>
 </div></section>
 <section className="section shell product-promise" id="why"><div className="section-top"><div><span className="section-kicker">WHY EASYOPEN</span><h2>프로그램보다, 쉬운 시작을 먼저 생각합니다.</h2><p>지원 프로그램은 앱 안에서 계속 바뀌고 늘어납니다. 웹사이트는 변하지 않는 EasyOpen의 약속과 안전한 다운로드 경로에 집중합니다.</p></div></div><div className="value-cards">{values.map(([number,title,description])=><article className="value-card" key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div></section>
 <section className="download-callout"><div className="shell download-callout-inner"><div><span className="section-kicker">START WITH EASYOPEN</span><h2>어떤 프로그램부터 시작할지는<br/>앱 안에서 천천히 골라도 괜찮아요.</h2><p>먼저 내 기기에 맞는 EasyOpen을 받아보세요.</p></div><Link className="btn btn-primary" href="/download/">내 기기에 맞게 다운로드 <span aria-hidden="true">→</span></Link></div></section>
 </>}
