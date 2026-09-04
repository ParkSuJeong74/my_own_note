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
is presented as a readable North Star card instead of remaining inside the editor. The card renders
GitHub Flavored Markdown, including headings, paragraphs, emphasis, links, ordered and unordered
lists, task lists, blockquotes, fenced code, horizontal rules, and tables. Raw HTML is not rendered.
**Edit direction** opens a centered, wide modal so the reading card and
the rest of the page do not move while editing. The modal supports explicit Save and Cancel actions,
closes with Escape or a backdrop click, and becomes nearly full-screen on mobile. When no content
has been saved, the same modal is opened from **Write my direction**.

Each `/workspaces/<slug>` detail page contains its own **Development direction** area near the top.
It uses the same saved reading-card and modal-editor behavior as the personal direction area.
It stores only that project's direction and preserves the Workspace name, links, automation settings,
and other detail fields. Project direction is no longer managed through a separate aggregate screen.

Both fields are stored as plain multiline Markdown, trimmed before storage, allow an empty value,
and are limited to 10,000 characters. Display formatting does not alter the stored value. Verify
whitespace normalization and length boundaries, GFM rendering and raw-HTML safety, isolated global
and Workspace updates, responsive layout, the full test suite, type-check, and production build.

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

## Blog relationship and growth management

The Blog Workspace includes a manual **Reply inbox** for comments that need a response. Each item
stores the Naver post URL, commenter, comment excerpt, and received time; completing it preserves
the history and removes it from the pending count. Entries older than 24 hours are marked overdue.
Mano never stores a Naver session cookie and does not post comments automatically.

The discovery list ranks explicit return-visit promises (`답방 무조건`, `답방 100%`, `댓글 답방`,
and similar phrases) ahead of general mutual-neighbor and social phrases. This is a text signal, not
a guarantee, so the owner still verifies the blog before interacting.

The **Neighbor lottery** uses the saved exclusion/neighbor list, including imported Naver OPML IDs
and discovery entries marked as an existing neighbor. One button draws a neighbor and opens that
blog's home page so the owner can choose a recent post and leave a relevant comment. Re-drawing does
not repeat the currently selected neighbor when at least two are available. The lottery never posts
or visits automatically, and it does not treat a draw as proof that a comment was written.

The **Growth tracker** stores dated manual snapshots of visitors, views, neighbors, mutual neighbors,
posts, received comments, and replies. The latest snapshot and change from the previous snapshot are
shown together. Official Naver search results do not expose comment or private analytics data, so
the browser extension can read an explicitly labelled visitor count and the daily view count from an
opened Naver statistics page, and today's visitor count or total post count from a loaded blog home.
On statistics pages, the date selected in Naver's calendar is stored as the snapshot date rather than
the collection date. The extractor supports Naver's split summary grid, where metric labels and their
number row are separate DOM elements, without treating dates or chart labels as metric values. Daily likes, comments, neighbor additions, and traffic-source percentages are
not imported because they do not have the same meaning as Mano's cumulative relationship metrics.
Mano combines the reliable screen values with synchronized active neighbor counts, collected comments,
and completed replies. Metrics absent from the current Naver screen keep their latest saved value
instead of being reset to zero; the manual form remains a fallback. Verify URL validation,
non-negative metric boundaries, reply completion, overdue calculation, priority scoring, lottery
single-item and repeat-avoidance boundaries, empty
states, responsive layout, migrations, tests, type-check, and production build.
Pure URL, metric, priority, deduplication, and lottery rules stay in DB-free modules so the Node test
runner can execute them without resolving Next.js path aliases or opening PostgreSQL connections.

### Browser collection and reminders

The repository-local Chrome extension in `browser-extensions/naver-blog-replies` runs only on Naver
Blog pages. The owner opens a post's comment area and explicitly presses **Collect visible comments**;
the extension extracts visible comment metadata and sends it to Mano over a dedicated bearer-token
endpoint. Naver cookies and page HTML never leave the browser. The extension stores only the Mano
base URL and ingest token locally. Repeated collection is idempotent for the same post, commenter,
comment timestamp, and excerpt.

The popup keeps its live status output directly below the introduction so progress and extraction
errors remain visible even when the settings and collection controls extend beyond the popup height.
Naver management and statistics content may be hosted in a different `naver.com` frame from the
visible top-level page, so the extension may inspect Naver HTTPS subframes while still refusing to
run when the active top-level tab is not an approved Naver Blog screen. Failed growth extraction
reports which frame hosts were inspected and whether the expected daily-summary labels were visible.

`POST /api/integrations/blog/replies` accepts the extension payload with `MANO_BLOG_INGEST_TOKEN`.
`POST /api/integrations/n8n/blog/replies/remind` uses `MANO_N8N_TOKEN` and sends one ntfy digest when
there are replies older than 24 hours. A daily n8n schedule may call the reminder route; duplicate
digests are suppressed for the same calendar day. DOM extraction is intentionally isolated in the
extension because Naver markup can change; failed extraction leaves existing Mano data untouched.

The extension may expand comment controls on the currently loaded post or blog feed before reading
comments. It can also traverse the pagination links on Naver's owner-only comment-management page
and import all listed received comments at once. That management list does not expose a reliable
parent/reply relationship, so it only adds pending comments; reply completion is still detected from
the actual post thread. If Naver renders a management-row title without a normal post hyperlink, the
item uses the owner's blog home as a safe navigation fallback rather than dropping the visible comment.
The owner stores their Naver Blog ID in the extension. For each top-level comment, the
extension checks author links in its reply thread; comments containing a reply from that Blog ID are
excluded, and a previously collected inbox item is marked complete on the next synchronization.
Nickname text alone is not trusted because different accounts can share a nickname. On Naver's neighbor-management pages it separately synchronizes mutual neighbors,
ordinary neighbors, outgoing requests, and incoming requests. A synchronization is considered a
complete snapshot only when the extension recognizes the management page and finds its list; partial
or failed reads never deactivate existing relationships.

Comment identity canonicalizes Naver mobile, `PostView`, query-string, and iframe URL variants to the
same blog ID and post number. It also normalizes Unicode/whitespace and rounds equivalent displayed
timestamps to the minute. Ingestion checks existing rows with the same normalized identity before
insert. On synchronization, historical duplicate rows are consolidated into one canonical row; the
oldest row is retained, any existing replied timestamp is preserved, and redundant duplicate rows are
deleted. The API reports the cleanup count, while older API responses remain compatible with the
extension and display missing counters as zero.

Each Naver neighbor page is an independent snapshot scope (`following`, `followers`, or neighbor
requests). The popup provides a separate button for each scope instead of guessing it from unstable
Naver tab markup. The extension follows every discoverable pagination link on that page and marks the scope
complete only if all page requests succeed. When Naver renders page numbers as JavaScript controls
without navigable links, the collector clicks the next control and waits for the neighbor list to
change before parsing the following page. A complete `followers` snapshot can therefore never mark
entries from `following` as missing. Records incorrectly marked missing by the older unscoped collector
are restored as their own tab scopes are synchronized, then future missing detection stays within scope.

Mano compares complete neighbor snapshots. Missing entries and status transitions are displayed as
relationship changes, but a missing entry is labelled **relationship missing / verify** because the
Naver page does not reliably expose whether the other person cancelled, the owner cancelled, or the
account disappeared. The extension never accepts requests, adds neighbors, or posts comments.
Before the first browser synchronization, the legacy OPML/search-exclusion list remains a temporary
lottery fallback. As soon as any synchronized neighbor record exists, relationship counts and the
lottery use only active `blog_neighbors` records. Legacy exclusions remain solely to prevent search
recommendations from resurfacing known bloggers; they are no longer a second relationship source.
