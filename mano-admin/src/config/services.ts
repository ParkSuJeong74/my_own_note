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
    description: "개인 자동화 워크플로와 외부 서비스 연동",
    category: "automation",
    href: "https://n8n.mano.io.kr",
    prometheusQuery: 'up{job="n8n"}',
  },
  {
    id: "grafana",
    name: "Grafana",
    description: "메트릭, 대시보드와 운영 알림",
    category: "observability",
    href: process.env.GRAFANA_URL ?? "https://grafana.mano.io.kr",
    prometheusQuery: 'probe_success{job="blackbox-http",project="mano",service="grafana"}',
  },
  {
    id: "file-browser",
    name: "File Browser",
    description: "홈서버 파일과 자동화 공유 작업 공간",
    category: "storage",
    href: process.env.FILE_BROWSER_URL ?? "https://files.mano.io.kr",
    prometheusQuery: 'probe_success{job="blackbox-http",project="mano",service="filebrowser"}',
  },
  {
    id: "minio",
    name: "MinIO",
    description: "프로젝트용 S3 호환 오브젝트 스토리지",
    category: "storage",
    href: process.env.MINIO_CONSOLE_URL ?? "https://minio-admin.mano.io.kr",
    prometheusQuery: 'probe_success{job="blackbox-http",project="mano",service="minio"}',
  },
  {
    id: "prometheus",
    name: "Prometheus",
    description: "내부 메트릭 수집과 상태 정보 원천",
    category: "observability",
    href: `${process.env.GRAFANA_URL ?? "https://grafana.mano.io.kr"}/explore`,
    prometheusQuery: 'up{job="prometheus"}',
  },
  {
    id: "loki",
    name: "Loki",
    description: "컨테이너 중앙 로그 저장소",
    category: "observability",
    href: `${process.env.GRAFANA_URL ?? "https://grafana.mano.io.kr"}/explore`,
    prometheusQuery: 'up{job="loki"}',
  },
  {
    id: "alloy",
    name: "Alloy",
    description: "Docker 로그 수집 파이프라인",
    category: "observability",
    href: `${process.env.GRAFANA_URL ?? "https://grafana.mano.io.kr"}/explore`,
    prometheusQuery: 'up{job="alloy"}',
  },
  {
    id: "nginx-proxy-manager",
    name: "Nginx Proxy Manager",
    description: "내부 리버스 프록시 설정",
    category: "infrastructure",
  },
];
