import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apps, categoryDetails, getCategory } from '@/lib/catalog';
import { AppCard } from '@/components/AppCard';
export function generateStaticParams(){return categoryDetails.map(category=>({category:category.slug}));}
export async function generateMetadata({params}:{params:Promise<{category:string}>}):Promise<Metadata>{const {category:slug}=await params;const category=getCategory(slug);return {title:`${category?.name??'카테고리'} 프로그램`};}
export default async function CategoryPage({params}:{params:Promise<{category:string}>}){const {category:slug}=await params;const category=getCategory(slug);if(!category)notFound();const items=apps.filter(app=>app.category===category.name);return <section className="shell page-section"><div className="breadcrumb"><Link href="/categories/">카테고리</Link><span>›</span>{category.name}</div><span className="section-kicker">EXPLORE CATEGORY</span><h1 className="page-title">{category.name}</h1><p className="page-desc">{items.length}개의 프로그램을 살펴보세요.</p><div className="cards-grid">{items.map(app=><AppCard key={app.slug} app={app}/>)}</div></section>}
