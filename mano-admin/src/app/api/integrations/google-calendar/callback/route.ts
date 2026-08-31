import { NextResponse } from "next/server";
import { connectGoogleCalendar, retryGoogleCalendarSync } from "@/lib/google-calendar";

export async function GET(request: Request) {
  const url = new URL(request.url), state = url.searchParams.get("state"), expected = request.headers.get("cookie")?.match(/(?:^|; )google_calendar_oauth_state=([^;]+)/)?.[1], code = url.searchParams.get("code");
  const target = new URL("/automation/integrations", request.url);
  if (!state || !expected || state !== decodeURIComponent(expected) || !code) { target.searchParams.set("google", "invalid-state"); return NextResponse.redirect(target); }
  try { await connectGoogleCalendar(code, new URL("/api/integrations/google-calendar/callback", request.url).toString()); await retryGoogleCalendarSync(); target.searchParams.set("google", "connected"); }
  catch { target.searchParams.set("google", "failed"); }
  const response = NextResponse.redirect(target); response.cookies.delete("google_calendar_oauth_state"); return response;
}
