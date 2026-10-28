import type { Metadata } from 'next';
import Link from 'next/link';
import { apps, categoryDetails } from '@/lib/catalog';
export const metadata:Metadata={title:'카테고리'};
export default function Categories(){return <section className="shell page-section"><span className="section-kicker">CATEGORIES</span><h1 className="page-title">관심 있는 분야부터 시작해요.</h1><p className="page-desc">분야별 도구를 살펴보세요. 현재 Jellyfin을 검증 중이며 그 외 도구는 EasyOpen 지원 예정입니다.</p><div className="category-grid">{categoryDetails.map(category=><Link className="category-card category-big" key={category.slug} href={`/categories/${category.slug}/`}><span className="category-icon">{category.icon}</span><b>{category.name}</b><p>{apps.filter(app=>app.category===category.name).length}개 도구 · 지원 현황 확인</p><span>바로가기 ↗</span></Link>)}</div></section>}
