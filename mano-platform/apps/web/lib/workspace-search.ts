import { isNodeInTrash, type PageTreeState, type WorkspaceNode } from "@mano/editor-core";

import type { DocumentMap } from "./document-storage";

export interface SearchResult {
  readonly node: WorkspaceNode;
  readonly matchedBy: "title" | "body";
}

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("ko-KR");
}

function orderedActiveNodes(tree: PageTreeState): WorkspaceNode[] {
  const result: WorkspaceNode[] = [];
  function visit(parentId: string | null) {
    const children = tree.nodes
      .filter((node) => node.parentId === parentId && !isNodeInTrash(tree, node.id))
      .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));
    for (const child of children) {
      result.push(child);
      if (child.kind === "folder") visit(child.id);
    }
  }
  visit(null);
  return result;
}

export function searchWorkspace(
  tree: PageTreeState,
  documents: DocumentMap,
  rawQuery: string,
): SearchResult[] {
  const query = normalize(rawQuery.trim());
  if (query.length === 0) return [];

  return orderedActiveNodes(tree).flatMap((node): SearchResult[] => {
    if (normalize(node.title).includes(query)) return [{ node, matchedBy: "title" }];
    if (node.kind !== "page") return [];
    const document = documents[node.id];
    const body = document?.blocks.map((block) => block.text).join("\n") ?? "";
    return normalize(body).includes(query) ? [{ node, matchedBy: "body" }] : [];
  });
}
