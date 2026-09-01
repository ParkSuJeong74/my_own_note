import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { recordAdminError } from "@/lib/admin-errors";
import { getCalendarEvent, listCalendarEventsForGoogleSync, setCalendarGoogleSync } from "@/lib/automation-repository";
import type { CalendarEvent } from "@/lib/automation-types";

const scope = "https://www.googleapis.com/auth/calendar.events";
const timeZone = "Asia/Seoul";
const clientId = () => process.env.GOOGLE_CALENDAR_CLIENT_ID?.trim() ?? "";
const clientSecret = () => process.env.GOOGLE_CALENDAR_CLIENT_SECRET?.trim() ?? "";
export const googleCalendarRedirectUri = () => process.env.GOOGLE_CALENDAR_REDIRECT_URI?.trim() || "https://admin.mano.io.kr/api/integrations/google-calendar/callback";
const configured = () => Boolean(clientId() && clientSecret());
const key = () => createHash("sha256").update(clientSecret()).digest();

function encrypt(value: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key(), iv), body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map(part => part.toString("base64url")).join(".");
}

function decrypt(value: string) {
  const [iv, tag, body] = value.split(".").map(part => Buffer.from(part, "base64url")), decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}

export function googleCalendarAuthorizationUrl(redirectUri: string, state: string) {
  const query = new URLSearchParams({ client_id: clientId(), redirect_uri: redirectUri, response_type: "code", scope, access_type: "offline", include_granted_scopes: "true", prompt: "consent", state });
  return `https://accounts.google.com/o/oauth2/v2/auth?${query}`;
}

export async function connectGoogleCalendar(code: string, redirectUri: string) {
  if (!configured()) throw new Error("Google Calendar OAuth 환경변수가 설정되지 않았습니다.");
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: clientId(), client_secret: clientSecret(), redirect_uri: redirectUri, grant_type: "authorization_code" }), cache: "no-store" });
  const data = await response.json() as { refresh_token?: string; error_description?: string };
  if (!response.ok || !data.refresh_token) throw new Error(data.error_description || "Google에서 갱신 토큰을 받지 못했습니다.");
  await db.query(`INSERT INTO google_calendar_connection(singleton,encrypted_refresh_token) VALUES(true,$1) ON CONFLICT(singleton) DO UPDATE SET encrypted_refresh_token=EXCLUDED.encrypted_refresh_token,sync_token=NULL,updated_at=now()`, [encrypt(data.refresh_token)]);
}

async function connection() { const { rows } = await db.query(`SELECT encrypted_refresh_token,calendar_id,connected_at,sync_token,last_pulled_at FROM google_calendar_connection WHERE singleton=true`); return rows[0] ?? null; }

async function accessToken() {
  const saved = await connection();
  if (!saved || !configured()) return null;
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: clientId(), client_secret: clientSecret(), refresh_token: decrypt(saved.encrypted_refresh_token), grant_type: "refresh_token" }), cache: "no-store" });
  const data = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !data.access_token) throw new Error(data.error_description || "Google 액세스 토큰 갱신에 실패했습니다.");
  return { token: data.access_token, calendarId: String(saved.calendar_id || "primary") };
}

const koreanDate = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const nextDate = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
function googleBody(event: CalendarEvent) {
  const recurrence = event.recurrence === "YEARLY" ? ["RRULE:FREQ=YEARLY"] : undefined;
  const extendedProperties = { private: { manoEventId: event.id } };
  if (event.allDay) { const start = koreanDate(event.startsAt), last = event.endsAt ? koreanDate(event.endsAt) : start; return { summary: event.title, description: event.description, start: { date: start }, end: { date: nextDate(last) }, recurrence, extendedProperties }; }
  const end = event.endsAt ?? new Date(new Date(event.startsAt).valueOf() + 3_600_000).toISOString();
  return { summary: event.title, description: event.description, start: { dateTime: event.startsAt, timeZone }, end: { dateTime: end, timeZone }, recurrence, extendedProperties };
}

export async function syncCalendarEventToGoogle(id: string) {
  const event = await getCalendarEvent(id); if (!event) return false;
  try {
    const auth = await accessToken(); if (!auth) return false;
    await setCalendarGoogleSync(id, { status: "PENDING" });
    const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events`;
    let response = await fetch(event.googleEventId ? `${base}/${encodeURIComponent(event.googleEventId)}` : base, { method: event.googleEventId ? "PUT" : "POST", headers: { authorization: `Bearer ${auth.token}`, "content-type": "application/json" }, body: JSON.stringify(googleBody(event)), cache: "no-store" });
    if (response.status === 404 && event.googleEventId) response = await fetch(base, { method: "POST", headers: { authorization: `Bearer ${auth.token}`, "content-type": "application/json" }, body: JSON.stringify(googleBody(event)), cache: "no-store" });
    const data = await response.json() as { id?: string; error?: { message?: string } };
    if (!response.ok || !data.id) throw new Error(data.error?.message || `Google Calendar HTTP ${response.status}`);
    await setCalendarGoogleSync(id, { eventId: data.id, status: "SYNCED" }); return true;
  } catch (error) { const message = error instanceof Error ? error.message : String(error); await setCalendarGoogleSync(id, { status: "FAILED", error: message.slice(0, 500) }); await recordAdminError("GOOGLE-CALENDAR-SYNC", error, { calendarEventId: id }); return false; }
}

export async function deleteCalendarEventFromGoogle(event: CalendarEvent) {
  if (!event.googleEventId) return true;
  try { const auth = await accessToken(); if (!auth) return false; const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events/${encodeURIComponent(event.googleEventId)}`, { method: "DELETE", headers: { authorization: `Bearer ${auth.token}` }, cache: "no-store" }); if (!response.ok && response.status !== 404 && response.status !== 410) throw new Error(`Google Calendar HTTP ${response.status}`); return true; }
  catch (error) { await recordAdminError("GOOGLE-CALENDAR-DELETE", error, { calendarEventId: event.id }); return false; }
}

type GoogleEvent = {
  id: string;
  recurringEventId?: string;
  status?: string;
  summary?: string;
  description?: string;
  updated?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

const atSeoulMidnight = (date: string) => new Date(`${date}T00:00:00+09:00`).toISOString();
const previousDate = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

async function applyGoogleEvent(event: GoogleEvent) {
  if (!event.id) return "skipped" as const;
  if (event.status === "cancelled") { await db.query(`DELETE FROM calendar_events WHERE google_event_id=$1`, [event.id]); return "deleted" as const; }
  if (event.recurringEventId) { const { rowCount } = await db.query(`SELECT 1 FROM calendar_events WHERE google_event_id=$1`, [event.recurringEventId]); if (rowCount) return "skipped" as const; }
  const allDay = Boolean(event.start?.date), startRaw = event.start?.date ?? event.start?.dateTime, endRaw = event.end?.date ?? event.end?.dateTime;
  if (!startRaw) return "skipped" as const;
  const startsAt = allDay ? atSeoulMidnight(startRaw) : new Date(startRaw).toISOString();
  const endsAt = allDay ? atSeoulMidnight(previousDate(endRaw ?? nextDate(startRaw))) : endRaw ? new Date(endRaw).toISOString() : null;
  await db.query(`INSERT INTO calendar_events(title,description,starts_at,ends_at,all_day,recurrence,color,google_event_id,google_sync_status,google_sync_error,google_updated_at)
    VALUES($1,$2,$3,$4,$5,'NONE','#2563eb',$6,'SYNCED',NULL,$7)
    ON CONFLICT(google_event_id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,starts_at=EXCLUDED.starts_at,ends_at=EXCLUDED.ends_at,all_day=EXCLUDED.all_day,google_sync_status='SYNCED',google_sync_error=NULL,google_updated_at=EXCLUDED.google_updated_at,updated_at=now()`,
    [event.summary?.trim() || "제목 없음", event.description ?? "", startsAt, endsAt, allDay, event.id, event.updated ?? null]);
  return "upserted" as const;
}

export async function pullGoogleCalendarChanges(reset = false): Promise<{ imported: number; deleted: number; skipped: number; full: boolean }> {
  const auth = await accessToken(); if (!auth) return { imported: 0, deleted: 0, skipped: 0, full: false };
  const saved = await connection(), syncToken = reset ? null : saved?.sync_token ?? null, full = !syncToken;
  let pageToken: string | null = null, nextSyncToken: string | null = null, imported = 0, deleted = 0, skipped = 0, pages = 0;
  try {
    do {
      if (++pages > 100) throw new Error("Google Calendar 페이지 수가 안전 한도를 초과했습니다.");
      const query = new URLSearchParams({ maxResults: "2500", showDeleted: "true", singleEvents: "true", eventTypes: "default" });
      if (syncToken) query.set("syncToken", syncToken); else { const limit = new Date(); limit.setUTCFullYear(limit.getUTCFullYear() + 5); query.set("timeMax", limit.toISOString()); }
      if (pageToken) query.set("pageToken", pageToken);
      const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId)}/events?${query}`, { headers: { authorization: `Bearer ${auth.token}` }, cache: "no-store" });
      if (response.status === 410 && syncToken) { await db.query(`UPDATE google_calendar_connection SET sync_token=NULL WHERE singleton=true`); return pullGoogleCalendarChanges(true); }
      const data = await response.json() as { items?: GoogleEvent[]; nextPageToken?: string; nextSyncToken?: string; error?: { message?: string } };
      if (!response.ok) throw new Error(data.error?.message || `Google Calendar list HTTP ${response.status}`);
      for (const event of data.items ?? []) { const result = await applyGoogleEvent(event); if (result === "upserted") imported += 1; else if (result === "deleted") deleted += 1; else skipped += 1; }
      pageToken = data.nextPageToken ?? null; nextSyncToken = data.nextSyncToken ?? nextSyncToken;
    } while (pageToken);
    if (nextSyncToken) await db.query(`UPDATE google_calendar_connection SET sync_token=$1,last_pulled_at=now(),updated_at=now() WHERE singleton=true`, [nextSyncToken]);
    return { imported, deleted, skipped, full };
  } catch (error) { await recordAdminError("GOOGLE-CALENDAR-PULL", error); throw error; }
}

export async function refreshGoogleCalendarIfStale(maxAgeMs = 60_000) {
  const saved = await connection();
  if (!saved) return null;
  const lastPulledAt = saved.last_pulled_at
    ? new Date(saved.last_pulled_at).valueOf()
    : 0;
  if (Date.now() - lastPulledAt < maxAgeMs) return null;
  return pullGoogleCalendarChanges();
}

export async function retryGoogleCalendarSync() { const events = await listCalendarEventsForGoogleSync(); let synced = 0; for (const event of events) if (await syncCalendarEventToGoogle(event.id)) synced += 1; return { total: events.length, synced }; }
export async function disconnectGoogleCalendar() { await db.query(`DELETE FROM google_calendar_connection WHERE singleton=true`); await db.query(`UPDATE calendar_events SET google_sync_status='LOCAL',google_sync_error=NULL`); }
export async function getGoogleCalendarStatus() { const saved = await connection(), { rows } = await db.query(`SELECT count(*) FILTER(WHERE google_sync_status='FAILED')::int AS failed,count(*) FILTER(WHERE google_sync_status='PENDING')::int AS pending,count(*) FILTER(WHERE google_sync_status='SYNCED')::int AS synced FROM calendar_events`); return { configured: configured(), connected: Boolean(saved), connectedAt: saved?.connected_at?.toISOString() ?? null, lastPulledAt: saved?.last_pulled_at?.toISOString() ?? null, failed: rows[0].failed, pending: rows[0].pending, synced: rows[0].synced }; }
