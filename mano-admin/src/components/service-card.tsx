import type { ServiceDefinition } from "@/config/services";
import type { ServiceStatus } from "@/lib/prometheus";
import { StatusBadge } from "./status-badge";

export function ServiceCard({ service }: { service: ServiceDefinition & { status: ServiceStatus } }) {
  const categories = { automation: "Automation", infrastructure: "Infrastructure", observability: "Observability", storage: "Storage" };
  return (
    <article className="service-card">
      <div className="service-head"><div className="service-icon">{service.name.slice(0, 1)}</div><StatusBadge status={service.status} /></div>
      <div><p className="eyebrow">{categories[service.category]}</p><h3>{service.name}</h3><p>{service.description}</p></div>
      {service.href
        ? <a className="service-link" href={service.href} target="_blank" rel="noreferrer">Open service <span>↗</span></a>
        : <span className="service-link">Internal only <span>—</span></span>}
    </article>
  );
}
