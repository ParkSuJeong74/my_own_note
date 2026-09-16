# Error contract

## Goals

Errors must be actionable for the user, stable for clients and diagnostic for operators without
leaking internals. A successful HTTP response must never claim that unsaved or unsynchronized work
is durable.

## Envelope direction

```json
{
  "code": "NOTE_NOT_FOUND",
  "messageKey": "error.note.notFound",
  "requestId": "opaque-correlation-id",
  "retryable": false,
  "details": {}
}
```

- `code` is stable and domain-specific; clients do not branch on localized text.
- `messageKey` maps to client-localized copy. The server may provide safe fallback copy.
- `requestId` links user reports to protected server telemetry.
- `retryable` reflects actual idempotency and recovery behavior.
- `details` is allowlisted validation/context data, never stack traces, SQL or secrets.

## Client-local conditions

| Code | When | User direction |
| --- | --- | --- |
| `PAGE_NOT_FOUND` | No client route matches | Check the address or return to a safe home page. |
| `SERVICE_UNAVAILABLE` | Service cannot currently be reached | Preserve local work, show status and offer retry. |
| `NETWORK_OFFLINE` | Device connectivity is unavailable | Continue locally where supported and show pending synchronization. |

## Server categories

| Category | HTTP direction | Alerting direction |
| --- | --- | --- |
| `VALIDATION_FAILED` | 400/422 with field-safe details | Metrics/logs; alert only on anomaly, not every user mistake. |
| `UNAUTHENTICATED` / `FORBIDDEN` | 401/403 | Security telemetry; alert on suspicious patterns. |
| Domain `*_NOT_FOUND` | 404 | No routine alert. |
| `CONFLICT` | 409 with current version/recovery action | Track rate; alert on regressions. |
| `RATE_LIMITED` | 429 with retry guidance | Capacity/abuse metrics. |
| `DEPENDENCY_UNAVAILABLE` | 502/503, retryable only when safe | Alert by dependency/service objective. |
| `INTERNAL_ERROR` | 500 with generic safe copy | Error alert with request ID; internals only in protected logs. |

Legacy names such as `ERR_PAGE_NOT_FOUND`, `ERR_ACCESS`, `ERR_NETWORK`, `ERR_BAD_REQUEST` and
`ERR_INTERNAL_ERROR` are preserved as historical vocabulary, not frozen wire values. In particular,
a bad request should describe correctable input when safe instead of masquerading as an unexpected
server failure.

## Offline and synchronization states

Save and sync are separate states: `local-saving`, `local-saved`, `sync-pending`, `syncing`,
`synced`, `conflict`, and `sync-failed`. Closing protection depends on local durability, while status
and retry actions expose remote synchronization independently.

## Verification

- Contract tests verify status, code, envelope and redaction.
- UI tests verify localized copy, retry affordance and preservation of unsent work.
- Retry tests prove idempotency and bounded backoff.
- Logging tests prove correlation IDs exist and secrets/personal content are redacted.
