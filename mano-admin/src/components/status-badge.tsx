import type { ServiceStatus } from "@/lib/prometheus";

export function StatusBadge({ status }: { status: ServiceStatus }) {
  return <span className={`badge ${status}`}><span className={`status-dot ${status}`} />{status}</span>;
}
