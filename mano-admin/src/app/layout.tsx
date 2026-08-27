import type { Metadata } from "next";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";
import "./automation.css";
import "./theme.css";

export const metadata: Metadata = { title: "Mano Admin", description: "Home server operations and shared work portal" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><div className="shell"><Sidebar /><main>{children}</main></div></body></html>;
}
