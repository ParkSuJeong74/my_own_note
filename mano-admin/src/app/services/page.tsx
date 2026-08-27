import { ServiceCard } from "@/components/service-card";
import { getDashboardData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const data = await getDashboardData();
  return <><header className="page-head"><div><p className="eyebrow">서비스 카탈로그</p><h1>서비스</h1><p>서비스 상태를 요약하고 각 관리 도구로 안전하게 연결합니다.</p></div></header><section className="service-grid full">{data.services.map((service) => <ServiceCard service={service} key={service.id} />)}</section></>;
}
