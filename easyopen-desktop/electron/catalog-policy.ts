export type CatalogApp = {
  id: string;
  name: string;
  summary: string;
  category: string;
  kind: string;
  os: string[];
  officialUrl: string;
  sourceUrl: string;
  license: string;
  licenseStatus: string;
  requirements: string;
  guide: string;
  featured?: boolean;
  install?: {
    windows?: {
      method: string;
      packageId?: string;
      validated: boolean;
    };
  };
};

export function validateCatalog(value: unknown): CatalogApp[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 500) {
    throw new Error('Invalid catalog list');
  }
  const ids = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object') throw new Error('Invalid catalog item');
    const app = item as Partial<CatalogApp>;
    if (typeof app.id !== 'string' || !/^[a-z0-9-]+$/.test(app.id) || ids.has(app.id)) {
      throw new Error('Invalid or duplicate catalog id');
    }
    ids.add(app.id);
    if (typeof app.name !== 'string' || typeof app.summary !== 'string' || typeof app.category !== 'string') {
      throw new Error(`Missing display fields: ${app.id}`);
    }
    if (!Array.isArray(app.os) || typeof app.officialUrl !== 'string' || typeof app.install !== 'object') {
      throw new Error(`Invalid platform fields: ${app.id}`);
    }
    const official = new URL(app.officialUrl);
    if (official.protocol !== 'https:' || official.username || official.password) {
      throw new Error(`Invalid official URL: ${app.id}`);
    }
  }
  return value as CatalogApp[];
}

// Developer-preview allowlist. Catalog data alone must never grant command execution.
const WINGET_ALLOWLIST: Readonly<Record<string, string>> = Object.freeze({
  localsend: 'LocalSend.LocalSend',
  'obs-studio': 'OBSProject.OBSStudio',
  handbrake: 'HandBrake.HandBrake',
});

export function allowedPackage(apps: CatalogApp[], id: string): string | null {
  if (typeof id !== 'string' || id.length > 80) return null;

  const approvedPackage = WINGET_ALLOWLIST[id];
  if (!approvedPackage) return null;

  const info = apps.find((app) => app.id === id)?.install?.windows;
  if (info?.method !== 'winget' || info.packageId !== approvedPackage) return null;

  return approvedPackage;
}
