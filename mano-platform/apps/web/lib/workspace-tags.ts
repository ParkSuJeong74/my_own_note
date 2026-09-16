import { isNodeInTrash, type PageTreeState } from "@mano/editor-core";

import type { DocumentMap } from "./document-storage";

export interface WorkspaceTag {
  readonly key: string;
  readonly label: string;
  readonly pageIds: readonly string[];
}

export function extractTags(source: string): readonly string[] {
  const tags: string[] = [];
  const seen = new Set<string>();
  for (const match of source.matchAll(/(?:^|\s)#([\p{L}\p{N}_-]+)/gu)) {
    const label = match[1];
    if (!label) continue;
    const key = label.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(label);
  }
  return tags;
}

export function collectWorkspaceTags(tree: PageTreeState, documents: DocumentMap): readonly WorkspaceTag[] {
  const tags = new Map<string, { label: string; pageIds: string[] }>();
  for (const node of tree.nodes) {
    if (node.kind !== "page" || isNodeInTrash(tree, node.id)) continue;
    const source = documents[node.id]?.blocks.map((block) => block.text).join("\n") ?? "";
    for (const label of extractTags(source)) {
      const key = label.toLocaleLowerCase();
      const current = tags.get(key) ?? { label, pageIds: [] };
      current.pageIds.push(node.id);
      tags.set(key, current);
    }
  }
  return [...tags.entries()]
    .map(([key, value]) => ({ key, label: value.label, pageIds: value.pageIds }))
    .sort((left, right) => right.pageIds.length - left.pageIds.length || left.label.localeCompare(right.label));
}
