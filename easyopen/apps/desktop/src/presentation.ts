import type {CatalogApp} from './types';

export const PRESENTATION_URL = 'https://catalog.easy-open.mano.io.kr/v1/apps.json';
const textFields = ['name', 'summary', 'category', 'requirements', 'guide'] as const;

/** Remote display data cannot replace native capabilities or executable sources. */
export function mergePresentation(bundled: CatalogApp[], value: unknown): CatalogApp[] {
  if (!Array.isArray(value) || value.length > 500) throw new Error('Invalid presentation data');
  const entries = new Map<string, Record<string, unknown>>();
  for (const item of value) {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || entries.has(item.id)) {
      throw new Error('Invalid or duplicate program ID');
    }
    entries.set(item.id, item);
  }
  return bundled.map(app => {
    const remote = entries.get(app.id);
    if (!remote) return app;
    const patch: Partial<CatalogApp> = {};
    for (const field of textFields) {
      const text = remote[field];
      if (typeof text !== 'string' || !text.trim() || text.length > 12000) {
        throw new Error('Invalid program display text');
      }
      patch[field] = text;
    }
    return {...app, ...patch};
  });
}

export async function fetchPresentation(bundled: CatalogApp[], signal: AbortSignal): Promise<CatalogApp[]> {
  const response = await fetch(PRESENTATION_URL, {signal, headers: {Accept: 'application/json'}});
  if (!response.ok) throw new Error('Program information unavailable');
  return mergePresentation(bundled, await response.json());
}
