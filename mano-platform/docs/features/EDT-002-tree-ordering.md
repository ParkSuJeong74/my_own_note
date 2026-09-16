# EDT-002 — Deterministic tree ordering

## Purpose

Give every folder and page a deterministic position among siblings so the sidebar can later render
and persist drag-and-drop ordering consistently.

## Requirements

- New nodes are appended after existing siblings under the same parent.
- Root nodes and each folder's children have independent zero-based ordering.
- A node can be reordered only within its current parent.
- Reorder indices outside `0..siblingCount - 1` are rejected.
- Moving a node to another parent appends it there and compacts the source sibling order.
- Ordering includes trashed siblings so restore does not silently replace another node's position.
- Trashed/effectively trashed nodes cannot be reordered.
- Commands remain immutable and return typed errors on failure.

## Impact and deferred behavior

- `WorkspaceNode.order` becomes part of the framework-independent tree state.
- Pointer/keyboard drag UI and persistence are deferred.
- Concurrent reorder conflict behavior belongs to the later synchronization feature.

## Verification

- Normal: append root/child nodes, reorder first/middle/last, move and append across parents.
- Failure: negative/overflow index, missing node and trashed node.
- Boundary: single sibling and no-op reorder.
- Regression: unique contiguous sibling order after reorder/move; input state stays unchanged.
