# Tasks

## Purpose

Tasks are provider-neutral work items. They can be created and managed before n8n or another
automation provider is connected.

## Creating a Task

Required fields are Workspace and title. Description is optional and priority is `low`,
`normal` or `high`. New Tasks start in `todo`.

## Status lifecycle

```text
todo → in_progress → waiting_approval → completed
                 └────────────────────→ failed
```

The MVP allows manual movement between all listed statuses. It does not execute a workflow when
the status changes.

## Filtering and Artifacts

Workspace chips filter Tasks using the `workspace` query parameter. Artifact entries show their
logical `/files/...` paths. Mano Admin stores only metadata and has no filesystem mount or file
management permission.

## API

- `GET /api/automation/tasks?workspace=<slug>`
- `POST /api/automation/tasks`
- `PATCH /api/automation/tasks/:id`

These routes currently require the same Cloudflare Access JWT as the UI.
