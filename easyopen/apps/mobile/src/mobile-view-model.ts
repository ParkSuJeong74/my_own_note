import type {CatalogApp} from './catalog';

export type MobileApp = CatalogApp;

export type MobilePage = 'home' | 'servers' | 'discover' | 'saved' | 'info';

export function androidApps(apps: MobileApp[]): MobileApp[] {
  return apps.filter(app => app.os.includes('android'));
}

export function mobileCategories(apps: MobileApp[]): string[] {
  return ['전체', ...new Set(androidApps(apps).map(app => app.category))];
}

export function filterMobileApps(
  apps: MobileApp[],
  search: string,
  category: string,
  savedIds: string[],
  savedOnly = false,
): MobileApp[] {
  const needle = search.trim().toLocaleLowerCase('ko');
  return androidApps(apps).filter(app =>
    (category === '전체' || app.category === category) &&
    (!savedOnly || savedIds.includes(app.id)) &&
    (!needle || [app.name, app.summary, app.category].join(' ').toLocaleLowerCase('ko').includes(needle))
  );
}

/** URLs are static catalog-provided HTTPS links, not commands or arbitrary deep links. */
export function getOfficialLink(app: MobileApp): string | null {
  if(app.install.android?.method==='easyopen-client')return null;
  const chosen = app.install.android?.storeUrl ?? app.officialUrl;
  try {
    const parsed = new URL(chosen);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return null;
    const allowed = new Set([
      'play.google.com', 'f-droid.org', 'github.com', 'localsend.org',
      'organicmaps.app', 'ankidroid.org', 'www.videolan.org', 'videolan.org',
    ]);
    return allowed.has(parsed.hostname) ? parsed.href : null;
  } catch {
    return null;
  }
}

export function usesEasyOpenClient(app:MobileApp):boolean{
  return app.install.android?.method==='easyopen-client';
}

export function isSaved(savedIds: string[], appId: string): boolean {
  return savedIds.includes(appId);
}

export function toggleSaved(savedIds: string[], appId: string): string[] {
  return isSaved(savedIds, appId) ? savedIds.filter(id => id !== appId) : [...savedIds, appId];
}
