import type { Metadata } from 'next';
import Link from 'next/link';
import { apps, categoryDetails } from '@/lib/catalog';
export const metadata:Metadata={title:'카테고리'};
export default function Categories(){return <section className="shell page-section"><span className="section-kicker">CATEGORIES</span><h1 className="page-title">관심 있는 분야부터 시작해요.</h1><p className="page-desc">분야별로 어떤 프로그램이 있는지 살펴보세요.</p><div className="category-grid">{categoryDetails.map(category=><Link className="category-card category-big" key={category.slug} href={`/categories/${category.slug}/`}><span className="category-icon">{category.icon}</span><b>{category.name}</b><p>{apps.filter(app=>app.category===category.name).length}개의 프로그램</p><span>바로가기 ↗</span></Link>)}</div></section>}
