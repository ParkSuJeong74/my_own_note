import { workspaces } from "@/config/services";

export default function WorkspacesPage() {
  return <><header className="page-head"><div><p className="eyebrow">FUTURE AUTOMATION</p><h1>Workspaces</h1><p>Reserved domains for future tasks and approvals. No automation is connected yet.</p></div></header><section className="workspace-list">{workspaces.map((workspace, index) => <article key={workspace.id}><span>0{index + 1}</span><div><h2>{workspace.name}</h2><p>{workspace.description}</p></div><em>Planned</em></article>)}</section></>;
}
