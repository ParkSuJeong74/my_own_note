import { decideApprovalAction } from "@/app/automation/actions";
import { listApprovals } from "@/lib/automation-repository";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const approvals = await listApprovals();
  const labels = { pending: "대기 중", approved: "승인됨", rejected: "거절됨" };
  return <><header className="page-head"><div><p className="eyebrow">자동화</p><h1>승인</h1><p>자동화를 계속하기 전 사람의 결정을 명확하게 기록합니다.</p></div></header><section className="data-list">{approvals.map((approval) => <article key={approval.id}><div className="data-main"><div className="data-meta"><span>{approval.workspaceName}</span><span className={`state ${approval.status}`}>{labels[approval.status]}</span></div><h2>{approval.taskTitle}</h2><p>{approval.note}</p><small>요청 {new Date(approval.requestedAt).toLocaleString("ko-KR")}</small></div>{approval.status === "pending" && <form action={decideApprovalAction} className="decision-form"><input type="hidden" name="id" value={approval.id} /><button name="decision" value="rejected" className="secondary">거절</button><button name="decision" value="approved">승인</button></form>}</article>)}</section></>;
}
