export type CatalogApp = {
  id: string;
  name: string;
  officialUrl: string;
  install?: {
    windows?: {
      method: string;
      packageId?: string;
      validated: boolean;
    };
  };
};

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
