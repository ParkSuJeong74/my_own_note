# Technology candidate register

## Rule

This document records candidates, not a shopping list. A technology is adopted only when an ADR
names the requirement it satisfies, simpler alternatives, operational cost, migration/exit plan and
verification. “Used in the legacy plan” is never sufficient justification.

## Current foundation

| Area | Current state | Rationale |
| --- | --- | --- |
| Language/package boundary | TypeScript-oriented pnpm workspace | Shared contracts and later extraction; framework-neutral today. |
| Task orchestration | Plain pnpm scripts | Eight small workspaces do not yet justify Nx or Turborepo. |
| Runtime baseline | Node.js 22 | Declared by the repository; pinning file/CI image follows with the first scaffold ADR. |
| Applications | `web`, `api`, `worker` placeholders | Smallest boundaries covering interactive UI, durable API and background work. |
| Web framework | Next.js App Router with React | Selected in ADR 0002 for private interaction plus future public rendering/metadata. |

## Evaluation order

1. Document model and editor spike: compare the minimum credible editor engines against Markdown
   fidelity, block extensibility, IME, accessibility, large documents, offline operation encoding and
   serialization stability.
2. Local durability and sync spike: define operation identity, ordering, retries, idempotency and
   conflicts before selecting CRDT/OT, WebSocket or server storage.
3. Web/API scaffold: choose framework, validation, test and observability basics after contracts are
   known.
4. Desktop/mobile packaging: start with PWA evidence; add Electron/Tauri or native shells only for
   capabilities the web cannot reliably provide.
5. Publishing and multi-user infrastructure: only after the private workspace readiness gate.

## Legacy candidates by area

| Area | Candidates found | Status / question |
| --- | --- | --- |
| Monorepo | pnpm, Nx, Turborepo, Changesets | pnpm retained; others deferred until measurable need. |
| Web | Next.js, React, Tailwind, shadcn/ui, TanStack Query | Next.js and React selected; styling kit and server-cache library remain undecided. |
| State | Jotai, Zustand | Candidate; distinguish durable document state, server cache and view state. |
| Editor | Lexical, Remirror/ProseMirror, Monaco for code | Prototype required; no selection. |
| Mobile | React Native + Expo | Deferred; PWA capability gap must be documented first. |
| Desktop | Electron | Deferred; evaluate footprint, updates, filesystem and security against alternatives. |
| API | NestJS, REST, GraphQL | Candidate; begin with minimal contract surface. |
| Persistence | PostgreSQL/MariaDB, MongoDB, IndexedDB, WatermelonDB | No selection; prefer the fewest stores that meet offline and query needs. |
| Realtime/cache | WebSocket, SSE, Redis/Valkey, CRDT/OT | Delivery semantics and conflict UX first. |
| Jobs/queue | Worker, RabbitMQ, Airflow, Temporal | Start in-process or database-backed if reliable; add infrastructure by evidence. |
| Search | database search, Elasticsearch | External search deferred until corpus/latency measurements demand it. |
| Files | S3-compatible storage, MinIO, Supabase Storage | Candidate with lifecycle, quota, scanning and backup requirements. |
| Operations | OpenTelemetry, Prometheus, Loki, Grafana, Tempo | Add incrementally with service maturity and retention budgets. |
| Delivery | Docker, GitHub Actions, Vercel, Railway, Supabase, AWS | No production target selected. Portability remains required. |
| Security | Vault, ZAP, Snyk, SonarQube | Practices and threat model first; tools selected through CI/ops ADRs. |

## Explicit non-decisions

- No microservices mandate.
- No multi-database mandate.
- No Kubernetes mandate.
- No native application mandate.
- No third-party AI WebView integration.
- No message queue merely to deliver UI notifications.
- No deployment provider or production topology has been selected.
