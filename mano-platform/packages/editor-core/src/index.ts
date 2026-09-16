export type WorkspaceNodeKind = "folder" | "page";

export * from "./document.js";

export interface WorkspaceNode {
  readonly id: string;
  readonly kind: WorkspaceNodeKind;
  readonly title: string;
  readonly parentId: string | null;
  readonly order: number;
  readonly trashed: boolean;
}

export interface PageTreeState {
  readonly nodes: ReadonlyArray<WorkspaceNode>;
}

export type PageTreeErrorCode =
  | "DUPLICATE_NODE_ID"
  | "EMPTY_NODE_ID"
  | "EMPTY_NODE_TITLE"
  | "INVALID_PARENT_KIND"
  | "MOVE_CYCLE"
  | "NODE_IN_TRASH"
  | "NODE_NOT_FOUND"
  | "NODE_NOT_TRASHED"
  | "PARENT_NOT_FOUND"
  | "REORDER_INDEX_OUT_OF_RANGE";

export class PageTreeError extends Error {
  public constructor(
    public readonly code: PageTreeErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PageTreeError";
  }
}

export interface CreateNodeInput {
  readonly id: string;
  readonly kind: WorkspaceNodeKind;
  readonly title: string;
  readonly parentId?: string | null;
}

function normalizeRequired(value: string, code: "EMPTY_NODE_ID" | "EMPTY_NODE_TITLE"): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new PageTreeError(code, code === "EMPTY_NODE_ID" ? "Node ID is required." : "Node title is required.");
  }
  return normalized;
}

function findNode(state: PageTreeState, id: string): WorkspaceNode | undefined {
  return state.nodes.find((node) => node.id === id);
}

function requireNode(state: PageTreeState, id: string): WorkspaceNode {
  const node = findNode(state, id);
  if (!node) throw new PageTreeError("NODE_NOT_FOUND", `Node '${id}' was not found.`);
  return node;
}

function requireFolder(state: PageTreeState, parentId: string): WorkspaceNode {
  const parent = findNode(state, parentId);
  if (!parent) throw new PageTreeError("PARENT_NOT_FOUND", `Parent '${parentId}' was not found.`);
  if (parent.kind !== "folder") {
    throw new PageTreeError("INVALID_PARENT_KIND", `Parent '${parentId}' must be a folder.`);
  }
  if (isNodeInTrash(state, parentId)) {
    throw new PageTreeError("NODE_IN_TRASH", `Parent '${parentId}' is in trash.`);
  }
  return parent;
}

export function isNodeInTrash(state: PageTreeState, nodeId: string): boolean {
  let current: WorkspaceNode | undefined = requireNode(state, nodeId);
  const visited = new Set<string>();

  while (current) {
    if (current.trashed) return true;
    if (current.parentId === null) return false;
    if (visited.has(current.id)) {
      throw new PageTreeError("MOVE_CYCLE", "The existing tree contains a parent cycle.");
    }
    visited.add(current.id);
    current = requireNode(state, current.parentId);
  }
  return false;
}

function requireActiveNode(state: PageTreeState, nodeId: string): WorkspaceNode {
  const node = requireNode(state, nodeId);
  if (isNodeInTrash(state, nodeId)) {
    throw new PageTreeError("NODE_IN_TRASH", `Node '${nodeId}' is in trash.`);
  }
  return node;
}

function orderedSiblings(
  state: PageTreeState,
  parentId: string | null,
  excludedId?: string,
): WorkspaceNode[] {
  return state.nodes
    .filter((node) => node.parentId === parentId && node.id !== excludedId)
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
}

function compactOrders(nodes: ReadonlyArray<WorkspaceNode>): WorkspaceNode[] {
  const groups = new Map<string | null, WorkspaceNode[]>();
  for (const node of nodes) {
    const siblings = groups.get(node.parentId) ?? [];
    siblings.push(node);
    groups.set(node.parentId, siblings);
  }

  const orderById = new Map<string, number>();
  for (const siblings of groups.values()) {
    siblings
      .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
      .forEach((node, index) => orderById.set(node.id, index));
  }
  return nodes.map((node) => ({ ...node, order: orderById.get(node.id)! }));
}

export function createNode(state: PageTreeState, input: CreateNodeInput): PageTreeState {
  const id = normalizeRequired(input.id, "EMPTY_NODE_ID");
  const title = normalizeRequired(input.title, "EMPTY_NODE_TITLE");
  if (findNode(state, id)) throw new PageTreeError("DUPLICATE_NODE_ID", `Node '${id}' already exists.`);

  const parentId = input.parentId ?? null;
  if (parentId !== null) requireFolder(state, parentId);
  const order = orderedSiblings(state, parentId).length;

  return {
    nodes: [...state.nodes, { id, kind: input.kind, title, parentId, order, trashed: false }],
  };
}

export function renameNode(state: PageTreeState, nodeId: string, title: string): PageTreeState {
  requireActiveNode(state, nodeId);
  const normalizedTitle = normalizeRequired(title, "EMPTY_NODE_TITLE");
  return {
    nodes: state.nodes.map((node) => node.id === nodeId ? { ...node, title: normalizedTitle } : node),
  };
}

export function moveNode(
  state: PageTreeState,
  nodeId: string,
  targetParentId: string | null,
): PageTreeState {
  const node = requireActiveNode(state, nodeId);
  if (targetParentId !== null) requireFolder(state, targetParentId);

  if (node.kind === "folder" && targetParentId !== null) {
    let currentId: string | null = targetParentId;
    const visited = new Set<string>();
    while (currentId !== null) {
      if (currentId === nodeId) {
        throw new PageTreeError("MOVE_CYCLE", `Folder '${nodeId}' cannot be moved into itself or its descendant.`);
      }
      if (visited.has(currentId)) {
        throw new PageTreeError("MOVE_CYCLE", "The existing tree contains a parent cycle.");
      }
      visited.add(currentId);
      currentId = requireNode(state, currentId).parentId;
    }
  }

  if (node.parentId === targetParentId) return state;

  const sourceOrder = new Map(
    orderedSiblings(state, node.parentId, nodeId).map((sibling, index) => [sibling.id, index]),
  );
  const targetSiblings = orderedSiblings(state, targetParentId, nodeId);
  const targetOrder = new Map(targetSiblings.map((sibling, index) => [sibling.id, index]));

  return {
    nodes: state.nodes.map((candidate) => {
      if (candidate.id === nodeId) {
        return { ...candidate, parentId: targetParentId, order: targetSiblings.length };
      }
      if (candidate.parentId === node.parentId && sourceOrder.has(candidate.id)) {
        return { ...candidate, order: sourceOrder.get(candidate.id)! };
      }
      if (candidate.parentId === targetParentId && targetOrder.has(candidate.id)) {
        return { ...candidate, order: targetOrder.get(candidate.id)! };
      }
      return candidate;
    }),
  };
}

export function reorderNode(state: PageTreeState, nodeId: string, targetIndex: number): PageTreeState {
  const node = requireActiveNode(state, nodeId);
  const siblings = orderedSiblings(state, node.parentId);
  if (!Number.isInteger(targetIndex) || targetIndex < 0 || targetIndex >= siblings.length) {
    throw new PageTreeError(
      "REORDER_INDEX_OUT_OF_RANGE",
      `Reorder index '${targetIndex}' is outside the sibling range.`,
    );
  }

  const reordered = siblings.filter((sibling) => sibling.id !== nodeId);
  reordered.splice(targetIndex, 0, node);
  const orderById = new Map(reordered.map((sibling, index) => [sibling.id, index]));

  return {
    nodes: state.nodes.map((candidate) =>
      candidate.parentId === node.parentId && orderById.has(candidate.id)
        ? { ...candidate, order: orderById.get(candidate.id)! }
        : candidate,
    ),
  };
}

export function trashNode(state: PageTreeState, nodeId: string): PageTreeState {
  const node = requireActiveNode(state, nodeId);
  return {
    nodes: state.nodes.map((candidate) =>
      candidate.id === node.id ? { ...candidate, trashed: true } : candidate,
    ),
  };
}

export function restoreNode(state: PageTreeState, nodeId: string): PageTreeState {
  const node = requireNode(state, nodeId);
  if (!node.trashed) {
    throw new PageTreeError("NODE_NOT_TRASHED", `Node '${nodeId}' was not directly moved to trash.`);
  }

  let ancestorId = node.parentId;
  while (ancestorId !== null) {
    const ancestor = requireNode(state, ancestorId);
    if (ancestor.trashed) {
      throw new PageTreeError("NODE_IN_TRASH", `Restore trashed ancestor '${ancestor.id}' first.`);
    }
    ancestorId = ancestor.parentId;
  }

  return {
    nodes: state.nodes.map((candidate) =>
      candidate.id === node.id ? { ...candidate, trashed: false } : candidate,
    ),
  };
}

export function deleteNodePermanently(state: PageTreeState, nodeId: string): PageTreeState {
  const node = requireNode(state, nodeId);
  if (!node.trashed) {
    throw new PageTreeError("NODE_NOT_TRASHED", `Node '${nodeId}' must be directly trashed before deletion.`);
  }

  const deletedIds = new Set<string>([nodeId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const candidate of state.nodes) {
      if (candidate.parentId !== null && deletedIds.has(candidate.parentId) && !deletedIds.has(candidate.id)) {
        deletedIds.add(candidate.id);
        changed = true;
      }
    }
  }

  return { nodes: compactOrders(state.nodes.filter((candidate) => !deletedIds.has(candidate.id))) };
}
