export type ServiceCategory = "automation" | "infrastructure" | "observability" | "storage";

export type ServiceDefinition = {
  id: string;
  name: string;
  description: string;
  category: ServiceCategory;
  href?: string;
  prometheusQuery?: string;
};

export const services: ServiceDefinition[] = [
  {
    id: "n8n",
    name: "n8n",
    description: "Personal automation workflows and integrations",
    category: "automation",
    href: "https://n8n.mano.io.kr",
    prometheusQuery: 'up{job="n8n"}',
  },
  {
    id: "grafana",
    name: "Grafana",
    description: "Metrics, dashboards, and operational alerts",
    category: "observability",
    href: process.env.GRAFANA_URL ?? "https://grafana.mano.io.kr",
    prometheusQuery: 'probe_success{job="blackbox-http",project="mano",service="grafana"}',
  },
  {
    id: "file-browser",
    name: "File Browser",
    description: "Home server files and shared automation workspace",
    category: "storage",
    href: process.env.FILE_BROWSER_URL ?? "https://files.mano.io.kr",
    prometheusQuery: 'probe_success{job="blackbox-http",project="mano",service="filebrowser"}',
  },
  {
    id: "minio",
    name: "MinIO",
    description: "S3-compatible project object storage",
    category: "storage",
    href: process.env.MINIO_CONSOLE_URL ?? "https://minio-admin.mano.io.kr",
    prometheusQuery: 'probe_success{job="blackbox-http",project="mano",service="minio"}',
  },
  {
    id: "prometheus",
    name: "Prometheus",
    description: "Internal metrics collection and health source",
    category: "observability",
    href: `${process.env.GRAFANA_URL ?? "https://grafana.mano.io.kr"}/explore`,
    prometheusQuery: 'up{job="prometheus"}',
  },
  {
    id: "loki",
    name: "Loki",
    description: "Central container log storage",
    category: "observability",
    href: `${process.env.GRAFANA_URL ?? "https://grafana.mano.io.kr"}/explore`,
    prometheusQuery: 'up{job="loki"}',
  },
  {
    id: "alloy",
    name: "Alloy",
    description: "Docker log collection pipeline",
    category: "observability",
    href: `${process.env.GRAFANA_URL ?? "https://grafana.mano.io.kr"}/explore`,
    prometheusQuery: 'up{job="alloy"}',
  },
  {
    id: "nginx-proxy-manager",
    name: "Nginx Proxy Manager",
    description: "Internal reverse proxy configuration",
    category: "infrastructure",
  },
];

export const workspaces = [
  { id: "project-at", name: "Project A/T", description: "Project automation and review workspace" },
  { id: "blog", name: "Blog", description: "Content planning and publishing workspace" },
  { id: "youtube", name: "YouTube", description: "Video production automation workspace" },
] as const;
