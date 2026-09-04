import { completeBlogReplyItemAction, createBlogReplyItemAction, saveBlogGrowthSnapshotAction } from "@/app/workspaces/actions";
import type { BlogGrowthSnapshot, BlogNeighborChange, BlogNeighborRelation, BlogNeighborState, BlogReplyItem } from "@/lib/blog-discovery";

const metricLabels: Array<[keyof Omit<BlogGrowthSnapshot, "measuredOn">, string]> = [["visitors","방문자"],["views","조회수"],["neighbors","이웃"],["mutualNeighbors","서로이웃"],["posts","게시글"],["receivedComments","받은 댓글"],["replies","내 답글"]];
const localDate = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const relationLabels:Record<BlogNeighborRelation,string>={MUTUAL:"서로이웃",NEIGHBOR:"이웃",FOLLOWING:"내가 추가한 이웃",FOLLOWER:"나를 추가한 이웃",OUTGOING_PENDING:"내가 신청 · 대기",INCOMING_PENDING:"받은 신청 · 확인"};
const changeLabels:Record<BlogNeighborChange["kind"],string>={ADDED:"새로 수집",RELATION_CHANGED:"관계 변경",MISSING:"목록에서 사라짐 · 확인 필요",RESTORED:"관계 복구"};

export function BlogManagement({ workspaceId, replyItems, growthSnapshots, neighborStates, neighborChanges }: { workspaceId: string; replyItems: BlogReplyItem[]; growthSnapshots: BlogGrowthSnapshot[]; neighborStates:BlogNeighborState[]; neighborChanges:BlogNeighborChange[] }) {
  const pending = replyItems.filter(item => !item.repliedAt), latest = growthSnapshots[0], previous = growthSnapshots[1];
  return <section className="blog-management">
    <header className="section-head"><div><p className="eyebrow">BLOG RELATIONSHIPS</p><h2>댓글과 성장 관리</h2><p>놓친 답글을 챙기고, 주간 변화를 한곳에서 기록합니다.</p></div><strong className={pending.some(item => item.overdue) ? "reply-count overdue" : "reply-count"}>{pending.length}개 답글 필요</strong></header>
    <div className="blog-management-grid">
      <section className="reply-inbox"><div className="blog-panel-title"><h3>미답글 댓글함</h3><span>24시간이 지나면 지연 표시</span></div>
        <details className="blog-entry-form"><summary>+ 댓글 등록</summary><form action={createBlogReplyItemAction}><input type="hidden" name="workspaceId" value={workspaceId}/><input name="postUrl" type="url" required placeholder="https://blog.naver.com/..."/><input name="commenter" required maxLength={100} placeholder="댓글 작성자"/><textarea name="commentExcerpt" maxLength={500} placeholder="댓글 내용을 짧게 붙여넣기"/><label><span>댓글 받은 시각</span><input name="commentedAt" type="datetime-local" required/></label><button>답글함에 추가</button></form></details>
        <div className="reply-list">{pending.map(item => <article className={item.overdue ? "overdue" : ""} key={item.id}><div><span>{item.overdue ? "답글 지연" : "답글 필요"} · {new Date(item.commentedAt).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}</span><strong>{item.commenter}</strong><p>{item.commentExcerpt || "댓글 내용 미입력"}</p></div><div><a href={item.postUrl} target="_blank" rel="noreferrer">댓글 달러 가기 ↗</a><form action={completeBlogReplyItemAction}><input type="hidden" name="id" value={item.id}/><input type="hidden" name="workspaceId" value={workspaceId}/><button>답글 완료</button></form></div></article>)}</div>
        {!pending.length && <div className="board-empty compact">밀린 답글이 없어요 🎉</div>}
      </section>
      <section className="growth-panel"><div className="blog-panel-title"><h3>성장 스냅샷</h3><span>{latest ? `${latest.measuredOn} 기준` : "첫 기록을 남겨 보세요"}</span></div>
        {latest && <div className="growth-metrics">{metricLabels.map(([key,label]) => { const delta=previous ? latest[key]-previous[key] : null; return <div key={key}><span>{label}</span><strong>{latest[key].toLocaleString("ko-KR")}</strong><small className={delta && delta>0 ? "positive" : delta && delta<0 ? "negative" : ""}>{delta===null ? "첫 기록" : `${delta>0?"+":""}${delta.toLocaleString("ko-KR")}`}</small></div>; })}</div>}
        <details className="blog-entry-form"><summary>{latest ? "+ 새 스냅샷" : "+ 첫 스냅샷 기록"}</summary><form action={saveBlogGrowthSnapshotAction}><input type="hidden" name="workspaceId" value={workspaceId}/><label><span>기준일</span><input name="measuredOn" type="date" defaultValue={localDate()} required/></label><div className="growth-inputs">{metricLabels.map(([key,label]) => <label key={key}><span>{label}</span><input name={key} type="number" min="0" step="1" defaultValue={latest?.[key] ?? 0} required/></label>)}</div><button>성장 기록 저장</button></form></details>
      </section>
    </div>
    <section className="neighbor-status-panel"><div className="blog-panel-title"><h3>이웃 관계 관리</h3><span>확장 프로그램으로 동기화</span></div>
      <div className="neighbor-summary">{Object.entries(relationLabels).map(([relation,label])=><div key={relation}><span>{label}</span><strong>{neighborStates.filter(item=>item.active&&item.relation===relation).length}</strong></div>)}<div className="missing"><span>사라짐 · 확인 필요</span><strong>{neighborStates.filter(item=>!item.active).length}</strong></div></div>
      <details><summary>최근 관계 변경 {neighborChanges.length ? `· ${neighborChanges.length}건` : ""}</summary><div className="neighbor-change-list">{neighborChanges.map(item=><article key={item.id}><div><strong>{item.name}</strong><span>{changeLabels[item.kind]}</span></div><small>{item.previousRelation?relationLabels[item.previousRelation]:"없음"} → {item.currentRelation?relationLabels[item.currentRelation]:"현재 목록 없음"} · {new Date(item.detectedAt).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}</small><a href={`https://blog.naver.com/${encodeURIComponent(item.key)}`} target="_blank" rel="noreferrer">확인 ↗</a></article>)}</div>{!neighborChanges.length&&<div className="board-empty compact">아직 감지된 변경이 없어요.</div>}</details>
    </section>
    <p className="blog-management-note">네이버 인증정보는 저장하지 않습니다. 확장은 현재 Chrome에 로그인된 네이버 화면에서 댓글·이웃 정보만 읽으며 댓글 등록이나 이웃 승인을 자동 실행하지 않아요.</p>
  </section>;
}
