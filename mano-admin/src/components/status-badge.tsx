import type { ServiceStatus } from "@/lib/prometheus";

export function StatusBadge({ status }: { status: ServiceStatus }) {
  const labels = { healthy: "정상", unhealthy: "장애", unknown: "미확인" };
  return <span className={`badge ${status}`}><span className={`status-dot ${status}`} />{labels[status]}</span>;
}
