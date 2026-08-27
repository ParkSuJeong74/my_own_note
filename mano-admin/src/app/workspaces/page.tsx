import Link from "next/link";
import { listWorkspaces } from "@/lib/automation-repository";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  const workspaces = await listWorkspaces();
  return <><header className="page-head"><div><p className="eyebrow">자동화 영역</p><h1>작업 공간</h1><p>프로젝트와 콘텐츠 자동화 작업을 영역별로 관리합니다.</p></div></header><section className="workspace-list">{workspaces.map((workspace, index) => <Link href={`/automation/tasks?workspace=${workspace.slug}`} key={workspace.id}><article><span>0{index + 1}</span><div><h2>{workspace.name}</h2><p>{workspace.description}</p></div><em>작업 {workspace.taskCount}개</em></article></Link>)}</section></>;
}
