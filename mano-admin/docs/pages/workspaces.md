# Workspaces

## Purpose

Workspaces separate project and content operations without introducing project-specific task
tables. Current workspaces are Project A, Project T, Blog, YouTube and Freelancer.

## Displayed data

- Workspace name and description
- Number of related Tasks
- Project resource links stored in the `workspaces.links` JSONB column
- Link to the Workspace-filtered Tasks page

Project A currently links to API Docs, Admin, Frontend and Notion. Project T links to API Docs,
Admin and Notion. All external resources open in a new tab.

## Link maintenance

Links use the following shape:

```json
[{ "label": "API Docs", "url": "https://example.com/docs" }]
```

Seed links live in `db/schema.sql` and are applied idempotently at application startup. A future
settings UI can edit the same JSONB field without changing the Workspace or Task model.
Freelancer currently uses the common Task fields; Blog and both Project workspaces receive their
specialized Task detail fields automatically.
