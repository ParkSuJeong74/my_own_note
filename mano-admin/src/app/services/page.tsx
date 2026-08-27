import { ServiceCard } from "@/components/service-card";
import { getDashboardData } from "@/lib/dashboard";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const data = await getDashboardData();
  return <><header className="page-head"><div><p className="eyebrow">SERVICE CATALOG</p><h1>Services</h1><p>Health summaries and safe links to the tools that own each capability.</p></div></header><section className="service-grid full">{data.services.map((service) => <ServiceCard service={service} key={service.id} />)}</section></>;
}
