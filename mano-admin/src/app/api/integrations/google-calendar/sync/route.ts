import { NextResponse } from "next/server";
import { pullGoogleCalendarChanges, retryGoogleCalendarSync } from "@/lib/google-calendar";
import { n8nAuthorized } from "@/lib/n8n-integration";
import { recordAdminError } from "@/lib/admin-errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!n8nAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { const pulled = await pullGoogleCalendarChanges(), pushed = await retryGoogleCalendarSync(); return NextResponse.json({ ok: true, pulled, pushed }); }
  catch (error) { await recordAdminError("GOOGLE-CALENDAR-BIDIRECTIONAL-SYNC", error); return NextResponse.json({ ok: false, error: "Google Calendar sync failed" }, { status: 502 }); }
}
