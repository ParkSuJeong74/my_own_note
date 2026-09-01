import assert from "node:assert/strict";
import test from "node:test";
import { normalizeGoogleCalendarEvent } from "../src/lib/google-calendar-event.ts";

test("normalizes ordinary timed Google events", () => {
  assert.deepEqual(normalizeGoogleCalendarEvent({ id: "event-1", summary: " 약속 ", description: "설명", updated: "2026-09-02T01:00:00Z", start: { dateTime: "2026-09-03T10:00:00+09:00" }, end: { dateTime: "2026-09-03T11:30:00+09:00" } }), {
    action: "upsert", allDay: false, description: "설명", endsAt: "2026-09-03T02:30:00.000Z", googleEventId: "event-1", googleUpdatedAt: "2026-09-02T01:00:00Z", startsAt: "2026-09-03T01:00:00.000Z", title: "약속",
  });
});

test("imports recurring instances instead of skipping them", () => {
  const result = normalizeGoogleCalendarEvent({ id: "series_20260904", recurringEventId: "series", summary: "매주 일정", start: { dateTime: "2026-09-04T09:00:00+09:00" }, end: { dateTime: "2026-09-04T10:00:00+09:00" } });
  assert.equal(result.action, "upsert");
  if (result.action === "upsert") assert.equal(result.googleEventId, "series_20260904");
});

test("converts Google's exclusive all-day end date to Mano's inclusive date", () => {
  const result = normalizeGoogleCalendarEvent({ id: "all-day", start: { date: "2026-09-02" }, end: { date: "2026-09-05" } });
  assert.deepEqual(result, { action: "upsert", allDay: true, description: "", endsAt: "2026-09-03T15:00:00.000Z", googleEventId: "all-day", googleUpdatedAt: null, startsAt: "2026-09-01T15:00:00.000Z", title: "제목 없음" });
});

test("maps cancelled events to deletion and ignores malformed events", () => {
  assert.deepEqual(normalizeGoogleCalendarEvent({ id: "deleted", status: "cancelled" }), { action: "delete", id: "deleted" });
  assert.deepEqual(normalizeGoogleCalendarEvent({ id: "no-start" }), { action: "skip" });
  assert.deepEqual(normalizeGoogleCalendarEvent({ id: "", start: { date: "2026-09-02" } }), { action: "skip" });
});
