import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apps, categories } from '@/lib/catalog';
import { AppCard } from '@/components/AppCard';
export function generateStaticParams(){return categories.map(category=>({category}));}
export async function generateMetadata({params}:{params:Promise<{category:string}>}):Promise<Metadata>{const {category}=await params;return {title:`${category} 프로그램`};}
export default async function CategoryPage({params}:{params:Promise<{category:string}>}){const {category}=await params;if(!categories.includes(category))notFound();const items=apps.filter(a=>a.category===category);return <section className="shell page-section"><div className="breadcrumb"><Link href="/categories/">카테고리</Link><span>›</span>{category}</div><span className="section-kicker">EXPLORE CATEGORY</span><h1 className="page-title">{category}</h1><p className="page-desc">{items.length}개의 프로그램을 살펴보세요.</p><div className="cards-grid">{items.map(app=><AppCard key={app.slug} app={app}/>)}</div></section>}
