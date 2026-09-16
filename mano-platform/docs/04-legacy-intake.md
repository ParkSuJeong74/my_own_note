# Legacy intake process

## Purpose

Legacy files, mockups, requirements and code will arrive incrementally. Intake preserves provenance
without copying accidental architecture into the new platform.

## Intake record

For each source, add an entry to `docs/legacy/inventory.md` with:

- stable intake ID;
- source name and original location;
- date received;
- artifact type;
- product intent and relevant requirement IDs;
- data or behavior that must be preserved;
- obsolete assumptions or contradictions;
- security, privacy, license and secret review;
- decision: reference, extract, migrate, rewrite, archive, or reject;
- destination ADR, requirement, test, or migration document.

## Rules

1. Do not paste secrets, real personal data, production exports or paid assets into Git.
2. Binary mockups and licensed fonts require a license note before inclusion.
3. Legacy source does not enter an application package until its behavior is specified and tested.
4. Duplicate requirements retain all source links but have one canonical requirement ID.
5. Contradictions remain visible until an ADR resolves them.
6. Historical milestones do not silently become current delivery dates.
7. Imported data requires counts, checksums where appropriate, dry-run output and rollback.

## Suggested staging

Place reviewable text under `docs/legacy/sources/`. Keep large or sensitive artifacts outside Git and
record their controlled location in the inventory. After a decision, link the canonical document and
retain the source for traceability unless its license or privacy policy requires removal.

