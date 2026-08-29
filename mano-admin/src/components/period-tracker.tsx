import { createHealthPeriodAction, deleteHealthPeriodAction, updateHealthPeriodAction } from "@/app/health/actions";
import { SubmitAndClose } from "@/components/submit-and-close";

type Period = { id: string; startedOn: string; endedOn: string | null; flow: "LIGHT" | "MEDIUM" | "HEAVY"; symptoms: string[]; note: string };
const DAY = 86_400_000;
const utc = (date: string) => Date.parse(`${date}T00:00:00Z`);
const dateFrom = (time: number) => new Date(time).toISOString().slice(0, 10);
const daysBetween = (from: string, to: string) => Math.round((utc(to) - utc(from)) / DAY);
const flowLabel = { LIGHT: "적음", MEDIUM: "보통", HEAVY: "많음" } as const;

export function PeriodTracker({ periods, today }: { periods: Period[]; today: string }) {
  const starts = periods.map(item => item.startedOn);
  const cycles = starts.slice(0, -1).map((start, index) => daysBetween(starts[index + 1], start)).filter(days => days >= 15 && days <= 60).slice(0, 6);
  const averageCycle = cycles.length ? Math.round(cycles.reduce((sum, days) => sum + days, 0) / cycles.length) : null;
  const durations = periods.flatMap(item => item.endedOn ? [daysBetween(item.startedOn, item.endedOn) + 1] : []).filter(days => days > 0 && days <= 14).slice(0, 6);
  const averageDuration = durations.length ? Math.round(durations.reduce((sum, days) => sum + days, 0) / durations.length) : null;
  const latest = periods[0] ?? null;
  const predicted = latest && averageCycle ? dateFrom(utc(latest.startedOn) + averageCycle * DAY) : null;
  const daysUntil = predicted ? daysBetween(today, predicted) : null;
  const currentCycleDay = latest ? daysBetween(latest.startedOn, today) + 1 : null;
  return <section className="period-tracker">
    <div className="section-head"><div><p className="eyebrow">CYCLE</p><h2>생리 기록</h2></div><small>시작일 기준으로 최근 최대 6개 주기를 계산합니다.</small></div>
    <div className="period-summary"><article><span>최근 시작일</span><strong>{latest?.startedOn ?? "—"}</strong><small>{currentCycleDay && currentCycleDay > 0 ? `현재 주기 ${currentCycleDay}일째` : "첫 기록을 추가해 주세요"}</small></article><article><span>평균 주기</span><strong>{averageCycle ? `${averageCycle}일` : "—"}</strong><small>{cycles.length ? `최근 ${cycles.length}개 간격 기준` : "시작일 2회 이상 필요"}</small></article><article className="period-prediction"><span>다음 예상일</span><strong>{predicted ?? "—"}</strong><small>{daysUntil === null ? "주기 기록이 더 필요해요" : daysUntil > 0 ? `${daysUntil}일 남음` : daysUntil === 0 ? "오늘 예상" : `예상일에서 ${Math.abs(daysUntil)}일 지남`}</small></article><article><span>평균 기간</span><strong>{averageDuration ? `${averageDuration}일` : "—"}</strong><small>{durations.length ? `종료일 기록 ${durations.length}회 기준` : "종료일 기록 필요"}</small></article></div>
    <details className="health-create period-create" open={periods.length === 0}><summary>+ 생리 기록 추가</summary><form action={createHealthPeriodAction}><label><span>시작일</span><input name="startedOn" type="date" required defaultValue={today}/></label><label><span>종료일</span><input name="endedOn" type="date"/></label><label><span>양</span><select name="flow" defaultValue="MEDIUM"><option value="LIGHT">적음</option><option value="MEDIUM">보통</option><option value="HEAVY">많음</option></select></label><label><span>증상</span><input name="symptoms" placeholder="복통, 두통, 피로 (쉼표 구분)"/></label><label><span>메모</span><input name="note" placeholder="컨디션이나 특이사항"/></label><button>기록 저장</button></form></details>
    <div className="period-history">{periods.map((item, index) => <article key={item.id}><div><strong>{item.startedOn}{item.endedOn ? ` – ${item.endedOn}` : " – 진행 중"}</strong><span>{index < periods.length - 1 ? `${daysBetween(periods[index + 1].startedOn, item.startedOn)}일 주기` : "첫 기록"} · 양 {flowLabel[item.flow]}</span></div><p>{[item.symptoms.join(" · "), item.note].filter(Boolean).join(" · ") || "증상·메모 없음"}</p><details><summary>수정</summary><form action={updateHealthPeriodAction}><input type="hidden" name="id" value={item.id}/><input name="startedOn" type="date" defaultValue={item.startedOn} required/><input name="endedOn" type="date" defaultValue={item.endedOn ?? ""}/><select name="flow" defaultValue={item.flow}><option value="LIGHT">적음</option><option value="MEDIUM">보통</option><option value="HEAVY">많음</option></select><input name="symptoms" defaultValue={item.symptoms.join(", ")} placeholder="증상"/><input name="note" defaultValue={item.note} placeholder="메모"/><div><SubmitAndClose>저장</SubmitAndClose><button formAction={deleteHealthPeriodAction} className="danger">삭제</button></div></form></details></article>)}</div>
    <p className="period-note">예상일은 입력한 시작일의 평균 간격을 단순 계산한 참고값입니다. 피임이나 임신 가능성 판단, 의료 진단에는 사용할 수 없습니다.</p>
  </section>;
}
