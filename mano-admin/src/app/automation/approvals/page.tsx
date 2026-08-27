import { decideApprovalAction } from "@/app/automation/actions";
import { listApprovals } from "@/lib/automation-repository";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const approvals = await listApprovals();
  return <><header className="page-head"><div><p className="eyebrow">AUTOMATION</p><h1>Approvals</h1><p>Human decisions stay explicit before future automation continues.</p></div></header><section className="data-list">{approvals.map((approval) => <article key={approval.id}><div className="data-main"><div className="data-meta"><span>{approval.workspaceName}</span><span className={`state ${approval.status}`}>{approval.status}</span></div><h2>{approval.taskTitle}</h2><p>{approval.note}</p><small>Requested {new Date(approval.requestedAt).toLocaleString("en-GB")}</small></div>{approval.status === "pending" && <form action={decideApprovalAction} className="decision-form"><input type="hidden" name="id" value={approval.id} /><button name="decision" value="rejected" className="secondary">Reject</button><button name="decision" value="approved">Approve</button></form>}</article>)}</section></>;
}
