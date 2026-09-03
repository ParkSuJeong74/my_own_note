export function normalizeOfficialPom(value: string): string | null {
  const normalized = value
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/^\s*(?:official\s+)?(?:player\s+of\s+the\s+match|pom)\s*:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || null;
}
