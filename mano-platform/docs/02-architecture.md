# Architecture and extraction boundary

## Goal

`mano-platform` is a self-contained monorepo inside `my_own_note` during incubation. It must be
extractable into an independent Git repository and deployable service without importing source,
configuration, databases, or secrets from the parent repository.

## Repository boundary rules

1. All source, tests, documentation, scripts, deployment manifests and examples live under this folder.
2. No package may use relative imports that escape the repository root.
3. No runtime dependency may read the parent `mano-admin` database directly.
4. Legacy integration occurs through documented adapters, APIs, exports, or migration snapshots.
5. Environment variables use the `MANO_` prefix and are documented in `.env.example`.
6. Generated state, secrets and uploaded files are never committed.
7. The monorepo owns its package manager version, TypeScript base config and CI commands.

## Planned workspace layout

```text
mano-platform/
├── apps/
│   ├── web/            # Responsive web/PWA editor and workspace UI
│   ├── api/            # Auth, pages, blocks, databases, sync and public API
│   └── worker/         # OCR, imports, exports, media, backup and scheduled jobs
├── packages/
│   ├── contracts/      # Versioned API/event schemas and shared domain identifiers
│   ├── editor-core/    # Framework-light editor commands and document operations
│   ├── sync-core/      # Offline log, conflict and reconciliation primitives
│   ├── ui/             # Accessible design-system components and tokens
│   └── config/         # Shared lint, TypeScript and test configuration
├── docs/               # Product, architecture, ADRs and legacy intake
├── infra/              # Local and deployable infrastructure owned by this service
└── scripts/            # Repository-local validation, generation and migration tools
```

Directories are created now; application frameworks are selected through ADRs before dependency
installation. This avoids turning a framework preference into an undocumented product constraint.

## Initial bounded contexts

- Identity and access
- Workspace and page tree
- Editor document and block operations
- Database schemas, records and saved views
- Files and media
- Search and indexing
- Offline operation log and synchronization
- Revision history, backup and restore
- Notifications
- Integrations and automation
- Publishing and social (inactive until Stage 2)
- Billing and donations (inactive until commercial review)

## Data and event contracts

- API and event contracts belong in `packages/contracts` and are versioned before consumers ship.
- Durable mutations use idempotency keys and explicit revision or operation identifiers.
- Realtime delivery never becomes the only persistence path.
- Events contain stable identifiers and minimal necessary data; consumers fetch authorized detail.
- Offline clients keep an operation log rather than pretending network writes succeeded.
- Conflict behavior is specified per operation before choosing CRDT, OT, or server arbitration.

## Technology decisions still open

- Editor engine (the web framework is Next.js App Router per ADR 0002)
- API framework and database layer
- Relational schema versus hybrid document storage boundaries
- Local client database and service-worker strategy
- Search engine progression
- Object storage and media processing
- Realtime transport and collaboration algorithm
- Queue/broker necessity and operational ownership
- Desktop/mobile shell strategy

Each choice receives an ADR with problem, constraints, options, decision, consequences, rollback,
and validation evidence.
