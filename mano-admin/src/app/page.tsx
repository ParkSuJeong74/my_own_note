import Link from "next/link";
import { ServiceCard } from "@/components/service-card";
import { getDashboardData } from "@/lib/dashboard";
import { listNotes, listUpcoming } from "@/lib/automation-repository";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const [data, recentNotes, upcoming] = await Promise.all([getDashboardData(), listNotes(), listUpcoming()]);
  const counts = data.services.reduce((result, service) => ({ ...result, [service.status]: result[service.status] + 1 }), { healthy: 0, unhealthy: 0, unknown: 0 });
  const featured = data.services.filter((service) => ["n8n", "grafana", "file-browser", "minio"].includes(service.id));

  return <>
    <header className="page-head"><div><p className="eyebrow">HOME SERVER</p><h1>Everything is in view.</h1><p>Infrastructure and automation health, without the dangerous controls.</p></div><div className="timestamp">Updated {new Date(data.checkedAt).toLocaleTimeString("en-GB")}</div></header>
    <section className="metrics">
      {[{ label: "CPU usage", value: data.summary.cpu }, { label: "Memory usage", value: data.summary.memory }, { label: "Disk usage", value: data.summary.disk }].map((metric) => <article className="metric" key={metric.label}><span>{metric.label}</span><strong>{metric.value === null ? "—" : `${metric.value}%`}</strong><div className="meter"><i style={{ width: `${metric.value ?? 0}%` }} /></div></article>)}
      <article className="metric health-total"><span>Service health</span><strong>{counts.healthy} healthy</strong><p>{data.services.length} total · {counts.unhealthy} down · {counts.unknown} unknown</p></article>
    </section>
    <section className="personal-summary"><article><div className="section-head"><h3>Upcoming</h3><Link href="/calendar">Calendar →</Link></div>{upcoming.events.slice(0,3).map((event)=><Link href="/calendar" key={event.id}>{event.title}<small>{new Date(event.startsAt).toLocaleString("en-GB",{timeZone:"Asia/Seoul"})} · {event.workspace_name||"Personal"}</small></Link>)}{upcoming.tasks.slice(0,3).map((task)=><Link href={`/automation/tasks/${task.id}`} key={task.id}>{task.title}<small>Due {new Date(task.dueAt).toLocaleString("en-GB",{timeZone:"Asia/Seoul"})} · {task.workspace_name}</small></Link>)}{upcoming.events.length+upcoming.tasks.length===0&&<small>No upcoming items.</small>}</article><article><div className="section-head"><h3>Recent notes</h3><Link href="/notes">Notes →</Link></div>{recentNotes.slice(0,5).map((note)=><Link href={`/notes/${note.id}`} key={note.id}>{note.isPinned?"📌 ":""}{note.title}<small>{note.workspaceName||"Personal"} · {new Date(note.updatedAt).toLocaleDateString("en-GB")}</small></Link>)}{recentNotes.length===0&&<small>No notes yet.</small>}</article></section>
    <section className="section-head"><div><p className="eyebrow">QUICK ACCESS</p><h2>Core services</h2></div><Link href="/services">View all →</Link></section>
    <section className="service-grid">{featured.map((service) => <ServiceCard service={service} key={service.id} />)}</section>
  </>;
}
