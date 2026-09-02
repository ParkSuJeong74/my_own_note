import Link from "next/link";
import { updateWorkspaceDirectionAction } from "@/app/workspaces/actions";
import { listWorkspaces } from "@/lib/automation-repository";
import { workspaceDirectionMaxLength } from "@/lib/workspace-direction";

export const dynamic = "force-dynamic";

export default async function ManageWorkspacesPage() {
  const workspaces = await listWorkspaces();
  return <><header className="page-head"><div><p className="eyebrow">WORKSPACE MANAGEMENT</p><h1>Project direction</h1><p>블로그 대신 각 프로젝트의 전체적인 발전 방향과 장기 계획을 기록합니다.</p></div><Link className="text-link" href="/workspaces">← Workspaces</Link></header><section className="workspace-management-list">{workspaces.map((workspace) => <article key={workspace.id}><div className="workspace-management-head"><div><span>{workspace.workspaceType}</span><h2>{workspace.name}</h2><p>{workspace.description || "설명이 없습니다."}</p></div><Link href={`/workspaces/${workspace.slug}`}>Open workspace →</Link></div><form action={updateWorkspaceDirectionAction}><input type="hidden" name="id" value={workspace.id}/><input type="hidden" name="slug" value={workspace.slug}/><label><span>전체 발전 방향</span><textarea name="direction" defaultValue={workspace.details.direction ?? ""} maxLength={workspaceDirectionMaxLength} placeholder="이 프로젝트가 어디로 발전해야 하는지, 우선순위와 원칙, 장기 아이디어를 자유롭게 적어 주세요."/></label><div className="editor-actions"><small>최대 {workspaceDirectionMaxLength.toLocaleString("ko-KR")}자</small><button>Save direction</button></div></form></article>)}</section></>;
}
