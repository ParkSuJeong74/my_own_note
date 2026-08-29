import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";
import "./automation.css";
import "./automation-help.css";
import "./theme.css";
import "./responsive.css";
import "./task-detail.css";
import "./personal.css";
import "./project-control.css";
import "./money-cards.css";
import "./health.css";
import "./blog-discovery.css";
import "./blog-discovery-priority.css";
import "./error-logs.css";
import "./executions.css";
import "./instructions.css";
import "./workers.css";
import "./integrations.css";
import "./t1.css";
import "./notifications.css";

export const metadata: Metadata = { title: "Mano Admin", description: "Home server operations and shared work portal" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><div className="shell"><Sidebar /><main>{children}</main></div></body></html>;
}
