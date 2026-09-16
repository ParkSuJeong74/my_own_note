import { Workspace } from "./workspace";

export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#main-content">본문으로 바로가기</a>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Mano 홈">mano</a>
        <span className="phase-badge">로컬 작업 공간</span>
      </header>
      <main id="main-content" className="workspace-main">
        <Workspace />
      </main>
      <footer className="site-footer">현재 작업은 새로고침하면 초기화됩니다. 저장 기능을 준비하고 있어요.</footer>
    </>
  );
}
