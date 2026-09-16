import type { PageTreeState, WorkspaceNode } from "@mano/editor-core";

export const TREE_STORAGE_KEY = "mano.workspace.tree";
const CURRENT_VERSION = 1;

interface StoredTree {
  readonly version: number;
  readonly tree: PageTreeState;
}

export type TreeLoadResult =
  | { readonly status: "empty"; readonly tree: PageTreeState }
  | { readonly status: "loaded"; readonly tree: PageTreeState }
  | { readonly status: "recovered"; readonly tree: PageTreeState; readonly reason: string };

const emptyTree = (): PageTreeState => ({ nodes: [] });

function isNode(value: unknown): value is WorkspaceNode {
  if (!value || typeof value !== "object") return false;
  const node = value as Record<string, unknown>;
  return typeof node.id === "string"
    && node.id.trim().length > 0
    && (node.kind === "folder" || node.kind === "page")
    && typeof node.title === "string"
    && node.title.trim().length > 0
    && (node.parentId === null || typeof node.parentId === "string")
    && Number.isInteger(node.order)
    && (node.order as number) >= 0
    && typeof node.trashed === "boolean";
}

function isValidTree(tree: unknown): tree is PageTreeState {
  if (!tree || typeof tree !== "object") return false;
  const nodes = (tree as { nodes?: unknown }).nodes;
  if (!Array.isArray(nodes) || !nodes.every(isNode)) return false;

  const byId = new Map(nodes.map((node) => [node.id, node]));
  if (byId.size !== nodes.length) return false;
  for (const node of nodes) {
    if (node.parentId === null) continue;
    const parent = byId.get(node.parentId);
    if (!parent || parent.kind !== "folder" || parent.id === node.id) return false;
    const visited = new Set<string>([node.id]);
    let current: WorkspaceNode | undefined = parent;
    while (current) {
      if (visited.has(current.id)) return false;
      visited.add(current.id);
      current = current.parentId === null ? undefined : byId.get(current.parentId);
      if (current === undefined && parent.parentId !== null && !byId.has(parent.parentId)) return false;
    }
  }

  const groups = new Map<string | null, number[]>();
  for (const node of nodes) {
    const orders = groups.get(node.parentId) ?? [];
    orders.push(node.order);
    groups.set(node.parentId, orders);
  }
  return [...groups.values()].every((orders) =>
    [...orders].sort((a, b) => a - b).every((order, index) => order === index),
  );
}

export function loadTree(storage: Pick<Storage, "getItem">): TreeLoadResult {
  try {
    const raw = storage.getItem(TREE_STORAGE_KEY);
    if (raw === null) return { status: "empty", tree: emptyTree() };
    const parsed = JSON.parse(raw) as Partial<StoredTree>;
    if (parsed.version !== CURRENT_VERSION) {
      return { status: "recovered", tree: emptyTree(), reason: "지원하지 않는 저장 버전입니다." };
    }
    if (!isValidTree(parsed.tree)) {
      return { status: "recovered", tree: emptyTree(), reason: "저장된 폴더 구조가 올바르지 않습니다." };
    }
    return { status: "loaded", tree: parsed.tree };
  } catch {
    return { status: "recovered", tree: emptyTree(), reason: "저장 데이터를 읽을 수 없습니다." };
  }
}

export function saveTree(storage: Pick<Storage, "setItem">, tree: PageTreeState): void {
  storage.setItem(TREE_STORAGE_KEY, JSON.stringify({ version: CURRENT_VERSION, tree } satisfies StoredTree));
}
