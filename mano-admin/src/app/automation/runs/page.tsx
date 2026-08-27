import { listRuns } from "@/lib/automation-repository";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  const runs = await listRuns();
  const labels = { queued: "대기", running: "실행 중", succeeded: "성공", failed: "실패" };
  return <><header className="page-head"><div><p className="eyebrow">자동화</p><h1>실행 이력</h1><p>자동화 도구에 종속되지 않는 실행 기록입니다. 현재 항목은 seed 예시 데이터입니다.</p></div></header><section className="data-list">{runs.map((run) => <article key={run.id}><div className="data-main"><div className="data-meta"><span>{run.workspaceName}</span><span className={`state ${run.status}`}>{labels[run.status]}</span></div><h2>{run.taskTitle}</h2><p>{run.summary || "요약 없음"}</p><code>{run.workflowRef ?? "워크플로 참조 없음"}</code></div><div className="run-time"><small>시작</small><strong>{new Date(run.startedAt).toLocaleString("ko-KR")}</strong>{run.finishedAt && <><small>종료</small><strong>{new Date(run.finishedAt).toLocaleString("ko-KR")}</strong></>}</div></article>)}</section></>;
}
