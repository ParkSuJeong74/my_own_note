import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";
import "./automation.css";

export const metadata: Metadata = { title: "Mano Admin", description: "홈서버 관제 및 공통 작업 포털" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body><div className="shell"><Sidebar /><main>{children}</main></div></body></html>;
}
