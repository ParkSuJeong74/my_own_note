import assert from "node:assert/strict";
import test from "node:test";
import { isReadOnlyGoogleCalendar, koreanHolidayCalendarId, normalizeGoogleCalendarEvent } from "../src/lib/google-calendar-event.ts";

test("normalizes ordinary timed Google events", () => {
  assert.deepEqual(normalizeGoogleCalendarEvent({ id: "event-1", summary: " 약속 ", description: "설명", updated: "2026-09-02T01:00:00Z", start: { dateTime: "2026-09-03T10:00:00+09:00" }, end: { dateTime: "2026-09-03T11:30:00+09:00" } }), {
    action: "upsert", allDay: false, description: "설명", endsAt: "2026-09-03T02:30:00.000Z", googleEventId: "event-1", googleUpdatedAt: "2026-09-02T01:00:00Z", recurrence: "NONE", startsAt: "2026-09-03T01:00:00.000Z", title: "약속",
  });
});

test("imports yearly recurring masters as one Mano event", () => {
  const result = normalizeGoogleCalendarEvent({ id: "series", recurrence: ["RRULE:FREQ=YEARLY"], summary: "매년 일정", start: { date: "2026-09-22" }, end: { date: "2026-09-23" } });
  assert.equal(result.action, "upsert");
  if (result.action === "upsert") assert.equal(result.recurrence, "YEARLY");
});

test("skips detached recurring instances and unsupported recurrence rules", () => {
  assert.deepEqual(normalizeGoogleCalendarEvent({ id: "series_20260904", recurringEventId: "series", start: { dateTime: "2026-09-04T09:00:00+09:00" } }), { action: "skip" });
  assert.deepEqual(normalizeGoogleCalendarEvent({ id: "weekly", recurrence: ["RRULE:FREQ=WEEKLY"], start: { dateTime: "2026-09-04T09:00:00+09:00" } }), { action: "skip" });
});

test("converts Google's exclusive all-day end date to Mano's inclusive date", () => {
  const result = normalizeGoogleCalendarEvent({ id: "all-day", start: { date: "2026-09-02" }, end: { date: "2026-09-05" } });
  assert.deepEqual(result, { action: "upsert", allDay: true, description: "", endsAt: "2026-09-03T15:00:00.000Z", googleEventId: "all-day", googleUpdatedAt: null, recurrence: "NONE", startsAt: "2026-09-01T15:00:00.000Z", title: "제목 없음" });
});

test("allows read-only subscription instances without treating them as recurrence masters", () => {
  const result = normalizeGoogleCalendarEvent({ id: "holiday_20260922", recurringEventId: "holiday", start: { date: "2026-09-22" }, end: { date: "2026-09-23" } }, { allowRecurringInstances: true });
  assert.equal(result.action, "upsert");
  if (result.action === "upsert") assert.equal(result.recurrence, "NONE");
});

test("maps cancelled events to deletion and ignores malformed events", () => {
  assert.deepEqual(normalizeGoogleCalendarEvent({ id: "deleted", status: "cancelled" }), { action: "delete", id: "deleted" });
  assert.deepEqual(normalizeGoogleCalendarEvent({ id: "no-start" }), { action: "skip" });
  assert.deepEqual(normalizeGoogleCalendarEvent({ id: "", start: { date: "2026-09-02" } }), { action: "skip" });
});

test("treats the Korean holiday subscription as read-only", () => {
  assert.equal(isReadOnlyGoogleCalendar(koreanHolidayCalendarId), true);
  assert.equal(isReadOnlyGoogleCalendar("primary"), false);
});
