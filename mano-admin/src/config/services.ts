export type ServiceCategory = "automation" | "infrastructure" | "observability" | "storage";

export type ServiceDefinition = {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  href?: string;
  prometheusQuery?: string;
  healthUrl?: string;
};

export const services: ServiceDefinition[] = [
  {
    id: "n8n",
    name: "n8n",
    description: "Personal automation workflows and integrations",
    category: "automation",
    href: "https://n8n.mano.io.kr",
    prometheusQuery: 'up{job="n8n"}',
    healthUrl: "http://n8n:5678/healthz",
  },
  {
    id: "grafana",
    name: "Grafana",
    description: "Metrics, dashboards, and operational alerts",
    category: "observability",
    href: process.env.GRAFANA_URL ?? "https://grafana.mano.io.kr",
    prometheusQuery: 'probe_success{job="blackbox-http",project="mano",service="grafana"}',
    healthUrl: "http://grafana:3000/api/health",
  },
  {
    id: "file-browser",
    name: "File Browser",
    description: "Home server files and shared automation workspace",
    category: "storage",
    href: process.env.FILE_BROWSER_URL ?? "https://files.mano.io.kr",
    prometheusQuery: 'probe_success{job="blackbox-http",project="mano",service="filebrowser"}',
    healthUrl: "http://filebrowser:80",
  },
  {
    id: "minio",
    name: "MinIO",
    description: "S3-compatible project object storage",
    category: "storage",
    href: process.env.MINIO_CONSOLE_URL ?? "https://minio-admin.mano.io.kr",
    prometheusQuery: 'probe_success{job="blackbox-http",project="mano",service="minio"}',
    healthUrl: "http://minio:9000/minio/health/live",
  },
  {
    id: "prometheus",
    name: "Prometheus",
    description: "Internal metrics collection and health source",
    category: "observability",
    href: `${process.env.GRAFANA_URL ?? "https://grafana.mano.io.kr"}/explore`,
    prometheusQuery: 'up{job="prometheus"}',
    healthUrl: "http://prometheus:9090/-/healthy",
  },
  {
    id: "loki",
    name: "Loki",
    description: "Central container log storage",
    category: "observability",
    href: `${process.env.GRAFANA_URL ?? "https://grafana.mano.io.kr"}/explore`,
    prometheusQuery: 'up{job="loki"}',
    healthUrl: "http://loki:3100/ready",
  },
  {
    id: "alloy",
    name: "Alloy",
    description: "Docker log collection pipeline",
    category: "observability",
    href: `${process.env.GRAFANA_URL ?? "https://grafana.mano.io.kr"}/explore`,
    prometheusQuery: 'up{job="alloy"}',
    healthUrl: "http://alloy:12345/-/ready",
  },
  {
    id: "nginx-proxy-manager",
    name: "Nginx Proxy Manager",
    description: "Internal reverse proxy configuration",
    category: "infrastructure",
  },
];
