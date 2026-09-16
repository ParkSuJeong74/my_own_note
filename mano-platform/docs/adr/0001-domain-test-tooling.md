# ADR 0001 — Domain TypeScript and test tooling

## Status

Accepted for framework-independent domain packages.

## Context and constraints

The first feature is pure domain logic in `packages/editor-core`. It needs strict static checking and
fast deterministic tests without selecting a web framework, editor engine, database or runtime
service architecture. Node.js 22 and pnpm are already repository baselines.

## Considered options

1. Node's built-in test runner with JavaScript: minimal dependencies but no direct strict TypeScript
   verification for production source.
2. Node's experimental TypeScript stripping: runtime support varies across Node 22 patch versions
   and still requires a checker.
3. TypeScript plus Vitest: small development-only dependency set, direct TypeScript tests and later
   compatibility with browser-oriented packages.

## Decision

Use TypeScript for domain source and Vitest for unit tests. Keep tooling at the repository root and
package scripts explicit. This decision does not select any application framework.

## Consequences and risks

- Dependency installation is required for tests and type checking.
- Vitest configuration should stay minimal so it can be replaced without changing domain code.
- Root checks become real lint-free type/test/build verification instead of shape validation alone.

## Rollback or replacement path

Domain source contains no Vitest imports. Tests can move to another runner, and TypeScript can emit
with another build tool, without changing public operations.

## Validation evidence

On 2026-09-16, a Node.js 22 container completed repository validation, strict type checking, five
page-tree unit tests and the TypeScript build through `pnpm check`.
