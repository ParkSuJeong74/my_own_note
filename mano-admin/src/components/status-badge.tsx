import type { ServiceStatus } from "@/lib/prometheus";

export function StatusBadge({ status }: { status: ServiceStatus }) {
  const labels = { healthy: "Healthy", unhealthy: "Down", unknown: "Unknown" };
  return <span className={`badge ${status}`}><span className={`status-dot ${status}`} />{labels[status]}</span>;
}
