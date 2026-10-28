import Link from "next/link";

const values = [
  [
    "01",
    "쉽게 찾기",
    "하고 싶은 일을 기준으로 지원 도구와 호환 환경을 확인합니다.",
  ],
  [
    "02",
    "안에서 실행",
    "지원이 검증된 도구부터 앱에서 실행할 수 있도록 연결합니다.",
  ],
  [
    "03",
    "한곳에서 관리",
    "실행 상태와 업데이트, 복구, 제거 범위를 구분해 관리합니다.",
  ],
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="shell hero-layout">
          <div className="hero-main">
            <div className="eyebrow">
              <span className="live-dot" /> EASYOPEN BETA
            </div>
            <h1>
              좋은 프로그램은
              <br />
              <span>더 쉽게 써야 하니까</span>
            </h1>
            <p>
              EasyOpen은 좋은 무료 오픈소스 프로그램을 누구나 쉽게 찾고,
              설치하고, 실행·관리할 수 있도록 돕습니다.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/download/">
                EasyOpen 다운로드
              </Link>
              <Link className="btn btn-outline" href="/apps/">
                프로그램 둘러보기 <span aria-hidden="true">→</span>
              </Link>
            </div>
            <div className="hero-small">
              <span>누구나 무료</span>
              <span>공식 출처 안내</span>
              <span>쉬운 한국어 설명</span>
            </div>
          </div>
          <div
            className="hero-visual"
            role="img"
            aria-label="EasyOpen에서 무료 프로그램을 발견하고 살펴보는 과정을 표현한 화면"
          >
            <div className="visual-top">
              <span className="visual-dots" aria-hidden="true">
                ● ● ●
              </span>
              <span>discover / connect / enjoy</span>
            </div>
            <div className="visual-canvas">
              <div className="floating-label float-one">✦ 손쉬운 발견</div>
              <div className="center-icon">e.</div>
              <div className="float-card float-two">
                <span aria-hidden="true">▶</span>
                <div>
                  <b>Jellyfin</b>
                  <small>소개와 지원 상태</small>
                </div>
                <span aria-hidden="true">→</span>
              </div>
              <div className="float-card float-three">
                <span aria-hidden="true">✦</span>
                <div>
                  <b>무료 프로그램</b>
                  <small>한곳에서 살펴보기</small>
                </div>
                <span aria-hidden="true">→</span>
              </div>
              <div className="orbit orbit-a" />
              <div className="orbit orbit-b" />
            </div>
            <div className="visual-bottom">
              <span>OPEN SOURCE, OPEN POSSIBILITIES</span>
              <span>01 / 03</span>
            </div>
          </div>
        </div>
      </section>
      <section className="section shell product-promise">
        <div className="section-top">
          <div>
            <span className="section-kicker">WHY EASYOPEN</span>
            <h2>찾는 순간부터 사용하는 순간까지</h2>
            <p>
              많은 프로그램을 보여주는 것보다, 처음부터 막힘없이 사용할 수
              있도록 돕는 일을 더 중요하게 생각합니다.
            </p>
          </div>
        </div>
        <div className="value-cards">
          {values.map(([number, title, description]) => (
            <article className="value-card" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="section trust-section">
        <div className="shell">
          <div className="section-top">
            <div>
              <span className="section-kicker">BUILT ON TRUST</span>
              <h2>안심하고 선택할 수 있도록</h2>
            </div>
          </div>
          <div className="trust-grid">
            <article>
              <h3>공식 출처</h3>
              <p>만든 곳과 공식 무료 다운로드 경로를 확인해 안내합니다.</p>
            </article>
            <article>
              <h3>솔직한 지원 안내</h3>
              <p>지금 쓸 수 있는 기능과 아직 준비 중인 기능을 구분합니다.</p>
            </article>
            <article>
              <h3>내 파일은 소중하게</h3>
              <p>프로그램을 정리해도 사용자의 원본 파일은 따로 보호합니다.</p>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
