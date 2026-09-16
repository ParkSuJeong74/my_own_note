import { Workspace } from "./workspace";

export default function HomePage() {
  return (
    <>
      <a className="skip-link" href="#main-content">본문으로 바로가기</a>
      <main id="main-content" className="workspace-main">
        <Workspace />
      </main>
    </>
  );
}
