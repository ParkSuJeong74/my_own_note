import data from '@/data/apps.json';
export type AppInfo = (typeof data)[number];
export const apps: AppInfo[] = data;
export const categories = Array.from(new Set(apps.map(app => app.category)));
export function getApp(slug: string) { return apps.find(app => app.slug === slug); }
export function filterApps(input: AppInfo[], query: string, category = '전체', os = '전체') {
  const q = query.trim().toLocaleLowerCase('ko-KR');
  return input.filter(app => {
    const text = [app.name, app.summary, app.description, ...app.tags].join(' ').toLocaleLowerCase('ko-KR');
    return (!q || text.includes(q)) && (category === '전체' || app.category === category) && (os === '전체' || app.os.includes(os));
  });
}
