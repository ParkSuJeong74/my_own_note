import Link from "next/link";
import { listWorkspaces } from "@/lib/automation-repository";

const links = [
  { href: "/services", label: "Services" },
  { href: "/errors", label: "Error Logs" },
];

const personalLinks = [{href:"/calendar",label:"Calendar"},{href:"/health",label:"Health"},{href:"/money",label:"Money"},{href:"/t1",label:"T1 WIN"},{href:"/notifications",label:"Notifications"}];

const automationLinks = [
  { href: "/automation/guide", label: "AI Guide" },
  { href: "/github-actions", label: "GitHub Actions" },
  { href: "/automation/instructions", label: "AI Instructions" },
  { href: "/automation/integrations", label: "Integrations" },
  { href: "/automation/tasks", label: "Tasks" },
  { href: "/automation/approvals", label: "Approvals" },
  { href: "/automation/runs", label: "Executions" },
];

export async function Sidebar() {
  let workspaces=[
    {id:"project-a",slug:"project-a",name:"Project A"},{id:"project-t",slug:"project-t",name:"Project T"},
    {id:"blog",slug:"blog",name:"Blog"},{id:"youtube",slug:"youtube",name:"YouTube"},{id:"freelancer",slug:"freelancer",name:"Freelancer"},{id:"mano",slug:"my-own-note",name:"Mano"},
  ];
  try { workspaces=(await listWorkspaces()).map(({id,slug,name})=>({id,slug,name})); } catch { /* Build and transient DB fallback. */ }
  return (
    <aside className="sidebar">
      <Link className="brand" href="/" aria-label="Go to overview"><span className="brand-mark">M</span><div><strong>Mano</strong><small>Home operations</small></div></Link>
      <nav>
        {links.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        <small className="nav-label">Personal</small>
        {personalLinks.map((link)=><Link key={link.href} href={link.href}>{link.label}</Link>)}
        <small className="nav-label">Automation</small>
        {automationLinks.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
        <small className="nav-label">Workspaces</small>
        <Link href="/workspaces">All workspaces</Link>
        {workspaces.map((workspace)=><Link className="workspace-nav-link" key={workspace.id} href={`/workspaces/${workspace.slug}`}>{workspace.name}</Link>)}
      </nav>
      <div className="sidebar-foot"><span className="status-dot healthy" /> Access protected</div>
    </aside>
  );
}
