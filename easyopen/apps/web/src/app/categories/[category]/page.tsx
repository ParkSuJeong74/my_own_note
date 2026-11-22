import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apps, categoryDetails, getCategory } from '@/lib/catalog';
import { AppCard } from '@/components/AppCard';
import {getProgramDetail} from '@/data/program-details';
import {buildPageMetadata} from '@/lib/site-metadata';
const publicApps=apps.filter(app=>Boolean(getProgramDetail(app.slug)));
export function generateStaticParams(){return categoryDetails.filter(category=>publicApps.some(app=>app.category===category.name)).map(category=>({category:category.slug}));}
export async function generateMetadata({params}:{params:Promise<{category:string}>}):Promise<Metadata>{const {category:slug}=await params;const category=getCategory(slug);return buildPageMetadata({path:`/categories/${slug}/`,title:`${category?.name??'카테고리'} 프로그램`});}
export default async function CategoryPage({params}:{params:Promise<{category:string}>}){const {category:slug}=await params;const category=getCategory(slug);if(!category)notFound();const items=publicApps.filter(app=>app.category===category.name);if(items.length===0)notFound();return <section className="shell page-section"><div className="breadcrumb"><Link href="/categories/">카테고리</Link><span>›</span>{category.name}</div><span className="section-kicker">EXPLORE CATEGORY</span><h1 className="page-title">{category.name}</h1><p className="page-desc">{items.length}개의 프로그램을 살펴보세요.</p><div className="cards-grid">{items.map(app=><AppCard key={app.slug} app={app}/>)}</div></section>}
