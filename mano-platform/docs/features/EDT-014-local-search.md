# EDT-014 — Local title and body search

## Purpose

Make the growing personal workspace navigable without adding a server search engine or indexing
private content outside the browser.

## Requirements

- Search active folder/page titles and all text-bearing blocks in active page documents.
- Matching is case-insensitive and Unicode-normalized; surrounding query whitespace is ignored.
- Empty/whitespace-only query returns no search mode and shows the ordinary tree.
- Directly or indirectly trashed nodes and their documents never appear in results.
- Results preserve deterministic tree order and identify folder, title match or body match.
- Selecting a result opens the same folder/page workspace view and clears the query.
- A no-results state is announced without changing workspace data.
- Search runs locally and never transmits content.

## Boundaries and exceptions

- This first implementation scans in-memory data and is intended for the small personal MVP.
- Ranking, fuzzy matching, snippets, search history, filters and large-corpus indexing are deferred.
- Text in future attachments/OCR is not searched yet.

## Verification

- Title and body matches, Korean/Latin case normalization and surrounding whitespace.
- Folder results and multi-block body results.
- Exclusion of directly and indirectly trashed content.
- Empty and no-result behavior, deterministic order and UI result navigation.
- Full tests, typecheck and production build pass.

On 2026-09-16, five search-domain tests and three search UI tests passed as part of 86 total tests,
followed by strict type checking and a Next.js production build on Node.js 22.
