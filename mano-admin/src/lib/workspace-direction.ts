export const workspaceDirectionMaxLength = 10_000;

export function normalizeWorkspaceDirection(value: string): string | null {
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  return normalized.length <= workspaceDirectionMaxLength ? normalized : null;
}
