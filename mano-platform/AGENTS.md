# Mano Platform working rules

- Treat this directory as an independently extractable repository.
- Never import source or configuration from a parent directory.
- Update the relevant product, architecture, or ADR document before implementation.
- Reference stable requirement IDs in implementation plans and tests.
- Do not select a framework, editor engine, database layer, realtime algorithm, queue, or native shell
  without an accepted ADR.
- Every code change requires normal, failure, boundary, and regression tests appropriate to its risk.
- Preserve legacy provenance through `docs/legacy/inventory.md`; do not copy secrets or personal data.
- Do not perform deployment, production migration, commit, or push without explicit current approval.
