import type { ServiceDefinition } from "@/config/services";
import type { ServiceStatus } from "@/lib/prometheus";
import { StatusBadge } from "./status-badge";

export function ServiceCard({ service }: { service: ServiceDefinition & { status: ServiceStatus } }) {
  const categories = { automation: "자동화", infrastructure: "인프라", observability: "관측", storage: "스토리지" };
  return (
    <article className="service-card">
      <div className="service-head"><div className="service-icon">{service.name.slice(0, 1)}</div><StatusBadge status={service.status} /></div>
      <div><p className="eyebrow">{categories[service.category]}</p><h3>{service.name}</h3><p>{service.description}</p></div>
      {service.href
        ? <a className="service-link" href={service.href} target="_blank" rel="noreferrer">서비스 열기 <span>↗</span></a>
        : <span className="service-link">내부 전용 <span>—</span></span>}
    </article>
  );
}
