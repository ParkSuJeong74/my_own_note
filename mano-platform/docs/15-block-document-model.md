# Block document model

## Initial envelope

```json
{
  "schemaVersion": 1,
  "blocks": [
    { "id": "uuid", "type": "heading", "level": 2, "text": "제목" },
    { "id": "uuid", "type": "paragraph", "text": "본문" },
    { "id": "uuid", "type": "checklist", "checked": false, "text": "할 일" }
  ]
}
```

Block IDs are stable UUIDs and unique inside a document. Array order is authoritative. Paragraphs
have only text, headings require level 1–3, and checklists require a boolean completion value.
Unknown block types and properties fail closed until a newer schema version explicitly supports them.

## Limits and revisions

- Maximum 10,000 blocks per document.
- Maximum 1 MiB UTF-8 text per block and 5 MiB encoded envelope per document.
- A document may be empty.
- Current documents and immutable revisions store the same validated envelope and SHA-256 hash of a
  deterministic canonical encoding.
- Updates carry `baseRevision` and replace the complete envelope in v1. A stale base returns a
  conflict; it is never silently merged.

## Extension rules

New block types need a product requirement, accessibility behavior, JSON schema, import/export rules,
size limits, migrations, and failure tests. Tables, media, code, formulas, databases, embeds, and
widgets must not be represented as an unvalidated generic property bag.

## Markdown boundary

Markdown import creates new block UUIDs and returns warnings for unsupported syntax. Markdown export
preserves supported text structures and reports any block that cannot round-trip. JSON backup remains
the lossless portable format.

