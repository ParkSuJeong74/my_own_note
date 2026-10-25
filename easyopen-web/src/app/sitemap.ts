import type { MetadataRoute } from 'next';
import { apps, categoryDetails } from '@/lib/catalog';
const base=process.env.NEXT_PUBLIC_SITE_URL || 'https://easyopen-web.pages.dev';
export const dynamic = 'force-static';
export default function sitemap():MetadataRoute.Sitemap {return ['','/apps','/categories','/guides','/about','/download','/legal',...apps.map(app=>`/apps/${app.slug}`),...categoryDetails.map(category=>`/categories/${category.slug}`)].map(path=>({url:`${base}${path || '/'}`,changeFrequency:'monthly' as const,priority:path===''?1:.6}));}
