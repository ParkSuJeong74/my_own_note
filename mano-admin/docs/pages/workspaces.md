# Workspaces

## Purpose

Workspaces separate project and content operations without introducing project-specific task
tables. Current workspaces are Project A, Project T, Blog, YouTube and Freelancer.

## Displayed data

- Workspace name and description
- Number of related Tasks
- Project resource links stored in the `workspaces.links` JSONB column
- Link to the Workspace-filtered Tasks page

Each Workspace is also a first-class Sidebar destination with its own
`/workspaces/<slug>` page. The All Workspaces page remains the catalog and entry point.

## Workspace detail pages

Every detail page explains the Workspace role, what work belongs there, the recommended Task
workflow, and when a Task should be created. It also shows external resources, open/total Task
counts, the five most recently updated Tasks, due dates, and links to the filtered Task list.

The **Edit Workspace content** panel at the bottom allows the owner to change the displayed name,
catalog description, page summary, purpose, responsibilities, workflow, Task guidance, and resource
links. Responsibilities and workflow use one line per item. Resource links use
`Label | https://example.com` with one link per line; only HTTP and HTTPS links are accepted.
Saved names are also reflected in the Sidebar navigation.

## Personal and project direction

The main `/workspaces` page contains one long-form **Life and career direction** area. It stores
personal goals, career direction, principles, and long-term plans that span every project. This is
global Mano data and does not belong to the Blog or any individual Workspace. Once saved, the text
is presented as a readable North Star card instead of remaining inside the editor. Blank-line
paragraphs, Markdown-style headings (`#` through `###`), and list items beginning with `-`, `*`, or
`+` are visually separated. **Edit direction** opens a centered, wide modal so the reading card and
the rest of the page do not move while editing. The modal supports explicit Save and Cancel actions,
closes with Escape or a backdrop click, and becomes nearly full-screen on mobile. When no content
has been saved, the same modal is opened from **Write my direction**.

Each `/workspaces/<slug>` detail page contains its own **Development direction** area near the top.
It uses the same saved reading-card and modal-editor behavior as the personal direction area.
It stores only that project's direction and preserves the Workspace name, links, automation settings,
and other detail fields. Project direction is no longer managed through a separate aggregate screen.

Both fields are stored as plain multiline text, trimmed before storage, allow an empty value, and
are limited to 10,000 characters. Display formatting does not alter the stored value. Verify
whitespace normalization and length boundaries, display block parsing, isolated global and
Workspace updates, responsive layout, the full test suite, type-check, and production build.

- Project A documents Alcove product delivery from issue capture to reviewed pull request.
- Project T documents Tono backend/API/Admin work and its review flow.
- Blog documents the source memo, media path, generation, review, and manual publishing flow.
- YouTube documents the current provider-neutral planning and production flow.
- Freelancer documents client delivery and handoff work without creating a client-specific model.

Project A links to API Docs, Admin, Frontend, Notion, and its GitHub repository. Project T links
to API Docs, Admin, Notion, and its GitHub repository. Blog links to the public Naver Blog. The
page header also links to the shared `my_own_note` Mano repository. All external resources open
in a new tab.

## Link maintenance

Links use the following shape:

```json
[{ "label": "API Docs", "url": "https://example.com/docs" }]
```

Initial links live in `db/schema.sql`. Existing Workspace rows are no longer overwritten during
application startup, so edits stored in PostgreSQL survive rebuilds and redeployments.
Freelancer currently uses the common Task fields; Blog and both Project workspaces receive their
specialized Task detail fields automatically.
