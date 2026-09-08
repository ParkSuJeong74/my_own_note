# Notification scheduler reliability

## Purpose

Keep T1 live notifications and overdue blog-comment reminders running when n8n is
stopped, unpublished, or temporarily unhealthy.

## Requirements

- A Mano-owned scheduler calls the T1 monitor every minute.
- When the monitor returns a monitoring token, the scheduler calls the live-monitor
  endpoint in the same tick. Repeated ticks continue the claimed monitor safely.
- T1 schedule synchronization and the overdue blog-reply reminder run once per day.
- Only unreplied comments that are at least 72 hours old enter the overdue reminder.
- Startup performs all three jobs so a container restart repairs a missed daily run.
- Individual request failures are logged and retried on the next tick without
  terminating the scheduler.
- Existing n8n workflows may remain enabled. Database claims and the daily reminder
  state keep duplicate work and notifications idempotent.

## Impact and exceptions

The scheduler uses only Mano's existing authenticated internal HTTP endpoints and
does not access providers directly. A missing `MANO_N8N_TOKEN` is a fatal
configuration error. T1 placeholder opponents remain eligible for repair for 45
days after their scheduled time, covering stale completed tournament brackets.
When a provider replaces a bracket placeholder with a new external match ID, sync
adopts the closest unresolved slot (within three hours) before applying the final
opponent, status, and score. This preserves the existing Mano card and its monitor
state instead of leaving a stale `0:0 TBD` card behind.
Official LoL Esports schedule recovery runs before the Leaguepedia cooldown check,
so a Leaguepedia `429` cannot prevent a completed bracket placeholder from receiving
its official opponent, best-of format, final status, and score.

## Verification

- Unit-test schedule due-time calculations, startup behavior, monitor chaining,
  authentication headers, failure isolation, and placeholder-ID adoption.
- Run the Mano Admin test suite, TypeScript check, production build, and Compose
  configuration validation.
