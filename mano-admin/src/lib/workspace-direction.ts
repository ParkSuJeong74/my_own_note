export const workspaceDirectionMaxLength = 10_000;

export type DirectionBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; text: string };

export function normalizeWorkspaceDirection(value: string): string | null {
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  return normalized.length <= workspaceDirectionMaxLength ? normalized : null;
}

export function parseWorkspaceDirection(value: string): DirectionBlock[] {
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  const blocks: DirectionBlock[] = [];
  let paragraph: string[] = [];
  let items: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join("\n") });
    paragraph = [];
  };
  const flushList = () => {
    if (items.length) blocks.push({ type: "list", items });
    items = [];
  };

  for (const line of lines) {
    const heading = line.match(/^\s*(#{1,3})\s+(.+?)\s*$/);
    const item = line.match(/^\s*[-*+]\s+(.+?)\s*$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2] });
    } else if (item) {
      flushParagraph();
      items.push(item[1]);
    } else if (!line.trim()) {
      flushParagraph();
      flushList();
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  }
  flushParagraph();
  flushList();
  return blocks;
}
