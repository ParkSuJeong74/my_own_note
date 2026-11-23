const paths = new Set(['/admin', '/workspace', '/workspace/programs', '/workspace/purchases']);
export function authReturnPath(value: unknown): string | null {
  return typeof value === 'string' && paths.has(value) ? value : null;
}
