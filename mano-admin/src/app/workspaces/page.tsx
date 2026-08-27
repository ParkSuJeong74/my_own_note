import Link from "next/link";
import { listWorkspaces } from "@/lib/automation-repository";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  const workspaces = await listWorkspaces();
  return <><header className="page-head"><div><p className="eyebrow">AUTOMATION DOMAINS</p><h1>Workspaces</h1><p>Project resources and automation tasks, organized in one place.</p></div><a className="button-link" href="https://github.com/ParkSuJeong74/my_own_note" target="_blank" rel="noreferrer">Mano GitHub ↗</a></header><section className="workspace-list workspace-cards">{workspaces.map((workspace, index) => <article key={workspace.id}><span>0{index + 1}</span><div className="workspace-body"><h2><Link href={`/workspaces/${workspace.slug}`}>{workspace.name}</Link></h2><p>{workspace.description}</p><div className="workspace-links">{workspace.links.map((link) => <a href={link.url} target="_blank" rel="noreferrer" key={link.url}>{link.label} ↗</a>)}</div></div><div className="workspace-card-actions"><Link href={`/workspaces/${workspace.slug}`}>Open workspace</Link><Link className="task-count" href={`/automation/tasks?workspace=${workspace.slug}`}>{workspace.taskCount} tasks →</Link></div></article>)}</section></>;
}
