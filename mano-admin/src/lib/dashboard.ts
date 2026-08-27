import { services } from "@/config/services";
import { getInfrastructureSummary, getServiceStatus } from "@/lib/prometheus";

export async function getDashboardData() {
  const [summary, statuses] = await Promise.all([
    getInfrastructureSummary(),
    Promise.all(services.map(async (service) => ({
      ...service,
      status: await getServiceStatus(service.prometheusQuery,service.healthUrl),
    }))),
  ]);

  return {
    summary,
    services: statuses,
    checkedAt: new Date().toISOString(),
  };
}
