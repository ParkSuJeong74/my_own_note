export type GoogleCalendarEvent = {
  id: string;
  recurringEventId?: string;
  status?: string;
  summary?: string;
  description?: string;
  updated?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

type NormalizedGoogleEvent =
  | { action: "delete"; id: string }
  | { action: "skip" }
  | {
      action: "upsert";
      allDay: boolean;
      description: string;
      endsAt: string | null;
      googleEventId: string;
      googleUpdatedAt: string | null;
      startsAt: string;
      title: string;
    };

const atSeoulMidnight = (date: string) =>
  new Date(`${date}T00:00:00+09:00`).toISOString();
const previousDate = (date: string) =>
  new Date(Date.parse(`${date}T00:00:00Z`) - 86_400_000)
    .toISOString()
    .slice(0, 10);
const nextDate = (date: string) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);

export function normalizeGoogleCalendarEvent(
  event: GoogleCalendarEvent,
): NormalizedGoogleEvent {
  if (!event.id) return { action: "skip" };
  if (event.status === "cancelled") return { action: "delete", id: event.id };

  const allDay = Boolean(event.start?.date);
  const startRaw = event.start?.date ?? event.start?.dateTime;
  const endRaw = event.end?.date ?? event.end?.dateTime;
  if (!startRaw) return { action: "skip" };

  return {
    action: "upsert",
    allDay,
    description: event.description ?? "",
    endsAt: allDay
      ? atSeoulMidnight(previousDate(endRaw ?? nextDate(startRaw)))
      : endRaw
        ? new Date(endRaw).toISOString()
        : null,
    googleEventId: event.id,
    googleUpdatedAt: event.updated ?? null,
    startsAt: allDay
      ? atSeoulMidnight(startRaw)
      : new Date(startRaw).toISOString(),
    title: event.summary?.trim() || "제목 없음",
  };
}
