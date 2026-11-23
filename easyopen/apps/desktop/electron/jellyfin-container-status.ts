import {listManagedContainers, type ManagedContainerSummary} from './container-manager';
import {JELLYFIN_LOCAL_URL} from './jellyfin';

export type JellyfinContainerState = 'unknown' | 'missing' | 'stopped' | 'starting' | 'running';
export type JellyfinContainerStatus = {
  supported: true;
  installed: boolean;
  running: boolean;
  state: JellyfinContainerState;
  appPath: null;
  url: string;
  message: string;
};

export async function probeJellyfin(fetcher: typeof fetch = fetch): Promise<boolean> {
  try {
    const response = await fetcher(JELLYFIN_LOCAL_URL + '/System/Info/Public', {
      signal: AbortSignal.timeout(1500),
      redirect: 'error',
    });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) return false;
    const value: unknown = await response.json();
    if (!value || typeof value !== 'object') return false;
    const info = value as Record<string, unknown>;
    return typeof info.Id === 'string' && info.Id.length > 0 &&
      typeof info.ServerName === 'string' && info.ServerName.length > 0;
  } catch {
    return false;
  }
}

export async function readJellyfinContainerStatus(
  list: () => Promise<ManagedContainerSummary[]> = listManagedContainers,
  health: () => Promise<boolean> = probeJellyfin,
): Promise<JellyfinContainerStatus> {
  const base = {supported: true as const, installed: false, running: false, appPath: null, url: JELLYFIN_LOCAL_URL};
  let containers: ManagedContainerSummary[];
  try {
    containers = await list();
  } catch {
    return {...base, state: 'unknown', message: 'Jellyfin 설치 상태를 확인하지 못했습니다. Docker 실행 상태를 확인한 뒤 다시 시도하세요.'};
  }
  const container = containers.find(item => item.name === 'easyopen-jellyfin');
  if (!container) return {...base, state: 'missing', message: 'Jellyfin 컨테이너를 준비할 수 있습니다.'};
  if (container.state !== 'running') {
    return {...base, installed: true, state: 'stopped', message: 'Jellyfin이 중지되어 있습니다. 다시 시작할 수 있습니다.'};
  }
  let healthy = false;
  try { healthy = await health(); } catch { /* An unavailable service is not running and ready. */ }
  return {
    ...base, installed: true, running: healthy, state: healthy ? 'running' : 'starting',
    message: healthy ? 'Jellyfin 컨테이너와 내부 화면의 응답을 확인했습니다.' : '컨테이너는 실행 중이지만 Jellyfin이 아직 응답하지 않습니다. 잠시 후 다시 확인하거나 로그를 확인하세요.',
  };
}
