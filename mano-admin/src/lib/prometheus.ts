type PrometheusVectorResult = {
  metric: Record<string, string>;
  value: [number, string];
};

type PrometheusResponse = {
  status: "success" | "error";
  data?: { resultType: "vector"; result: PrometheusVectorResult[] };
};

export type ServiceStatus = "healthy" | "unhealthy" | "unknown";

const prometheusUrl = process.env.PROMETHEUS_URL ?? "http://prometheus:9090";

export async function queryPrometheus(query: string): Promise<number[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const url = new URL("/api/v1/query", prometheusUrl);
    url.searchParams.set("query", query);
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!response.ok) return [];

    const payload = (await response.json()) as PrometheusResponse;
    if (payload.status !== "success" || payload.data?.resultType !== "vector") return [];
    return payload.data.result.map((item) => Number(item.value[1])).filter(Number.isFinite);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function getServiceStatus(query?: string): Promise<ServiceStatus> {
  if (!query) return "unknown";
  const values = await queryPrometheus(query);
  if (values.length === 0) return "unknown";
  return values.every((value) => value === 1) ? "healthy" : "unhealthy";
}

export async function getInfrastructureSummary() {
  const [cpuIdle, memoryAvailable, memoryTotal, diskAvailable, diskSize] = await Promise.all([
    queryPrometheus('avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))'),
    queryPrometheus("node_memory_MemAvailable_bytes"),
    queryPrometheus("node_memory_MemTotal_bytes"),
    queryPrometheus('node_filesystem_avail_bytes{mountpoint="/",fstype!~"tmpfs|overlay"}'),
    queryPrometheus('node_filesystem_size_bytes{mountpoint="/",fstype!~"tmpfs|overlay"}'),
  ]);

  const percent = (used: number, total: number) => total > 0 ? Math.round((used / total) * 100) : null;
  const availableMemory = memoryAvailable[0];
  const totalMemory = memoryTotal[0];
  const availableDisk = diskAvailable[0];
  const totalDisk = diskSize[0];

  return {
    cpu: cpuIdle.length ? Math.round((1 - cpuIdle[0]) * 100) : null,
    memory: availableMemory !== undefined && totalMemory !== undefined
      ? percent(totalMemory - availableMemory, totalMemory)
      : null,
    disk: availableDisk !== undefined && totalDisk !== undefined
      ? percent(totalDisk - availableDisk, totalDisk)
      : null,
  };
}
