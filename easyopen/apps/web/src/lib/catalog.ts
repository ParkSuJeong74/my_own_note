import data from '@/data/apps.json';
export type AppInfo = (typeof data)[number];
export type SupportStatus = AppInfo['supportStatus'];
export const apps: AppInfo[] = data;
export const categoryDetails = [
  { slug: 'ai-voice', name: 'AI 음성', icon: '🎙️', description: '말을 글로, 글을 목소리로' },
  { slug: 'video', name: '영상·방송', icon: '🎬', description: '녹화부터 영상 변환까지' },
  { slug: 'design', name: '디자인·이미지', icon: '🎨', description: '편집과 드로잉을 자유롭게' },
  { slug: 'documents', name: '문서·업무', icon: '📄', description: '문서와 오피스 작업을 효율적으로' },
  { slug: 'productivity', name: '생산성·파일', icon: '📁', description: '파일 전송과 정리를 더 간편하게' },
  { slug: 'security', name: '보안·유틸리티', icon: '🔐', description: '중요한 정보와 도구를 안전하게' },
] as const;
export const categories = categoryDetails.map(category => category.name);
export function getCategory(slug: string) { return categoryDetails.find(category => category.slug === slug); }
export function getCategoryByName(name: string) { return categoryDetails.find(category => category.name === name); }
export function getApp(slug: string) { return apps.find(app => app.slug === slug); }
export function filterApps(input: AppInfo[], query: string, category = '전체', os = '전체') {
  const terms = query.normalize('NFKC').trim().toLocaleLowerCase('ko-KR').split(/\s+/).filter(Boolean);
  return input.filter(app => {
    const text = [app.name, app.category, app.summary, app.description, app.supportLabel, app.supportDescription, ...app.os, ...app.tags].join(' ').normalize('NFKC').toLocaleLowerCase('ko-KR');
    return terms.every(term=>text.includes(term)) && (category === '전체' || app.category === category) && (os === '전체' || app.os.includes(os));
  });
}
