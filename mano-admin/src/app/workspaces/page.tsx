import Link from "next/link";
import { updatePersonalDirectionAction } from "@/app/workspaces/actions";
import { getPersonalDirection, listWorkspaces } from "@/lib/automation-repository";
import { workspaceDirectionMaxLength } from "@/lib/workspace-direction";
import { DirectionEditorModal } from "@/components/direction-editor-modal";
import { DirectionMarkdown } from "@/components/direction-markdown";

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  const [workspaces, personalDirection] = await Promise.all([listWorkspaces(), getPersonalDirection()]);
  const updatedAt = personalDirection.updatedAt ? new Date(personalDirection.updatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : null;
  return <><header className="page-head"><div><p className="eyebrow">AUTOMATION DOMAINS</p><h1>Workspaces</h1><p>Project resources and automation tasks, organized in one place.</p></div><a className="button-link secondary-link" href="https://github.com/ParkSuJeong74/my_own_note" target="_blank" rel="noreferrer">Mano GitHub ↗</a></header><section className="personal-direction-panel"><div className="direction-intro"><p className="eyebrow">MY NORTH STAR</p><h2>인생 · 커리어 · 장기 목표</h2><p>개별 프로젝트를 넘어 내가 어떤 삶과 커리어를 만들어 갈지 기록합니다.</p>{updatedAt && <small>마지막 저장 {updatedAt}</small>}</div><div className="direction-content">{personalDirection.content ? <DirectionMarkdown content={personalDirection.content}/> : <div className="direction-empty"><span>✦</span><p>아직 나의 방향을 적지 않았어요.<br/>지금 중요하게 생각하는 한 문장부터 시작해 보세요.</p></div>}<DirectionEditorModal action={updatePersonalDirectionAction} content={personalDirection.content} title="인생 · 커리어 · 장기 목표" description="읽기 화면을 유지한 채 넓은 공간에서 나의 방향을 다듬어 보세요." openLabel={personalDirection.content ? "Edit direction" : "Write my direction"} saveLabel="Save my direction" maxLength={workspaceDirectionMaxLength} placeholder={"# 내가 원하는 삶\n\n중요하게 생각하는 원칙과 장기 목표를 자유롭게 적어 주세요.\n\n- 나답게 오래 일하기\n- 좋아하는 사람들과 충분한 시간 보내기"}/></div></section><section className="workspace-list workspace-cards">{workspaces.map((workspace, index) => <article key={workspace.id}><span>0{index + 1}</span><div className="workspace-body"><h2><Link href={`/workspaces/${workspace.slug}`}>{workspace.name}</Link></h2><p>{workspace.description}</p><div className="workspace-links">{workspace.links.map((link) => <a href={link.url} target="_blank" rel="noreferrer" key={link.url}>{link.label} ↗</a>)}</div></div><div className="workspace-card-actions"><Link href={`/workspaces/${workspace.slug}`}>Open workspace</Link><Link className="task-count" href={`/automation/tasks?workspace=${workspace.slug}`}>{workspace.taskCount} tasks →</Link></div></article>)}</section></>;
}
