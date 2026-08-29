import { NextResponse } from "next/server";
import { n8nAuthorized } from "@/lib/n8n-integration";
import { liveMonitorT1Match } from "@/lib/t1-monitor";
import { recordAdminError } from "@/lib/admin-errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!n8nAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { matchId?: unknown; monitoringToken?: unknown };
  if (typeof body.matchId !== "string" || !body.matchId || typeof body.monitoringToken !== "string" || !body.monitoringToken) return NextResponse.json({ error: "matchId and monitoringToken are required" }, { status: 400 });
  try {
    const result = await liveMonitorT1Match(body.matchId, body.monitoringToken);
    return result ? NextResponse.json(result) : NextResponse.json({ error: "T1 match not found" }, { status: 404 });
  } catch (error) {
    await recordAdminError("t1-live-monitor", error, { matchId: body.matchId });
    return NextResponse.json({ ok: false, error: "T1 live monitor failed" }, { status: 502 });
  }
}
