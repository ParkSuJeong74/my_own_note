import { createTaskAction, updateTaskStatusAction } from "@/app/automation/actions";
import { listTasks, listWorkspaces } from "@/lib/automation-repository";
import { taskStatuses } from "@/lib/automation-types";

export const dynamic = "force-dynamic";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ workspace?: string }> }) {
  const { workspace } = await searchParams;
  const [tasks, workspaces] = await Promise.all([listTasks(workspace), listWorkspaces()]);
  const statusLabels = { todo: "할 일", in_progress: "진행 중", waiting_approval: "승인 대기", completed: "완료", failed: "실패" };
  const priorityLabels: Record<string, string> = { low: "낮음", normal: "보통", high: "높음" };
  return <><header className="page-head"><div><p className="eyebrow">자동화</p><h1>작업</h1><p>자동화 연동 전에도 공통 작업을 만들고 진행 상태를 관리할 수 있습니다.</p></div></header>
    <form action={createTaskAction} className="create-panel"><select name="workspaceId" required defaultValue=""><option value="" disabled>작업 공간</option>{workspaces.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><input name="title" required maxLength={160} placeholder="작업 제목" /><input name="description" maxLength={500} placeholder="간단한 설명" /><select name="priority" defaultValue="normal"><option value="low">낮음</option><option value="normal">보통</option><option value="high">높음</option></select><button type="submit">작업 만들기</button></form>
    <div className="filter-row"><a href="/automation/tasks" className={!workspace ? "active" : ""}>전체</a>{workspaces.map((item) => <a className={workspace === item.slug ? "active" : ""} href={`/automation/tasks?workspace=${item.slug}`} key={item.id}>{item.name}</a>)}</div>
    <section className="data-list">{tasks.map((task) => <article key={task.id}><div className="data-main"><div className="data-meta"><span>{task.workspaceName}</span><span>{priorityLabels[task.priority] ?? task.priority}</span></div><h2>{task.title}</h2><p>{task.description || "설명 없음"}</p>{task.artifacts.map((artifact) => <code key={artifact.id}>{artifact.path}</code>)}</div><form action={updateTaskStatusAction} className="status-form"><input type="hidden" name="id" value={task.id} /><select name="status" defaultValue={task.status}>{taskStatuses.map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}</select><button type="submit">변경</button></form></article>)}</section>
  </>;
}
