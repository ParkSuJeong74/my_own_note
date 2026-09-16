# LEG-0003 intake analysis

## Provenance

- Received: 2026-09-16
- Sources: user-provided “노트 앱 → 블로그 → SNS 단계별 기획서” and attached
  `pasted-text.txt` (1,553 lines)
- Source location at intake:
  `/Users/sujeongpark/.codex/attachments/72682523-57b8-4439-b583-b03bae4c2408/pasted-text.txt`
- Decision: extract product intent; retain implementation sketches as candidates only.

The attachment location is not portable and is not a long-term source of truth. This analysis,
the requirements catalog, stage plan, technology register and error contract are the portable
record. No secrets or production data were found in the supplied text. Linked third-party pages
and fonts still require license and availability review before use.

## Product intent preserved

- Begin as a reliable personal writing and knowledge workspace.
- Let a private note become an explicitly published blog post without duplicating the authoring
  workflow.
- Add social and community capabilities only after publishing has real usage.
- Serve writers as a first-class audience through goals, word counts, chapters, characters and
  plot notes, while remaining useful for study, work, diaries and hobbies.
- Support web, desktop and mobile over time, with offline work and cross-device synchronization.
- Keep hosting optional: a user must be able to use the private workspace without becoming a
  publisher or social-network participant.

## Newly extracted concerns

- Account lifecycle: email verification, OAuth, recovery, optional 2FA, export and deletion.
- Legal and trust: terms/privacy consent, regional privacy review, age/adult-content policy,
  license inventory and retention-driven deletion jobs.
- Publishing: custom domains, themes, newsletters, reader analytics and scheduled publication.
- Community: servers/spaces, channels, roles, threads, events, voice/video and moderation.
- Operations: observable scheduled work, backup restore tests, audit trails and performance budgets.
- Stable client/server error codes with localized user messages and deliberate alerting rules.

## Historical implementation sketches — not decisions

The source proposes or alternates among Nx and Turborepo; React Query and Zustand/Jotai; Next.js,
React Native, Electron and NestJS; TypeORM; MariaDB/PostgreSQL, MongoDB, Redis/Valkey;
RabbitMQ; Elasticsearch; Airflow/Temporal; Directus; Supabase, Railway, Vercel and AWS; and a broad
observability/security toolset. It also sketches a multi-database ERD, microservices topology and
REST endpoints.

None is approved by extraction. Adopting the whole set would create operational cost before the
single-user editor is proven. Each choice must be driven by an accepted requirement and ADR.

## Contradictions and cautions

- The source mentions both Nx and Turborepo. The repository currently uses only pnpm workspaces and
  must not add an orchestrator without measured need.
- Editor candidates conflict: Lexical appears in planning while Remirror/ProseMirror appears in the
  attachment. The document model and offline guarantees must be prototyped before selection.
- Database candidates conflict (MariaDB, PostgreSQL, MongoDB). Splitting note metadata and content
  across databases is not justified yet and increases transactional/recovery complexity.
- “Git-style conflict resolution” and CRDT/OT are different models. User-visible conflict behavior
  must be specified before choosing either.
- WebView access to third-party AI websites may violate provider policy, produce fragile sessions,
  and expose user content. It is not an approved integration design.
- Ad-block circumvention is rejected as a product requirement. Advertising must respect platform,
  consent and provider policies.
- Client-supplied error messages cannot be trusted as server diagnostics. Machine codes and server
  telemetry must remain separate from localized presentation.
- MAU and revenue figures are hypotheses, not delivery promises. Instrumentation and privacy rules
  must exist before they can be used as gates.

## Deferred design artifacts

The historical ERD and API list are useful vocabulary, not executable contracts. Before schema or
endpoint implementation, create ADRs for identity, document model, offline operation log,
publication snapshots, media lifecycle and account deletion. Contracts then live in
`packages/contracts` and receive compatibility tests.
