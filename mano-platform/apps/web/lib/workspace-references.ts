import { isNodeInTrash, type PageTreeState, type WorkspaceNode } from "@mano/editor-core";

import type { DocumentMap } from "./document-storage";

export interface PageReferences {
  readonly outgoing: readonly WorkspaceNode[];
  readonly backlinks: readonly WorkspaceNode[];
  readonly unresolved: readonly string[];
}

export function extractReferenceTitles(source: string): readonly string[] {
  const titles: string[] = [];
  const seen = new Set<string>();
  for (const match of source.matchAll(/\[\[([^\[\]\n]+)\]\]/g)) {
    const title = match[1]?.trim();
    if (!title) continue;
    const key = title.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    titles.push(title);
  }
  return titles;
}

function documentText(documents: DocumentMap, pageId: string): string {
  return documents[pageId]?.blocks.map((block) => block.text).join("\n") ?? "";
}

export function collectPageReferences(tree: PageTreeState, documents: DocumentMap, pageId: string): PageReferences {
  const pages = tree.nodes.filter((node) => node.kind === "page" && !isNodeInTrash(tree, node.id));
  const byTitle = new Map<string, WorkspaceNode[]>();
  for (const page of pages) {
    const key = page.title.trim().toLocaleLowerCase();
    byTitle.set(key, [...(byTitle.get(key) ?? []), page]);
  }

  const outgoing: WorkspaceNode[] = [];
  const unresolved: string[] = [];
  for (const title of extractReferenceTitles(documentText(documents, pageId))) {
    const matches = byTitle.get(title.toLocaleLowerCase()) ?? [];
    if (matches.length === 1 && matches[0]?.id !== pageId) outgoing.push(matches[0]!);
    else if (matches.length !== 1) unresolved.push(title);
  }

  const current = pages.find((page) => page.id === pageId);
  const currentTitleMatches = current === undefined ? [] : byTitle.get(current.title.trim().toLocaleLowerCase()) ?? [];
  const backlinks = current === undefined || currentTitleMatches.length !== 1 ? [] : pages.filter((page) => page.id !== pageId
    && extractReferenceTitles(documentText(documents, page.id)).some((title) => title.toLocaleLowerCase() === current.title.trim().toLocaleLowerCase()));
  return { outgoing, backlinks, unresolved };
}
