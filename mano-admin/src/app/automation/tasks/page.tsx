import { createTaskAction, updateTaskStatusAction } from "@/app/automation/actions";
import { AutomationHelp } from "@/components/automation-help";
import { listTasks, listWorkspaces } from "@/lib/automation-repository";
import { taskStatuses } from "@/lib/automation-types";

export const dynamic = "force-dynamic";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ workspace?: string }> }) {
  const { workspace } = await searchParams;
  const [tasks, workspaces] = await Promise.all([listTasks(workspace), listWorkspaces()]);
  return <><header className="page-head"><div><p className="eyebrow">AUTOMATION</p><h1>Tasks</h1><p>AI Worker에게 맡길 작업을 간단히 등록합니다.</p></div></header>
    <AutomationHelp steps={["프로젝트를 고르고 원하는 변경을 편하게 적으세요.", "작업 만들기 후 저장소를 확인하고 ‘저장 후 실행’을 누르세요.", "Executions에서 결과와 테스트를 확인하세요."]} risk="실행하면 Worker가 코드를 수정하고 작업 브랜치를 push해 PR을 만들 수 있습니다. 비밀번호나 토큰은 요청에 적지 마세요."/>
    <form action={createTaskAction} className="create-panel quick-task-create"><input type="hidden" name="priority" value="normal"/><select name="workspaceId" required defaultValue=""><option value="" disabled>어느 프로젝트?</option>{workspaces.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><textarea name="description" required maxLength={2000} placeholder={'무엇을 바꿀까요?\n예: T1 화면에서 다음 경기 시간을 더 크게 보여줘'} /><button type="submit">다음</button></form>
    <div className="filter-row"><a href="/automation/tasks" className={!workspace ? "active" : ""}>All</a>{workspaces.map((item) => <a className={workspace === item.slug ? "active" : ""} href={`/automation/tasks?workspace=${item.slug}`} key={item.id}>{item.name}</a>)}</div>
    <section className="data-list">{tasks.map((task) => <article key={task.id}><div className="data-main"><div className="data-meta"><span>{task.workspaceName}</span><span>{task.priority}</span><span>{task.taskType}</span></div><h2><a href={`/automation/tasks/${task.id}`}>{task.title}</a></h2><p>{task.description || "No description"}</p>{task.artifacts.map((artifact) => <code key={artifact.id}>{artifact.path}</code>)}</div><form action={updateTaskStatusAction} className="status-form"><input type="hidden" name="id" value={task.id} /><select name="status" defaultValue={task.status}>{taskStatuses.map((status) => <option value={status} key={status}>{status.replaceAll("_", " ")}</option>)}</select><button type="submit">Update</button></form></article>)}</section>
  </>;
}
