import { NextResponse } from "next/server";
import { n8nAuthorized } from "@/lib/n8n-integration";
import { claimT1LiveMonitoring } from "@/lib/t1-monitor";
import { recordAdminError } from "@/lib/admin-errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!n8nAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await claimT1LiveMonitoring());
  } catch (error) {
    await recordAdminError("t1-monitor", error);
    return NextResponse.json({ ok: false, error: "T1 monitor failed" }, { status: 502 });
  }
}
