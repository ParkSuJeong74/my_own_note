import type { MetadataRoute } from 'next';
import { apps, categories } from '@/lib/catalog';
const base=process.env.NEXT_PUBLIC_SITE_URL || 'https://easyopen-web.pages.dev';
export const dynamic = 'force-static';
export default function sitemap():MetadataRoute.Sitemap {return ['','/apps','/categories','/guides','/about','/legal',...apps.flatMap(a=>[`/apps/${a.slug}`,`/guides/${a.slug}`]),...categories.map(c=>`/categories/${encodeURIComponent(c)}`)].map(path=>({url:`${base}${path || '/'}`,changeFrequency:'monthly' as const,priority:path===''?1:.6}));}
