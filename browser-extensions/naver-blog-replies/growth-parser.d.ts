export function parseGrowthNumber(value: unknown): number | null;
export function parseGrowthDate(value: unknown): string | null;
export function extractGrowth(): {
  measuredOn: string;
  visitors: number | null;
  views: number | null;
  posts: number | null;
  source: "STATISTICS" | "BLOG_HOME";
};
