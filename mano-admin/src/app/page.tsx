import Link from "next/link";
import { createGlobalTodoAction, deleteGlobalTodoAction, toggleGlobalTodoAction, updateGlobalTodoAction } from "@/app/overview-actions";
import { ServiceCard } from "@/components/service-card";
import { getDashboardData } from "@/lib/dashboard";
import { listGlobalTodos, listUpcoming, listWorkspaceBoardSummary } from "@/lib/automation-repository";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [data, board, upcoming, globalTodos] = await Promise.all([getDashboardData(), listWorkspaceBoardSummary(), listUpcoming(10), listGlobalTodos()]);
  const counts = data.services.reduce((result, service) => ({ ...result, [service.status]: result[service.status] + 1 }), { healthy: 0, unhealthy: 0, unknown: 0 });
  const featured = data.services.filter((service) => ["n8n", "grafana", "file-browser", "minio"].includes(service.id));

  return <>
    <header className="page-head"><div><p className="eyebrow">HOME SERVER</p><h1>Everything is in view.</h1><p>Infrastructure and automation health, without the dangerous controls.</p></div><div className="timestamp">Updated {new Date(data.checkedAt).toLocaleTimeString("en-GB")}</div></header>
    <section className="metrics">
      {[{ label: "CPU usage", value: data.summary.cpu }, { label: "Memory usage", value: data.summary.memory }, { label: "Disk usage", value: data.summary.disk }].map((metric) => <article className="metric" key={metric.label}><span>{metric.label}</span><strong>{metric.value === null ? "—" : `${metric.value}%`}</strong><div className="meter"><i style={{ width: `${metric.value ?? 0}%` }} /></div></article>)}
      <article className="metric health-total"><span>Service health</span><strong>{counts.healthy} healthy</strong><p>{data.services.length} total · {counts.unhealthy} down · {counts.unknown} unknown</p></article>
    </section>
    <section className="overview-grid"><article className="overview-panel"><div className="section-head"><h3>Upcoming</h3><Link href="/calendar">Calendar →</Link></div>{upcoming.events.map((event)=><Link href="/calendar" key={event.id}>{event.title}<small>{new Date(event.startsAt).toLocaleString("en-GB",{timeZone:"Asia/Seoul"})} · {event.workspace_name||"Personal"}</small></Link>)}{upcoming.tasks.map((task)=><Link href={`/automation/tasks/${task.id}`} key={task.id}>{task.title}<small>Due {new Date(task.dueAt).toLocaleString("en-GB",{timeZone:"Asia/Seoul"})} · {task.workspace_name}</small></Link>)}{upcoming.events.length+upcoming.tasks.length===0&&<small>No upcoming items.</small>}</article><article className="overview-panel global-todo-panel"><div className="section-head"><h3>Todo</h3></div><form action={createGlobalTodoAction} className="global-todo-create"><input name="title" required placeholder="Add a personal Todo"/><button>+</button></form><div className="global-todo-list">{globalTodos.map((todo)=><article className={todo.completed?"completed":""} key={todo.id}><form action={toggleGlobalTodoAction}><input type="hidden" name="id" value={todo.id}/><input type="hidden" name="completed" value={String(!todo.completed)}/><button className="todo-check">{todo.completed?"✓":""}</button></form><details><summary>{todo.title}</summary><form action={updateGlobalTodoAction}><input type="hidden" name="id" value={todo.id}/><input name="title" defaultValue={todo.title} required/><button>Save</button></form></details><form action={deleteGlobalTodoAction}><input type="hidden" name="id" value={todo.id}/><button className="todo-delete">×</button></form></article>)}</div>{globalTodos.length===0&&<small>No personal Todo items.</small>}</article><article className="overview-panel workspace-board-summary"><div className="section-head"><h3>Workspace board</h3><Link href="/workspaces">Workspaces →</Link></div><h4>Todo</h4>{board.todos.map((todo)=><Link href={`/workspaces/${todo.workspaceSlug}`} key={todo.id}><span className="summary-check"/> {todo.title}<small>{todo.workspaceName} · {todo.categoryName}</small></Link>)}{board.todos.length===0&&<small>No open Todo items.</small>}<h4>Sticky notes</h4>{board.postits.map((note)=><Link href={`/workspaces/${note.workspaceSlug}`} key={note.id}><span className={`summary-note-color ${note.color}`}/>{note.title||note.content.slice(0,40)}<small>{note.workspaceName} · {note.categoryName||"Uncategorized"}</small></Link>)}{board.postits.length===0&&<small>No sticky notes yet.</small>}</article></section>
    <section className="section-head"><div><p className="eyebrow">QUICK ACCESS</p><h2>Core services</h2></div><Link href="/services">View all →</Link></section>
    <section className="service-grid">{featured.map((service) => <ServiceCard service={service} key={service.id} />)}</section>
  </>;
}
