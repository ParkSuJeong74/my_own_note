import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { googleCalendarAuthorizationUrl } from "@/lib/google-calendar";

export async function GET(request: Request) {
  if (!process.env.GOOGLE_CALENDAR_CLIENT_ID || !process.env.GOOGLE_CALENDAR_CLIENT_SECRET) return NextResponse.redirect(new URL("/automation/integrations?google=not-configured", request.url));
  const state = randomBytes(24).toString("base64url"), redirectUri = new URL("/api/integrations/google-calendar/callback", request.url).toString();
  const response = NextResponse.redirect(googleCalendarAuthorizationUrl(redirectUri, state));
  response.cookies.set("google_calendar_oauth_state", state, { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "lax", maxAge: 600, path: "/" });
  return response;
}
