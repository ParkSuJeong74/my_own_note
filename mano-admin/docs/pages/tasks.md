# Tasks

## Purpose

Tasks are the shared, provider-neutral record for a human-assisted workflow. Mano Admin prepares context and prompts; the user operates ChatGPT and Codex. Saving a Task never calls an AI API, n8n, a repository, or the filesystem.

## List page

`Automation > Tasks` supports Workspace filtering and creation with Workspace, title, description, and priority. New Tasks start in `DRAFT`. Blog creates a Blog Task; Project A and Project T create Project Tasks; other Workspaces use the common form. Click a Task title for its detail page.

## Detail page

Common fields are title, priority, description, input notes, general result, and references. Enter one reference per line. `Label | value` supplies a label; a raw URL or `/files/...` path also works. Artifact paths remain metadata only and do not grant filesystem access.

Blog fields are original memo, photo/file paths, generated title, generated body, and keywords. Project fields are Issue URL, problem description, ChatGPT analysis, Codex instruction notes, Codex result, and PR URL.

The ChatGPT panel builds a deterministic prompt from saved data, copies it, and opens `chatgpt.com`. The Codex panel builds and copies an implementation instruction. Nothing is transmitted automatically: paste results into the fields and save. Save edits before copying a regenerated prompt because the displayed prompt reflects the last saved state.

## Status lifecycle

```text
DRAFT → READY → IN_PROGRESS → REVIEW → DONE
```

Manual movement between all statuses is allowed. A status change does not run automation.

## API boundary

- `GET /api/automation/tasks?workspace=<slug>`
- `POST /api/automation/tasks`
- `GET /api/automation/tasks/:id`
- `PATCH /api/automation/tasks/:id` (status only)

These routes use the same Cloudflare Access JWT validation as the UI. They are the narrow future n8n boundary, but no n8n callback or service token exists in this phase.
