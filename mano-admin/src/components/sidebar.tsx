import Link from "next/link";

const links = [
  { href: "/", label: "개요" },
  { href: "/services", label: "서비스" },
];

const automationLinks = [
  { href: "/automation/tasks", label: "작업" },
  { href: "/automation/approvals", label: "승인" },
  { href: "/automation/runs", label: "실행 이력" },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">M</span><div><strong>Mano</strong><small>홈서버 운영</small></div></div>
      <nav>
        {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        <small className="nav-label">자동화</small>
        {automationLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        <small className="nav-label">작업 공간</small>
        <Link href="/workspaces">전체 작업 공간</Link>
      </nav>
      <div className="sidebar-foot"><span className="status-dot healthy" /> Access 보호됨</div>
    </aside>
  );
}
