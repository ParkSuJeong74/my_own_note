# Approvals

## Purpose

Approvals record an explicit human decision associated with a Task. They are intentionally small:
`pending`, `approved` or `rejected`, with a note and decision timestamps.

## Actions

- Approve changes the Approval to `approved` and the related Task to `in_progress`.
- Reject changes the Approval to `rejected` and the related Task to `todo`.
- A decided Approval cannot be decided a second time.

The transaction updates the Approval and Task together. This page does not call n8n or start an
automation run.

## API

- `GET /api/automation/approvals`
- `PATCH /api/automation/approvals/:id` with `approved` or `rejected`
