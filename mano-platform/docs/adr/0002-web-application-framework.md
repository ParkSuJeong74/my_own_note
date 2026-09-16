# ADR 0002 — Web application framework

## Status

Accepted for the responsive web application.

## Context and constraints

Mano needs a highly interactive private editor now and server/static rendering for public blog pages
later. It must support TypeScript, accessible React components, route-level loading/error handling,
metadata and multiple deployment targets. The API remains a separate workspace so the web framework
does not own durable domain data.

## Considered options

1. React with a client-only Vite application: simple for the private editor, but public blog
   rendering, metadata and routing would need a second rendering solution.
2. Next.js App Router: supports interactive client components together with server/static-rendered
   routes and metadata. It adds framework conventions and version coupling.
3. Separate private-editor and publishing frontends immediately: strong isolation but duplicates
   foundations before either experience is proven.

## Decision

Use Next.js App Router with React and TypeScript for `apps/web`. Keep domain logic in workspace
packages and keep the service API independent. Start with ordinary CSS and accessible HTML; a UI
kit or styling framework requires separate evidence and is not selected here.

The initial shell is server-rendered and has explicit metadata. Interactive editor surfaces will be
small client components. Static export remains an option for local-only builds, but is not mandated
because later authenticated and public routes may require different rendering strategies.

## Consequences and risks

- Public publishing can use framework metadata and pre-rendering without replacing the private UI.
- Client-only browser APIs such as local persistence stay behind client component boundaries.
- Next.js upgrades require build and route regression tests.
- Offline/PWA behavior is not provided automatically and remains a separate ADR.

## Rollback or replacement path

Domain packages contain no Next.js imports. A replacement web client can reuse contracts and core
operations. Public and private route groups can also be split into separate applications later.

## Validation evidence

On 2026-09-16, Node.js 22 validation completed strict type checking, two shell component tests and a
Next.js production build. The root route and not-found route were statically pre-rendered.

## References

- [Next.js documentation](https://nextjs.org/docs)
- [Next.js backend-for-frontend and export guidance](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [React installation guidance](https://react.dev/learn/installation)
