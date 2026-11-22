import type { Metadata } from 'next';
import Link from 'next/link';
import { apps, categoryDetails } from '@/lib/catalog';
import {getProgramDetail} from '@/data/program-details';
import {buildPageMetadata} from '@/lib/site-metadata';
export const metadata:Metadata=buildPageMetadata({path:'/categories/',title:'프로그램 카테고리'});
export default function Categories(){const publicApps=apps.filter(app=>Boolean(getProgramDetail(app.slug)));const publicCategories=categoryDetails.filter(category=>publicApps.some(app=>app.category===category.name));return <section className="shell page-section"><span className="section-kicker">CATEGORIES</span><h1 className="page-title">관심 있는 분야부터 시작해요.</h1><p className="page-desc">EasyOpen에서 실제로 공개한 프로그램을 분야별로 확인하세요.</p><div className="category-grid">{publicCategories.map(category=><Link className="category-card category-big" key={category.slug} href={`/categories/${category.slug}/`}><span className="category-icon">{category.icon}</span><b>{category.name}</b><p>{publicApps.filter(app=>app.category===category.name).length}개 프로그램 · 지원 현황 확인</p><span>바로가기 ↗</span></Link>)}</div></section>}
