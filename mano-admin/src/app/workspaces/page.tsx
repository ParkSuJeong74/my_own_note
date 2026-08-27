import Link from "next/link";
import { listWorkspaces } from "@/lib/automation-repository";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  const workspaces = await listWorkspaces();
  return <><header className="page-head"><div><p className="eyebrow">AUTOMATION DOMAINS</p><h1>Workspaces</h1><p>Shared task boundaries for projects and content automation.</p></div></header><section className="workspace-list">{workspaces.map((workspace, index) => <Link href={`/automation/tasks?workspace=${workspace.slug}`} key={workspace.id}><article><span>0{index + 1}</span><div><h2>{workspace.name}</h2><p>{workspace.description}</p></div><em>{workspace.taskCount} tasks</em></article></Link>)}</section></>;
}
