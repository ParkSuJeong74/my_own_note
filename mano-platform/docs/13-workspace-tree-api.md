# Workspace authorization and tree API

## Purpose

Implement the second backend slice: membership-scoped workspace authorization and a consistent tree
snapshot for `GET /v1/workspaces/{workspaceId}/tree`.

## Requirements

- A verified identity is mapped through `/v1/me` bootstrap before workspace access.
- Every tree query requires an active `workspace_members` row for the resolved principal.
- Missing workspaces and unauthorized workspaces return the same `NOT_FOUND` response so UUID probing
  cannot reveal tenant existence.
- Workspace IDs must be canonical UUIDs and invalid path identifiers fail before storage access.
- The response contains `workspaceRevision` plus active and trashed nodes; document bodies are not
  embedded.
- Tree responses use `Cache-Control: no-store` until membership-aware ETags are implemented.

## Schema impact

Migration `0002_nodes.sql` adds the workspace revision and `nodes`. Composite foreign keys keep
parent and child in the same workspace. Check constraints enforce kind, title, position and revision
boundaries. Page-parent and cycle validation remain mandatory in the upcoming mutation transaction;
the read slice does not weaken those requirements.

## Verification

- Handler tests cover authenticated success, malformed workspace IDs, and indistinguishable missing
  or unauthorized workspaces.
- Repository tests verify that membership is part of the metadata query and that node loading is
  parameterized by the authorized workspace.
- Existing authentication, bootstrap, editor and browser regression suites continue to pass.

