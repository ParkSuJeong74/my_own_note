export const workspaceBlockTypes = ["PARAGRAPH", "HEADING", "BULLETED_LIST", "NUMBERED_LIST", "TODO", "DIVIDER", "CALLOUT", "CHILD_PAGE"] as const;
export type WorkspaceBlockType = typeof workspaceBlockTypes[number];

export type WorkspaceBlockContent = {
  text?: string;
  level?: 1 | 2 | 3;
  checked?: boolean;
  color?: "default" | "green" | "yellow" | "red" | "blue" | "purple";
  pageId?: string;
};

export type WorkspacePageNode<T extends { id: string; parentId: string | null }> = T & { children: WorkspacePageNode<T>[] };

export function buildWorkspacePageTree<T extends { id: string; parentId: string | null }>(pages: T[]): WorkspacePageNode<T>[] {
  const nodes = new Map(pages.map(item => [item.id, { ...item, children: [] } as WorkspacePageNode<T>]));
  const roots: WorkspacePageNode<T>[] = [];
  for (const item of pages) {
    const node = nodes.get(item.id)!;
    const parent = item.parentId ? nodes.get(item.parentId) : undefined;
    if (parent && parent.id !== node.id) parent.children.push(node); else roots.push(node);
  }
  return roots;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const textTypes = new Set<WorkspaceBlockType>(["PARAGRAPH", "HEADING", "BULLETED_LIST", "NUMBERED_LIST", "TODO", "CALLOUT"]);
const colors = new Set(["default", "green", "yellow", "red", "blue", "purple"]);

export function validateWorkspaceBlockContent(type: WorkspaceBlockType, value: unknown): WorkspaceBlockContent {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Block content must be an object");
  const input = value as Record<string, unknown>;
  const allowed = new Set(type === "HEADING" ? ["text", "level"] : type === "TODO" ? ["text", "checked"] : type === "CALLOUT" ? ["text", "color"] : type === "CHILD_PAGE" ? ["pageId"] : type === "DIVIDER" ? [] : ["text"]);
  if (Object.keys(input).some(key => !allowed.has(key))) throw new Error("Block content contains unsupported fields");
  if (textTypes.has(type) && (typeof input.text !== "string" || input.text.length > 20_000)) throw new Error("Block text is required and must be at most 20000 characters");
  if (type === "HEADING" && ![1, 2, 3].includes(Number(input.level))) throw new Error("Heading level must be 1, 2, or 3");
  if (type === "TODO" && typeof input.checked !== "boolean") throw new Error("Todo checked state is required");
  if (type === "CALLOUT" && !colors.has(String(input.color))) throw new Error("Unsupported callout color");
  if (type === "CHILD_PAGE" && (typeof input.pageId !== "string" || !uuidPattern.test(input.pageId))) throw new Error("Child page id must be a UUID");
  if (type === "DIVIDER" && Object.keys(input).length) throw new Error("Divider content must be empty");
  return input as WorkspaceBlockContent;
}

export function nextWorkspaceVersion(currentVersion: number, requestedVersion: number) {
  if (!Number.isSafeInteger(currentVersion) || currentVersion < 1) throw new Error("Stored version is invalid");
  if (requestedVersion !== currentVersion) throw new Error("Workspace content was changed elsewhere");
  return currentVersion + 1;
}

export function assertValidWorkspaceParent(id: string, parentId: string | null, ancestorIds: string[] = []) {
  if (parentId === id || ancestorIds.includes(id)) throw new Error("A page cannot be moved inside itself");
}
