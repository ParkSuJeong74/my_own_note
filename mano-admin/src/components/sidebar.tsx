import Link from "next/link";

const links = [
  { href: "/", label: "Overview" },
  { href: "/services", label: "Services" },
  { href: "/workspaces", label: "Workspaces" },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">M</span><div><strong>Mano</strong><small>Home operations</small></div></div>
      <nav>{links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}</nav>
      <div className="sidebar-foot"><span className="status-dot healthy" /> Read-only console</div>
    </aside>
  );
}
