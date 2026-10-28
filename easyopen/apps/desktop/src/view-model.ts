import type {CatalogApp} from './types';

export type Page = 'home' | 'discover' | 'installed' | 'updates' | 'library' | 'tasks' | 'runtime';
export type InstallStatus = 'installed' | 'not-installed' | 'unknown';
export type StatusMap = Record<string, InstallStatus>;
export type UpdateStatus = 'available'|'current'|'unknown';
export type UpdateMap = Record<string,UpdateStatus>;
export type DesktopPlatform = 'windows'|'macos';

export function desktopPlatform(platform:string|undefined):DesktopPlatform{
  return platform==='darwin'?'macos':'windows';
}

export function needsContainerRuntime(appId:string,runtime:{wslInstalled:boolean;dockerInstalled:boolean;dockerRunning:boolean}|null):boolean{
  return ['cosyvoice','jellyfin'].includes(appId)&&(!runtime||!runtime.wslInstalled||!runtime.dockerInstalled||!runtime.dockerRunning);
}

export function canTryWinget(app: CatalogApp): boolean {
  return app.install.windows?.method === 'winget' && Boolean(app.install.windows.packageId);
}

export function visibleApps(
  apps: CatalogApp[],
  page: Page,
  query: string,
  category: string,
  status: StatusMap,
  saved: string[],
  updates:UpdateMap={},
  managed:string[]=[],
  targetPlatform:DesktopPlatform='windows',
): CatalogApp[] {
  if(page==='tasks'||page==='runtime')return [];
  const normalized = query.trim().toLocaleLowerCase();
  return apps.filter(app => {
    if (!app.os.includes(targetPlatform)) return false;
    if (category !== '전체' && app.category !== category) return false;
    if (normalized && ![app.name, app.summary, app.category].join(' ').toLocaleLowerCase().includes(normalized)) return false;
    if (page === 'installed' && status[app.id] !== 'installed') return false;
    // The current bridge can identify an installed package but CANNOT tell if an update exists.
    // This is a list of installed packages eligible for a manual WinGet upgrade attempt.
    if (page === 'updates' && !(managed.includes(app.id) && status[app.id] === 'installed' && canTryWinget(app) && updates[app.id]==='available')) return false;
    if (page === 'library' && !saved.includes(app.id)) return false;
    return true;
  });
}

export function statusText(status: InstallStatus, nativeAvailable: boolean,managed=false): string {
  if (!nativeAvailable) return '미리보기 · 상태 조회 불가';
  switch (status) {
    case 'installed': return managed?'EasyOpen 관리':'이 PC에서 발견';
    case 'not-installed': return '설치 안 됨';
    case 'unknown': return '상태 확인 불가';
  }
}

export function catalogSummary(apps: CatalogApp[], status: StatusMap, updates:UpdateMap={},managed:string[]=[],targetPlatform:DesktopPlatform='windows') {
  const windows = apps.filter(app => app.os.includes(targetPlatform));
  return {
    catalogCount: windows.length,
    installedCount: windows.filter(app => status[app.id] === 'installed').length,
    managedCount: windows.filter(app => status[app.id] === 'installed' && managed.includes(app.id)).length,
    discoveredCount: windows.filter(app => status[app.id] === 'installed' && !managed.includes(app.id)).length,
    updateAvailableCount: windows.filter(app => managed.includes(app.id) && status[app.id] === 'installed' && updates[app.id]==='available').length,
    updateUnknownCount: windows.filter(app => managed.includes(app.id) && status[app.id] === 'installed' && canTryWinget(app) && updates[app.id]==='unknown').length,
    unknownCount: windows.filter(app => (status[app.id] ?? 'unknown') === 'unknown').length,
  };
}

export function getActionLabel(app: CatalogApp, status: InstallStatus, nativeWindows: boolean) {
  if (!nativeWindows || !canTryWinget(app)) return '공식 사이트';
  return status === 'installed' ? '업데이트 시도' : '시험 설치';
}
