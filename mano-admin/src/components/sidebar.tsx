import Link from "next/link";

const links = [
  { href: "/", label: "Overview" },
  { href: "/services", label: "Services" },
];

const personalLinks = [{href:"/notes",label:"Notes"},{href:"/calendar",label:"Calendar"}];

const automationLinks = [
  { href: "/automation/tasks", label: "Tasks" },
  { href: "/automation/approvals", label: "Approvals" },
  { href: "/automation/runs", label: "Runs" },
];

const workspaceLinks = [
  {href:"/workspaces/project-a",label:"Project A"},{href:"/workspaces/project-t",label:"Project T"},
  {href:"/workspaces/blog",label:"Blog"},{href:"/workspaces/youtube",label:"YouTube"},{href:"/workspaces/freelancer",label:"Freelancer"},
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">M</span><div><strong>Mano</strong><small>Home operations</small></div></div>
      <nav>
        {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        <small className="nav-label">Personal</small>
        {personalLinks.map((link)=><Link key={link.href} href={link.href}>{link.label}</Link>)}
        <small className="nav-label">Automation</small>
        {automationLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        <small className="nav-label">Workspaces</small>
        <Link href="/workspaces">All workspaces</Link>
        {workspaceLinks.map((link)=><Link className="workspace-nav-link" key={link.href} href={link.href}>{link.label}</Link>)}
      </nav>
      <div className="sidebar-foot"><span className="status-dot healthy" /> Access protected</div>
    </aside>
  );
}
