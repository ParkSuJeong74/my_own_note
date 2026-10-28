import Link from 'next/link';
import {DownloadPanel} from '@/components/DownloadPanel';

const values=[
 ['01','쉽게 찾기','하고 싶은 일을 기준으로 지원 도구와 호환 환경을 확인합니다.'],
 ['02','안에서 실행','검증된 엔진과 웹 화면을 EasyOpen 작업 공간에서 연결합니다.'],
 ['03','한곳에서 관리','실행 상태와 업데이트, 복구, 제거 범위를 구분해 관리합니다.'],
];

export default function Home(){return <>
 <section className="hero"><div className="shell hero-layout">
  <div className="hero-main"><div className="eyebrow"><span className="live-dot"/> YOUR OPEN SOURCE COMPANION</div><h1>좋은 프로그램은<br/><span>더 쉽게 써야 하니까.</span></h1><p>복잡한 GitHub, 어려운 설치 설명은 잠시 내려놓으세요.<br/>필요한 무료 오픈소스를 찾고, EasyOpen 안에서 시작하세요.</p><div className="hero-actions"><Link className="btn btn-primary" href="/apps/">프로그램 둘러보기 <span aria-hidden="true">↗</span></Link><Link className="btn btn-outline" href="/download/">플랫폼별 지원 현황</Link></div><div className="hero-small"><span>누구나 무료</span><span>공식 출처 안내</span><span>한국어 가이드</span></div></div>
  <div className="hero-visual" aria-hidden="true"><div className="visual-top"><span className="visual-dots">● ● ●</span><span>discover / connect / enjoy</span></div><div className="visual-canvas"><div className="floating-label float-one">✦ 손쉬운 발견</div><div className="center-icon">e.</div><div className="float-card float-two"><span>▶</span><div><b>Jellyfin</b><small>첫 통합 테스트</small></div><span>↗</span></div><div className="float-card float-three"><span>✦</span><div><b>지원 도구</b><small>EasyOpen 안에서 시작</small></div><span>↗</span></div><div className="orbit orbit-a"/><div className="orbit orbit-b"/></div><div className="visual-bottom"><span>OPEN SOURCE, OPEN POSSIBILITIES</span><span>01 / 03</span></div></div>
 </div></section>
 <section className="section shell product-promise"><div className="section-top"><div><span className="section-kicker">WHY EASYOPEN</span><h2>찾는 순간부터 사용하는 순간까지.</h2><p>도구 수보다 첫 실행 성공과 이해하기 쉬운 복구를 중요하게 생각합니다.</p></div></div><div className="value-cards">{values.map(([number,title,description])=><article className="value-card" key={number}><span>{number}</span><h3>{title}</h3><p>{description}</p></article>)}</div></section>
 <section className="section focus-section"><div className="shell focus-layout"><div><span className="section-kicker">FIRST INTEGRATION</span><h2>첫 검증은 Jellyfin부터.</h2><p>PC에서 서버를 준비하고 Android에서 이어 보는 전체 과정을 검증합니다. 현재 가능한 범위와 막힌 단계를 한국어로 안내합니다.</p><Link className="text-link" href="/guides/jellyfin/">Jellyfin 시작 가이드 보기 <span aria-hidden="true">→</span></Link></div><div className="focus-state"><span className="status-badge status-warning">실기기 검증 전</span><strong>지원 완료로 표시하지 않습니다.</strong><p>빌드 파일이 있어도 설치·연결·재생을 실제 기기에서 통과하기 전까지는 검증 중으로 안내합니다.</p></div></div></section>
 <section className="section shell"><div className="section-top"><div><span className="section-kicker">PLATFORM STATUS</span><h2>플랫폼별 준비 상태</h2><p>다운로드 링크보다 현재 가능한 범위와 제한을 먼저 확인하세요.</p></div><Link className="text-link" href="/download/">전체 배포 안내 <span aria-hidden="true">→</span></Link></div><DownloadPanel/></section>
 <section className="section trust-section"><div className="shell"><div className="section-top"><div><span className="section-kicker">BUILT ON TRUST</span><h2>모르는 상태를 완료처럼 보이지 않게.</h2></div></div><div className="trust-grid"><article><h3>공식 출처</h3><p>원작자, 라이선스와 공식 무료 경로를 함께 확인합니다.</p></article><article><h3>상태를 그대로</h3><p>사용 가능, 검증 중, 준비 중, 연결 필요와 오류를 구분합니다.</p></article><article><h3>데이터는 분리</h3><p>앱과 엔진, 설정, 사용자 원본 파일의 제거 범위를 나눕니다.</p></article></div></div></section>
 </>}
