import Link from "next/link";
import {dispatchN8nEventsAction} from "@/app/automation/actions";
import {disconnectGoogleCalendarAction,retryGoogleCalendarAction} from "@/app/automation/integrations/google-actions";
import {AutomationHelp} from "@/components/automation-help";
import {getGoogleCalendarStatus} from "@/lib/google-calendar";
import {getN8nIntegrationStatus,listRecentAutomationEvents} from "@/lib/n8n-integration";

export const dynamic="force-dynamic";

export default async function IntegrationsPage({searchParams}:{searchParams:Promise<{google?:string}>}){
  const [status,events,google,query]=await Promise.all([getN8nIntegrationStatus(),listRecentAutomationEvents(30),getGoogleCalendarStatus(),searchParams]);
  return <><header className="page-head"><div><p className="eyebrow">AUTOMATION</p><h1>외부 연결</h1><p>n8n과 Google Calendar 연결 상태를 확인합니다.</p></div></header>
    {query.google&&<p className={`notification-result ${query.google==="connected"?"success":"failure"}`}>{query.google==="connected"?"Google Calendar 연결과 기존 일정 동기화를 완료했습니다.":query.google==="not-configured"?"Google OAuth 환경변수를 먼저 설정해 주세요.":"Google Calendar 연결에 실패했습니다. OAuth 설정과 콜백 주소를 확인해 주세요."}</p>}
    <section className="integration-summary google-calendar-summary"><article><span>Google Calendar</span><strong>{google.connected?"연결됨":google.configured?"연결 대기":"설정 필요"}</strong></article><article><span>동기화 완료</span><strong>{google.synced}</strong></article><article><span>동기화 대기</span><strong>{google.pending}</strong></article><article><span>오류</span><strong>{google.failed}</strong></article></section>
    <div className="integration-actions">{!google.connected?<Link className={`button-link${google.configured?"":" disabled"}`} href={google.configured?"/api/integrations/google-calendar/connect":"#"}>Google 계정 연결</Link>:<><form action={retryGoogleCalendarAction}><button>일정 다시 동기화</button></form><form action={disconnectGoogleCalendarAction}><button className="secondary">연결 해제</button></form></>}<small>{google.connectedAt?`연결일 ${new Date(google.connectedAt).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}`:"새로 만드는 Mano 일정부터 자동 반영됩니다."}</small></div>
    <AutomationHelp steps={["Google Cloud에서 Calendar API와 OAuth 웹 클라이언트를 설정합니다.","승인된 리디렉션 URI에 https://admin.mano.io.kr/api/integrations/google-calendar/callback 을 추가합니다.","Google 계정 연결을 한 번 누르면 이후 생성·수정·삭제가 자동 반영됩니다."]} risk="현재 연동은 Mano에서 Google로 보내는 단방향입니다. Google에서 직접 수정한 값은 Mano로 가져오지 않습니다."/>
    <section className="integration-summary"><article><span>n8n</span><strong>{status.configured?"연결됨":"연결 안 됨"}</strong></article><article><span>전송 대기</span><strong>{status.pending}</strong></article><article><span>전송 완료</span><strong>{status.delivered}</strong></article><article><span>오류</span><strong>{status.failedDelivery}</strong></article></section><div className="integration-actions"><form action={dispatchN8nEventsAction}><button disabled={!status.webhookConfigured||status.pending===0}>대기 이벤트 재전송</button></form><small>{status.lastDeliveredAt?`마지막 전달 ${new Date(status.lastDeliveredAt).toLocaleString("ko-KR")}`:"아직 전달된 이벤트가 없습니다."}</small></div><section className="data-list integration-events">{events.map(e=><article key={e.id}><div className="data-main"><div className="data-meta"><span>#{e.id}</span><span>{e.deliveryStatus}</span></div><h2>{e.eventType}</h2><p>{e.occurredAt}</p></div><code>{e.eventKey}</code></article>)}</section></>;
}
