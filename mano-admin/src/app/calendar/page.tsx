import { syncGoogleCalendarAction, toggleEventCompletedAction } from "@/app/personal/actions";
import { EventCreateModal } from "@/components/event-create-modal";
import { listCalendarEvents, listTasks, listWorkspaces } from "@/lib/automation-repository";
import { refreshGoogleCalendarIfStale } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";
const pad = (n: number) => String(n).padStart(2, "0");
const seoulKey = (value: string) => { const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value)); const get = (type: string) => parts.find((part) => part.type === type)?.value; return `${get("year")}-${get("month")}-${get("day")}`; };
const daysBetween = (from: string, to: string) => Math.max(0, Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000));
const addDays = (key: string, count: number) => { const date = new Date(`${key}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + count); return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`; };
const occursOn = (event: { startsAt: string; endsAt: string | null; recurrence: "NONE" | "YEARLY" }, key: string) => { const start = seoulKey(event.startsAt), end = event.endsAt ? seoulKey(event.endsAt) : start; if (event.recurrence === "NONE") return key >= start && key <= end; const occurrenceStart = `${key.slice(0, 4)}-${start.slice(5)}`, occurrenceEnd = addDays(occurrenceStart, daysBetween(start, end)); return key >= occurrenceStart && key <= occurrenceEnd; };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const requested = (await searchParams).month, now = new Date(), match = requested?.match(/^(\d{4})-(\d{2})$/), year = match ? Number(match[1]) : now.getFullYear(), month = match ? Number(match[2]) - 1 : now.getMonth();
  const first = new Date(Date.UTC(year, month, 1)), last = new Date(Date.UTC(year, month + 1, 1)), gridStart = new Date(first), gridEnd = new Date(last);
  gridStart.setUTCDate(1 - first.getUTCDay()); gridEnd.setUTCDate(last.getUTCDate() + (7 - last.getUTCDay()) % 7);
  await refreshGoogleCalendarIfStale().catch(() => null);
  const [events, tasks, workspaces] = await Promise.all([listCalendarEvents(gridStart.toISOString(), gridEnd.toISOString()), listTasks(), listWorkspaces()]);
  const previous = new Date(Date.UTC(year, month - 1, 1)), next = new Date(Date.UTC(year, month + 1, 1)), days: Date[] = [];
  for (let day = new Date(gridStart); day < gridEnd; day.setUTCDate(day.getUTCDate() + 1)) days.push(new Date(day));
  const dateKey = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`, returnTo = `/calendar?month=${year}-${pad(month + 1)}`;
  return <>
    <header className="page-head"><div><p className="eyebrow">PERSONAL</p><h1>Calendar</h1><p>See personal events and Task due dates in one monthly view.</p></div><form action={syncGoogleCalendarAction}><button type="submit">Google 일정 동기화</button></form></header>
    <div className="calendar-head"><a href={`/calendar?month=${dateKey(previous).slice(0, 7)}`}>← Previous</a><h2>{first.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</h2><a href={`/calendar?month=${dateKey(next).slice(0, 7)}`}>Next →</a></div>
    <div className="week-labels">{"Sun Mon Tue Wed Thu Fri Sat".split(" ").map((label) => <span key={label}>{label}</span>)}</div>
    <section className="calendar-grid">{days.map((day) => { const key = dateKey(day), dayEvents = events.filter((event) => occursOn(event, key)), dueTasks = tasks.filter((task) => task.dueAt && seoulKey(task.dueAt) === key), current = day.getUTCMonth() === month; return <article className={current ? "" : "outside"} key={key}><div className="day-number"><strong>{day.getUTCDate()}</strong>{current && <EventCreateModal date={key} workspaces={workspaces.map(({ id, name }) => ({ id, name }))} />}</div>{dayEvents.map((event) => <div className={`calendar-item event${event.completed ? " completed" : ""}`} style={{ backgroundColor: event.color }} key={event.id}><form action={toggleEventCompletedAction}><input type="hidden" name="id" value={event.id} /><input type="hidden" name="completed" value={String(!event.completed)} /><button className="event-check" aria-label={`${event.title} ${event.completed ? "Mark incomplete" : "Mark complete"}`}>{event.completed ? "✓" : ""}</button></form><a href={`/calendar/events/${event.id}?returnTo=${encodeURIComponent(returnTo)}`}>{event.allDay ? "All day" : new Date(event.startsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" })} · {event.title}{event.recurrence === "YEARLY" ? " ↻" : ""}</a></div>)}{dueTasks.map((task) => <a href={`/automation/tasks/${task.id}`} className="calendar-item task" key={task.id}>Due · {task.title}</a>)}</article>; })}</section>
  </>;
}
