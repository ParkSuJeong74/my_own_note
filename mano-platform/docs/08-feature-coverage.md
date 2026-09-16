# Complete feature coverage

## Scope

This is the completeness ledger for product **features** supplied through LEG-0001, LEG-0002 and
LEG-0003. Technology names, deployment products, programming libraries, implementation recipes,
cost estimates and schedule guesses are deliberately excluded; they are not features.

Every item below is represented by one or more stable IDs in the canonical
[requirements catalog](01-product-requirements.md). `FUTURE` still means “preserved”; it does not
mean rejected.

## Personal editor and writing

- `EDT-001`–`EDT-043`: Markdown/block editing, formatting, unlimited folder hierarchy, automatic
  saving, offline work, sync, undo/redo, indentation, folding, checklists, tables/databases, files,
  media, embeds, shortcuts, command palette, diagrams, formulas, charts, references/backlinks,
  contents/outline, find/replace, filters/sort, search/history, smart paste, drag/drop, drawing,
  readers and annotations, spelling, clipboard history, tabs/windows/splits, multi-cursor, minimap,
  line/character counts, syntax highlighting, URL linking, VS Code preset, preview, import/export,
  revisions/diffs/recovery, print mode, scanning, knowledge graph, automatic organization,
  recommendations, plugins/widgets and whiteboard.
- `WRT-001`–`WRT-005`: word/session counts, goals/progress, chapter/scene structure,
  character/plot/research notes and diary/reading/meeting templates.
- `ADV-001`–`ADV-020`: themes/fonts, OCR/web clipping, calendar, quick memo/widgets, email,
  ledger/calculations, focus/Pomodoro, reminders, voice/STT/TTS, AI assistance, time/habit/project
  tracking, Kanban, document expiry, automation and media optimization.
- `DAT-001`–`DAT-007`: table/list/board/calendar/gallery/timeline views, typed properties,
  relations/rollups/formulas, filter/sort/group/display settings, templates, action buttons and
  provider-backed sources.

## Reliability, platform and settings

- `REL-001`–`REL-020`: cross-device realtime sync, collaborative sync, recovery, close protection,
  scheduled backup, settings sync, authentication boundary, encryption/secrets, monitoring/jobs/logs,
  statistics, export/deletion, performance/large documents, background and bandwidth/battery-aware
  sync, large files, point-in-time restore, audit logs, transport/API abuse protection, masking and
  service observability.
- `A11Y-001`–`A11Y-006`: screen reader, high contrast, keyboard completeness, touch/stylus/gestures,
  Korean/English locale and accessibility profiles.
- `ACC-001`–`ACC-008`: email signup/verification/login/recovery, Google/Kakao OAuth, 2FA,
  consent history, age/adult policy, profile/credentials, safe account discovery and app/legal/license
  information.
- `NTF-001`–`NTF-005`: notification inbox, push, change timeline, chat notifications and categorized
  donation/publishing/system notifications with read/delete/leave/quiet-hour behavior.

## Publishing, social and collaboration

- `PUB-001`–`PUB-016`: note-to-blog publication, privacy/drafts/previews, SEO/social preview,
  scheduling, comments/follows/likes/bookmarks/feeds/reshares, edit-history policy, series and
  subscriptions/newsletters, profiles/site headers, grades/questions/requests, blog themes,
  subdomains/custom domains, ads, analytics, short posts/threads/mentions/hashtags, trending and
  content calendar.
- `COL-001`–`COL-012`: comments/mentions, chat/group chat, polls, permissions, activity timeline,
  spaces/channels/roles/threads, voice/video/screen share/events, workshops/mentoring/portfolios,
  document branching/review, team dashboards, locking and collaborative whiteboards/voting.

## AI, guidance, support and business

- `AI-001`–`AI-004`: provider-backed chat, history/portability, file analysis, prompt templates and
  model choice. AI “ask/apply” inside documents is also covered by `ADV-010`.
- `GDE-001`, `SUP-001`: quest-style Mano guides for each product area and inquiry/support workflow.
- `DON-001`–`DON-003`: one-time/recurring donations, messages, alerts, status, badges, ranking and
  donor privacy.
- `PAY-001`–`PAY-003`, `SAL-001`, `BUS-001`–`BUS-002`: payments/refunds, subscriptions,
  currencies/invoices/promotions, memberships/quotas, content/service sales, compliant advertising
  and controlled product experiments.

## Completeness rule for future legacy intake

New material is not considered ingested until every actual user capability is either mapped to an
existing ID or assigned a new ID. Architecture sketches may be recorded separately, but they never
replace a feature requirement or silently remove one.
