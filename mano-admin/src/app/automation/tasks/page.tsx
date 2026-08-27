import { createTaskAction, updateTaskStatusAction } from "@/app/automation/actions";
import { listTasks, listWorkspaces } from "@/lib/automation-repository";
import { taskStatuses } from "@/lib/automation-types";

export const dynamic = "force-dynamic";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ workspace?: string }> }) {
  const { workspace } = await searchParams;
  const [tasks, workspaces] = await Promise.all([listTasks(workspace), listWorkspaces()]);
  return <><header className="page-head"><div><p className="eyebrow">AUTOMATION</p><h1>Tasks</h1><p>Create common work items and track their state before an automation provider is connected.</p></div></header>
    <form action={createTaskAction} className="create-panel"><select name="workspaceId" required defaultValue=""><option value="" disabled>Workspace</option>{workspaces.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select><input name="title" required maxLength={160} placeholder="Task title" /><input name="description" maxLength={500} placeholder="Short description" /><select name="priority" defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select><button type="submit">Create task</button></form>
    <div className="filter-row"><a href="/automation/tasks" className={!workspace ? "active" : ""}>All</a>{workspaces.map((item) => <a className={workspace === item.slug ? "active" : ""} href={`/automation/tasks?workspace=${item.slug}`} key={item.id}>{item.name}</a>)}</div>
    <section className="data-list">{tasks.map((task) => <article key={task.id}><div className="data-main"><div className="data-meta"><span>{task.workspaceName}</span><span>{task.priority}</span><span>{task.taskType}</span></div><h2><a href={`/automation/tasks/${task.id}`}>{task.title}</a></h2><p>{task.description || "No description"}</p>{task.artifacts.map((artifact) => <code key={artifact.id}>{artifact.path}</code>)}</div><form action={updateTaskStatusAction} className="status-form"><input type="hidden" name="id" value={task.id} /><select name="status" defaultValue={task.status}>{taskStatuses.map((status) => <option value={status} key={status}>{status.replaceAll("_", " ")}</option>)}</select><button type="submit">Update</button></form></article>)}</section>
  </>;
}
