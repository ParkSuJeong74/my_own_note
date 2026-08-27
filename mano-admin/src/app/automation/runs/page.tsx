import { listRuns } from "@/lib/automation-repository";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const runs = await listRuns();
  return <><header className="page-head"><div><p className="eyebrow">AUTOMATION</p><h1>Runs</h1><p>Provider-neutral execution history. Current entries are seeded mock runs.</p></div></header><section className="data-list">{runs.map((run) => <article key={run.id}><div className="data-main"><div className="data-meta"><span>{run.workspaceName}</span><span className={`state ${run.status}`}>{run.status}</span></div><h2>{run.taskTitle}</h2><p>{run.summary || "No summary"}</p><code>{run.workflowRef ?? "No workflow reference"}</code></div><div className="run-time"><small>Started</small><strong>{new Date(run.startedAt).toLocaleString("en-GB")}</strong>{run.finishedAt && <><small>Finished</small><strong>{new Date(run.finishedAt).toLocaleString("en-GB")}</strong></>}</div></article>)}</section></>;
}
