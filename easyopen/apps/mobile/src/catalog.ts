export const CATALOG_URL = 'https://catalog.easy-open.mano.io.kr/v1/apps.json';

export type CatalogApp = {
  id: string;
  name: string;
  summary: string;
  category: string;
  os: string[];
  officialUrl: string;
  license: string;
  requirements: string;
  guide: string;
  install: Record<string, {
    method: string;
    storeUrl?: string;
    packageName?: string;
    validated: boolean;
  }>;
};

export function validateCatalog(value: unknown): CatalogApp[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 500) {
    throw new Error('유효하지 않은 Catalog 목록');
  }

  const ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object') throw new Error('유효하지 않은 Catalog 항목');
    const app = item as Partial<CatalogApp>;
    if (typeof app.id !== 'string' || !/^[a-z0-9-]+$/.test(app.id) || ids.has(app.id)) {
      throw new Error('유효하지 않거나 중복된 Catalog ID');
    }
    ids.add(app.id);
    if (typeof app.name !== 'string' || typeof app.summary !== 'string' || typeof app.category !== 'string') {
      throw new Error(`표시 정보가 없는 Catalog 항목: ${app.id}`);
    }
    if (!Array.isArray(app.os) || typeof app.officialUrl !== 'string' || typeof app.install !== 'object') {
      throw new Error(`플랫폼 정보가 잘못된 Catalog 항목: ${app.id}`);
    }
    const official = new URL(app.officialUrl);
    if (official.protocol !== 'https:' || official.username || official.password) {
      throw new Error(`공식 URL이 잘못된 Catalog 항목: ${app.id}`);
    }
  }

  return value as CatalogApp[];
}

export async function fetchRemoteCatalog(timeoutMs = 5000): Promise<CatalogApp[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(CATALOG_URL, {
      headers: {Accept: 'application/json'},
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Catalog HTTP ${response.status}`);
    return validateCatalog(await response.json());
  } finally {
    clearTimeout(timeout);
  }
}
