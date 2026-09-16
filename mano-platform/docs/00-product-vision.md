# Mano product vision

## Identity

**MyOwnNote → MyoNo → Mano**

- 나만의 노트, 마노
- 마노와 함께 시작하는 당신만의 특별한 기록
- Product domain: `mano.io.kr`

Mano is a personal workspace where a user builds their own system from pages, blocks, databases,
views, data sources, and actions. It must contain deep capabilities without making the empty-page
experience complicated.

## North star

> 필요한 기능은 모두 갖추되, 빈 페이지에서는 배우지 않고 바로 기록할 수 있다.

The product succeeds when a user can begin with plain text, then progressively turn the same space
into a checklist, calendar, ledger, knowledge base, publishing system, or operations dashboard
without asking developers to add a dedicated screen.

## Product stages

### Stage 1 — AI personal workspace

Pages, editor, structured data, files, drawing, offline sync, history, backup, import/export, search,
automation, and optional AI assistance. This stage must become dependable for daily personal use
before public social features begin.

### Stage 2 — Publishing and social

Explicitly selected pages can be published as blogs or social posts with reactions, subscriptions,
conversations, and community features. Private workspace data is never public by default.

## Principles

1. User data ownership comes before monetization.
2. Advanced capability uses progressive disclosure; it does not crowd the basic editor.
3. Templates create ordinary editable pages rather than permanent special screens.
4. Provider integrations supply data and actions; they do not dictate page layout.
5. Offline, sync, history, export, backup, and recovery are core editor requirements.
6. AI actions are scoped, previewable, reversible, and provider-independent.
7. Accessibility, keyboard navigation, touch, and stylus support are product contracts.
8. Stage 2 cannot weaken the privacy, security, or simplicity of Stage 1.

## Initial validation environments

| Environment | Primary use |
| --- | --- |
| Windows 11 desktop | Full editing, configuration, multi-panel workflows |
| macOS laptop | Full editing, development-friendly keyboard workflows |
| Android phone | Quick capture, search, viewing, completion, notifications |
| Android tablet | Editing, split view, touch and stylus workflows |
| Ubuntu home server | Storage, sync, jobs, monitoring, backup and recovery |

Responsive web and installable PWA are validated first. Native shells are introduced only when
offline storage, share targets, widgets, filesystem access, notifications, or stylus support require
platform APIs that the web cannot reliably provide.

