import Link from "next/link";
import { ServiceCard } from "@/components/service-card";
import { getDashboardData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const data = await getDashboardData();
  const counts = data.services.reduce((result, service) => ({ ...result, [service.status]: result[service.status] + 1 }), { healthy: 0, unhealthy: 0, unknown: 0 });
  const featured = data.services.filter((service) => ["n8n", "grafana", "file-browser", "minio"].includes(service.id));

  return <>
    <header className="page-head"><div><p className="eyebrow">홈서버</p><h1>한눈에 보는 운영 현황</h1><p>위험한 제어 기능 없이 인프라와 자동화 상태를 확인합니다.</p></div><div className="timestamp">업데이트 {new Date(data.checkedAt).toLocaleTimeString("ko-KR")}</div></header>
    <section className="metrics">
      {[{ label: "CPU 사용률", value: data.summary.cpu }, { label: "메모리 사용률", value: data.summary.memory }, { label: "디스크 사용률", value: data.summary.disk }].map((metric) => <article className="metric" key={metric.label}><span>{metric.label}</span><strong>{metric.value === null ? "—" : `${metric.value}%`}</strong><div className="meter"><i style={{ width: `${metric.value ?? 0}%` }} /></div></article>)}
      <article className="metric health-total"><span>서비스 상태</span><strong>{counts.healthy} 정상</strong><p>전체 {data.services.length} · {counts.unhealthy} 장애 · {counts.unknown} 미확인</p></article>
    </section>
    <section className="section-head"><div><p className="eyebrow">바로가기</p><h2>주요 서비스</h2></div><Link href="/services">전체 보기 →</Link></section>
    <section className="service-grid">{featured.map((service) => <ServiceCard service={service} key={service.id} />)}</section>
  </>;
}
