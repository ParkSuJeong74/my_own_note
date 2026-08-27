# Runs

## Purpose

Runs provide provider-neutral automation history. The current records are seed/mock data; no
request is sent to n8n.

## Fields

- Related Task and Workspace
- `queued`, `running`, `succeeded` or `failed` status
- Optional provider workflow reference
- Human-readable summary
- Start and optional finish timestamps

## Callback boundary

- `GET /api/automation/runs`
- `POST /api/automation/runs`
- `PATCH /api/automation/runs/:id`

A future n8n callback will use these routes after service authentication and idempotency controls
are added. Browser Cloudflare Access authentication is the only accepted mechanism today.
