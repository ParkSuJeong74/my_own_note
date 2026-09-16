# Product requirements catalog

## Purpose

This is the canonical inventory for new and legacy requirements. It preserves historical intent
without treating every item as an immediate commitment. Each implemented feature must reference a
requirement ID and add acceptance criteria before coding begins.

## Status and priority

- `FOUNDATION`: required before dependable daily use.
- `WORKSPACE`: completes the configurable personal workspace.
- `PLATFORM`: enables multi-user, publishing, or commercial operation.
- `FUTURE`: retained product intent with no current delivery commitment.
- Historical labels such as `m1`–`m7` are recorded as `legacy milestone`; they are not current dates.

## Editor foundation

| ID | Requirement | Tier | Acceptance direction |
| --- | --- | --- | --- |
| EDT-001 | Markdown-aware block editor | FOUNDATION | Markdown shortcuts and import do not require storing raw unsafe HTML. |
| EDT-002 | Infinite page/folder hierarchy with icons and colors | FOUNDATION | Create, rename, move, archive, restore; cycles are impossible. |
| EDT-003 | Automatic saving | FOUNDATION | Visible saving states, retry, conflict handling, no false success. |
| EDT-004 | Offline editing and synchronization | FOUNDATION | Edits survive restart offline and reconcile after reconnect. |
| EDT-005 | Undo and redo history | FOUNDATION | User can reverse local and persisted edits without silent loss. |
| EDT-006 | Indentation, folding and block movement | FOUNDATION | Keyboard and pointer workflows are equivalent. |
| EDT-007 | Checklist and Todo blocks | FOUNDATION | Markdown shortcut, completion, filtering and accessible controls. |
| EDT-008 | Tables and structured databases | WORKSPACE | Typed properties, row pages, schema changes and safe migration. |
| EDT-009 | Files, images, audio and video | WORKSPACE | Upload, preview, metadata, replacement, download and deletion lifecycle. |
| EDT-010 | Widgets and controlled embeds | WORKSPACE | Allowed providers, sandboxed iframe policy and clear failure state. |
| EDT-011 | Custom shortcuts and command palette | WORKSPACE | Commands searchable, conflicts detected, reset available. |
| EDT-012 | Diagram blocks | WORKSPACE | Text/source and rendered result remain editable and exportable. |
| EDT-013 | Tags, references, backlinks and table of contents | WORKSPACE | Navigation updates after rename and archive. |
| EDT-014 | Find/replace, file search, global search and search history | WORKSPACE | Scoped, cancellable, bounded and privacy-preserving. |
| EDT-015 | Smart copy/paste and drag/drop | WORKSPACE | Common web, Markdown, files and internal blocks preserve intent. |
| EDT-016 | Drawing and writing over content | WORKSPACE | Touch/stylus drawing remains aligned and separately editable. |
| EDT-017 | Reader mode for PDF, text and EPUB | WORKSPACE | Read, search, annotate and return to source location. |
| EDT-018 | Comments and annotations | WORKSPACE | Anchors survive ordinary text edits or visibly become orphaned. |
| EDT-019 | Spell checking and URL auto-linking | WORKSPACE | Language-aware opt-out and reversible conversion. |
| EDT-020 | Clipboard history | FUTURE | Local-first, sensitive-item exclusion, explicit retention controls. |
| EDT-021 | Multiple tabs, windows, panels and split view | WORKSPACE | Layout restores without duplicating or losing edits. |
| EDT-022 | Multi-cursor and bulk line editing | FUTURE | Predictable keyboard behavior and undo grouping. |
| EDT-023 | Document minimap, line numbers and character count | FUTURE | Optional and hidden by default. |
| EDT-024 | Syntax-highlighted code blocks | WORKSPACE | Language selection, copy, safe rendering and export. |
| EDT-025 | VS Code-compatible shortcut preset | FUTURE | Optional preset without overriding browser-critical shortcuts. |
| EDT-026 | Live preview | WORKSPACE | Editing and rendered modes remain consistent. |
| EDT-027 | Import and export | FOUNDATION | Open formats, preflight, duplicate policy and resumable failures. |
| EDT-028 | Version history and recovery | FOUNDATION | Restore creates a new revision and never destroys later history. |
| EDT-029 | Rich text formatting and configurable typography | FOUNDATION | Bold, emphasis, headings, lists, spacing and margins export predictably. |
| EDT-030 | Mathematical formula blocks | WORKSPACE | Source remains editable, accessible and safely rendered. |
| EDT-031 | Chart and data-visualization blocks | WORKSPACE | Data/source and rendered output remain portable. |
| EDT-032 | Sandboxed code execution | FUTURE | Explicit run, resource limits, no ambient secrets/network and visible output. |
| EDT-033 | Outline mode and structural editing | WORKSPACE | Heading navigation, folding and reordering preserve anchors. |
| EDT-034 | Macros and reusable snippets | FUTURE | Recording is opt-in, previewable and permission-limited. |
| EDT-035 | Print-optimized view | WORKSPACE | Pagination, media and typography have predictable print/PDF output. |
| EDT-036 | Multiple document-format viewers | WORKSPACE | Supported formats and fidelity are declared with safe fallback/download. |
| EDT-037 | Link validity checking | FUTURE | Checks are bounded, privacy-aware and never execute embedded content. |
| EDT-038 | Document scanning and automatic classification | FUTURE | Original scan, OCR correction, metadata and classification confidence persist. |
| EDT-039 | Knowledge graph and relationship view | FUTURE | Backlinks and explicit relations work before automatic suggestions. |
| EDT-040 | Automatic tagging, metadata extraction and topic clustering | FUTURE | Suggestions are explainable, reversible and never silently reorganize data. |
| EDT-041 | Related-document recommendations | FUTURE | Private by default with source explanation and disable control. |
| EDT-042 | Extensible plugin and widget system | FUTURE | Capability permissions, sandboxing, review, versioning and removal are defined. |
| EDT-043 | Whiteboard and freeform canvas | FUTURE | Drawing, connectors, charts and collaboration export without proprietary loss. |

## Writer workflow

| ID | Requirement | Tier | Acceptance direction |
| --- | --- | --- | --- |
| WRT-001 | Word, character and writing-session counts | FOUNDATION | Counts are deterministic, language-aware and do not block typing. |
| WRT-002 | Daily or project writing goals and progress | WORKSPACE | Time zone, pause/reset and historical progress are explicit. |
| WRT-003 | Chapter and scene organization | WORKSPACE | Reordering preserves content, references and export order. |
| WRT-004 | Character, plot and research reference notes | WORKSPACE | User-defined templates and links remain ordinary exportable pages. |
| WRT-005 | Diary, reading-note and meeting templates | WORKSPACE | Templates create editable content and can be duplicated or removed. |

## Advanced personal workspace

| ID | Requirement | Tier | Acceptance direction |
| --- | --- | --- | --- |
| ADV-001 | Themes, custom fonts and font sizing | WORKSPACE | Accessible defaults and synchronized preferences. |
| ADV-002 | OCR for photos and documents | WORKSPACE | Preserve source, confidence and corrected text separately. |
| ADV-003 | Calendar views and integrations | WORKSPACE | CRUD, recurrence, colors, external sync and conflict visibility. |
| ADV-004 | Memo and quick-capture surfaces | WORKSPACE | Capture requires minimal navigation and lands in a user-chosen destination. |
| ADV-005 | Email data source | FUTURE | Explicit account scope and no silent sending. |
| ADV-006 | Ledger and automatic calculations | WORKSPACE | Decimal-safe formulas, categories, periods and auditability. |
| ADV-007 | Focus mode and Pomodoro | FUTURE | Optional sessions with interruption-safe timers. |
| ADV-008 | Smart reminders | WORKSPACE | Explain trigger, snooze, deduplicate and respect quiet hours. |
| ADV-009 | Voice memo, speech-to-text and TTS | FUTURE | Source audio retained with transcript and playback position. |
| ADV-010 | AI ask and apply | WORKSPACE | Scope preview, diff preview, cancellation, history and provider choice. |
| ADV-011 | Web clipper | WORKSPACE | Source URL, capture time, selection and cleaned snapshot remain distinguishable. |
| ADV-012 | Time tracking | FUTURE | Explicit start/stop, correction and privacy-preserving reports. |
| ADV-013 | Habit tracking | FUTURE | Recurrence, time zone, missed days and history are explicit. |
| ADV-014 | Gantt and project timeline | FUTURE | Dependencies and dates share the same underlying records as other views. |
| ADV-015 | Kanban and task management | WORKSPACE | Status transitions, due dates and completion remain usable outside board view. |
| ADV-016 | Document expiry and reminders | FUTURE | Expiry never deletes content silently; renewal and archive are available. |
| ADV-017 | Workflow automation | FUTURE | Trigger/action preview, permissions, run history, retry and disable controls. |
| ADV-018 | Media optimization | WORKSPACE | Originals are retained by policy; responsive variants and failure recovery exist. |
| ADV-019 | Quick-capture desktop and mobile widgets | FUTURE | Capture works with minimal steps and clear offline/pending state. |
| ADV-020 | Email and calendar import/integration | FUTURE | Minimum OAuth scopes, source provenance, revocation and sync conflict rules. |

## Views and configurable applications

| ID | Requirement | Tier | Acceptance direction |
| --- | --- | --- | --- |
| DAT-001 | Table, List, Board, Calendar, Gallery and Timeline views | WORKSPACE | Same records can have multiple saved views. |
| DAT-002 | Text, number, choice, multi-choice, date, checkbox, URL and file properties | WORKSPACE | Typed validation and reversible schema changes. |
| DAT-003 | Relations, rollups and formulas | WORKSPACE | Cycle prevention, deterministic calculation and error visibility. |
| DAT-004 | Filter, multi-sort, group and visible-property configuration | WORKSPACE | Saved per view and usable without code. |
| DAT-005 | Page and database templates | WORKSPACE | Output is fully editable ordinary content. |
| DAT-006 | Action buttons | WORKSPACE | Create/update/complete/open actions have preview, permission and failure state. |
| DAT-007 | Provider-backed data sources | WORKSPACE | T1, blog, calendar, automation and monitoring expose stable contracts. |

## Reliability, sync and security

| ID | Requirement | Tier | Acceptance direction |
| --- | --- | --- | --- |
| REL-001 | Real-time device synchronization | FOUNDATION | Observable latency, retry and deterministic conflict policy. |
| REL-002 | Multi-user real-time editing and cursor presence | PLATFORM | CRDT/OT choice proven under disconnect and reconnect. |
| REL-003 | Automatic error recovery | FOUNDATION | Recoverable work is restored and failures remain visible. |
| REL-004 | Close-tab unsaved-work protection | FOUNDATION | Browser prompt only when durable persistence is not complete. |
| REL-005 | Scheduled automatic backup | FOUNDATION | Configurable retention and regularly tested restore. |
| REL-006 | Settings synchronization | WORKSPACE | Device-specific settings are explicitly separated. |
| REL-007 | Authentication and inactive-account policy | PLATFORM | Personal mode and hosted multi-user mode have separate boundaries. |
| REL-008 | Encryption and secrets management | FOUNDATION | Encryption in transit, protected secrets and documented at-rest model. |
| REL-009 | Monitoring, scheduling and logs | FOUNDATION | Health, jobs, failures and retention are observable. |
| REL-010 | Usage and product statistics | WORKSPACE | Private by default, transparent, exportable and disableable. |
| REL-011 | Account export and deletion lifecycle | PLATFORM | Export precedes deletion; retention, scheduled purge and cancellation are visible. |
| REL-012 | Performance budgets and large-document behavior | FOUNDATION | Budgets cover startup, input latency, memory and long-list/document degradation. |
| REL-013 | Network-state detection and background synchronization | FOUNDATION | Offline/pending status is visible and background work is bounded by platform policy. |
| REL-014 | Bandwidth, storage and battery-aware synchronization | WORKSPACE | Incremental transfer, deduplication, priorities and cache eviction are measurable. |
| REL-015 | Large-file and media processing | WORKSPACE | Chunking, resumability, quotas, validation and safe transformation are tested. |
| REL-016 | Point-in-time backup recovery and revision comparison | WORKSPACE | Restore drills and readable diffs prove recoverability. |
| REL-017 | Security audit trail | PLATFORM | Login attempts, permission changes and sensitive access are retained and protected. |
| REL-018 | Rate limiting, transport security and abuse protection | PLATFORM | HTTPS, origin policy, limits and safe denial behavior are verified. |
| REL-019 | Sensitive-content detection and masking | FUTURE | Detection confidence, user control, access rules and audit are explicit. |
| REL-020 | Service health and performance observability | FOUNDATION | Errors, logs, jobs, latency, resource use and backup health are correlated. |

SSE, WebSocket, message queues, CRDT, and similar terms are architecture candidates rather than
product outcomes. The architecture decision record must justify them against delivery semantics,
offline behavior, operational cost, and recovery.

## Accessibility and input

| ID | Requirement | Tier | Acceptance direction |
| --- | --- | --- | --- |
| A11Y-001 | Screen reader support | FOUNDATION | Semantic controls, labels, announcements and tested editor navigation. |
| A11Y-002 | High-contrast mode | WORKSPACE | Meets contrast requirements without losing state distinctions. |
| A11Y-003 | Keyboard-complete navigation | FOUNDATION | Every core action is possible without pointer input. |
| A11Y-004 | Touch, stylus and gesture configuration | WORKSPACE | Prevent accidental drawing and support user-defined gestures. |
| A11Y-005 | Language and locale settings | WORKSPACE | Korean and English UI, locale-aware dates/numbers and fallback behavior. |
| A11Y-006 | Accessibility profiles | FUTURE | Named presets remain individually adjustable and synchronized. |

## Account and trust

| ID | Requirement | Tier | Acceptance direction |
| --- | --- | --- | --- |
| ACC-001 | Email sign-up, verification, login and recovery | PLATFORM | Rate-limited, enumeration-safe and recoverable without support access to passwords. |
| ACC-002 | Google/Kakao OAuth linking | PLATFORM | Duplicate identity and unlink/last-login-method rules are explicit. |
| ACC-003 | Optional two-factor authentication | PLATFORM | Recovery codes, re-authentication and lost-device flow are tested. |
| ACC-004 | Terms, privacy and consent history | PLATFORM | Version, locale, timestamp and withdrawal effects are auditable. |
| ACC-005 | Age and adult-content policy | FUTURE | Jurisdiction, verification, privacy and content access require legal review. |
| ACC-006 | Profile and credential management | PLATFORM | Change email/password/profile with re-authentication and session controls. |
| ACC-007 | Account discovery policy | PLATFORM | Recovery avoids public account enumeration and exposes only safe hints. |
| ACC-008 | Application information and license notices | FOUNDATION | Version, terms, privacy, consent and third-party licenses are reachable. |

## Notifications and communication

| ID | Requirement | Tier | Acceptance direction |
| --- | --- | --- | --- |
| NTF-001 | Notification inbox | WORKSPACE | Read/unread, delete, mark-all-read and source link. |
| NTF-002 | Push notification delivery | WORKSPACE | Per-category settings, deduplication and quiet hours. |
| NTF-003 | Change notification timeline | PLATFORM | Traceable event source and access-controlled payloads. |
| NTF-004 | Chat notification inbox and leave-room control | PLATFORM | State consistent across devices. |
| NTF-005 | Donation, publishing and system notifications | FUTURE | Categories are independently configurable, deduplicated and deep-linked. |

## Collaboration

| ID | Requirement | Tier | Acceptance direction |
| --- | --- | --- | --- |
| COL-001 | Comments and mentions | PLATFORM | Permissions, notifications, resolution and history. |
| COL-002 | Chat and group chat | PLATFORM | Delivery state, moderation and leaving rooms. |
| COL-003 | Polls | PLATFORM | Eligibility, closing rules and auditable totals. |
| COL-004 | Page and workspace permissions | PLATFORM | Least privilege, inheritance visibility and revocation. |
| COL-005 | Activity timeline | PLATFORM | Filtered, retained and access-controlled. |
| COL-006 | Topic spaces, channels, roles and threads | FUTURE | Moderation, membership and per-channel permissions precede launch. |
| COL-007 | Voice/video, screen sharing and events | FUTURE | Consent, safety, capacity, recording and cost limits are explicit. |
| COL-008 | Workshops, mentoring and creator portfolios | FUTURE | Scheduling, payment, identity and dispute policies are separate requirements. |
| COL-009 | Document branching, review and merge workflow | FUTURE | Branch ownership, comparison, approval, conflict and audit rules are explicit. |
| COL-010 | Team dashboard and progress tracking | FUTURE | Aggregates authorized records with clear metric definitions. |
| COL-011 | Document locking | FUTURE | Lock scope, expiry, override and offline behavior prevent deadlocks/data loss. |
| COL-012 | Collaborative whiteboards and voting | FUTURE | Permissions, presence, result visibility and export are defined. |

## Publishing, blog and social

| ID | Requirement | Tier | Acceptance direction |
| --- | --- | --- | --- |
| PUB-001 | Publish selected pages as blog posts | PLATFORM | Private source remains private; publication is explicit and reversible. |
| PUB-002 | SEO, social preview and sharing | PLATFORM | Per-publication controls and standards-valid metadata. |
| PUB-003 | Scheduled publishing | PLATFORM | Time zone, retry, cancellation and audit history. |
| PUB-004 | Post, comment, follow, like, timeline and reshare | PLATFORM | Abuse controls and notification settings included. |
| PUB-005 | Revision visibility policy | PLATFORM | Social posts can enforce 30-minute edit rules; blogs remain editable. |
| PUB-006 | Series, subscriptions and site header | PLATFORM | Subscriber state and ordering are explicit. |
| PUB-007 | User grades, questions and requests | FUTURE | Moderation and permission model required first. |
| PUB-008 | User blog themes and subdomains | PLATFORM | Tenant isolation, safe themes and verified domain routing. |
| PUB-009 | Per-user advertising | FUTURE | Consent, policy compliance and private-data isolation. |
| PUB-010 | Drafts, previews and one-click note publication | PLATFORM | Publication shows an exact preview and never changes source visibility implicitly. |
| PUB-011 | Bookmarks and reader subscriptions/newsletters | PLATFORM | Consent, unsubscribe, delivery failure and export are supported. |
| PUB-012 | Privacy-aware readership analytics | PLATFORM | Bot rules, metric definitions, retention and opt-out are documented. |
| PUB-013 | Verified custom domains | PLATFORM | Ownership, TLS, renewal failure and safe removal are handled. |
| PUB-014 | Short posts, connected threads, mentions and hashtags | FUTURE | Length/edit rules, accessibility, abuse controls and canonical links are defined. |
| PUB-015 | Trending topics and community recommendations | FUTURE | Ranking is explainable, abuse-resistant and user-controllable. |
| PUB-016 | Public content calendar view | FUTURE | Scheduled/published states and time zones are distinct and accessible. |

## Guidance, support and commercial capabilities

| ID | Requirement | Tier | Acceptance direction |
| --- | --- | --- | --- |
| GDE-001 | Quest-style AI Mano guides | FUTURE | Separate guides for notes, support, blog, social and inquiries. |
| SUP-001 | Inquiry and support workflow | PLATFORM | Status, privacy, response history and abuse protection. |
| DON-001 | One-time and recurring donations | FUTURE | Payment provider, receipts, refunds and failure handling. |
| DON-002 | Donation messages, status, rankings and badges | FUTURE | Privacy settings and anti-abuse controls. |
| PAY-001 | Payments and refund policy | FUTURE | Legal, tax, store and provider review before implementation. |
| SAL-001 | Selling digital or service products | FUTURE | Separate commerce requirements and compliance review. |
| AI-001 | Provider-backed AI chat | FUTURE | Provider/API credential model, consent, retention and clear cost visibility. |
| AI-002 | AI conversation history and import/export | FUTURE | Deletion, portability and per-conversation privacy controls exist. |
| AI-003 | AI file analysis | FUTURE | Exact shared scope, size/type limits, retention and provider disclosure precede upload. |
| AI-004 | Prompt templates and model selection | FUTURE | Templates are editable; model capability/cost differences are visible. |
| DON-003 | Donation ranking and live status | FUTURE | Donor consent, anonymity, refunds and anti-fraud rules precede display. |
| PAY-002 | Subscriptions, currencies, invoices, promotions and failed-payment recovery | FUTURE | Tax, receipts, cancellation, retry and store/PG policies are approved. |
| PAY-003 | Membership tiers, entitlements and quotas | FUTURE | Limits are transparent, enforceable consistently and recover gracefully. |
| BUS-001 | Advertising and performance reporting | FUTURE | Consent, provider policy, placement, accessibility and privacy review required. |
| BUS-002 | Experiment and A/B-test framework | FUTURE | Consent, assignment, metric definition and safe rollback are required. |

## Historical milestone mapping

| Legacy label | Historical intent | Current interpretation |
| --- | --- | --- |
| m1 | Core folders, notes, editor, authentication | Foundation proof and daily-use editor |
| m2 | Settings, notifications, monitoring | Workspace reliability and operations |
| m3 | Donations, guides, inquiries, authentication maturity | Hosted-service platform work |
| m4 | Blog hosting | Publishing stage |
| m5 | Social reactions, chat, friends and subscriptions | Social stage |
| m6 | Advanced editor and AI | Workspace capability expansion |
| m7 | Sales | Future commercial stage |

## Unspecified requirements requiring later definition

- Exact viewer-mode behavior
- Editor preference inventory and defaults
- Resting-account time thresholds and legal jurisdiction
- Payment providers, currencies, taxes and refund periods
- Publication moderation, age restrictions and content policy
- Backup destinations, retention and recovery objectives
- Supported import/export formats and fidelity levels
